# Modules

主要包含如下模块，他们以一种“抽象”的方式连接在一起
![[../../XiangShanMMU.png|XiangShanMMU.png]]

```scala
val missQueue = Module(new L2TlbMissQueue)
val cache = Module(new PtwCache)
val ptw = Module(new PTW)
val hptw = Module(new HPTW)
val llptw = Module(new LLPTW)
val blockmq = Module(new BlockHelper(3))
```

BlockHelper 没有使用，只设置了 Inputs，没有使用 outputs

## Cache Req

`arb1.in`总裁两个`io.tlb`。
[[./ptw|ptw]]的`io.llptw`、MissQueue、`arb1.out`和 Prefecher 一共 4 个输入源按照优先级由`arb2`总裁，输入到 CacheIO

```scala
// arb2 input port
  val InArbPTWPort = 0
  val InArbMissQueuePort = 1
  val InArbTlbPort = 2
  val InArbPrefetchPort = 3
  // NOTE: when cache out but miss and ptw doesnt accept,
  arb1.io.in <> VecInit(io.tlb.map(_.req(0)))
  arb1.io.out.ready := arb2.io.in(InArbTlbPort).ready

  arb2.io.in(InArbPTWPort).valid := ptw.io.llptw.valid
  arb2.io.in(InArbPTWPort).bits.vpn := ptw.io.llptw.bits.req_info.vpn
  arb2.io.in(InArbPTWPort).bits.source := ptw.io.llptw.bits.req_info.source
  ptw.io.llptw.ready := arb2.io.in(InArbPTWPort).ready
  block_decoupled(missQueue.io.out, arb2.io.in(InArbMissQueuePort), !ptw.io.req.ready)

  arb2.io.in(InArbTlbPort).valid := arb1.io.out.valid
  arb2.io.in(InArbTlbPort).bits.vpn := arb1.io.out.bits.vpn
  arb2.io.in(InArbTlbPort).bits.source := arb1.io.chosen
  if (l2tlbParams.enablePrefetch) {
    val prefetch = Module(new L2TlbPrefetch())
    val recv = cache.io.resp
    // NOTE: 1. prefetch doesn't gen prefetch 2. req from mq doesn't gen prefetch
    // NOTE: 1. miss req gen prefetch 2. hit but prefetched gen prefetch
    prefetch.io.in.valid := recv.fire && !from_pre(recv.bits.req_info.source) && (!recv.bits.hit  ||
      recv.bits.prefetch) && recv.bits.isFirst
    prefetch.io.in.bits.vpn := recv.bits.req_info.vpn
    prefetch.io.sfence := sfence_dup(0)
    prefetch.io.csr := csr_dup(0)
    arb2.io.in(InArbPrefetchPort) <> prefetch.io.out

    val isWriteL2TlbPrefetchTable = WireInit(Constantin.createRecord("isWriteL2TlbPrefetchTable" + p(XSCoreParamsKey).HartId.toString))
    val L2TlbPrefetchTable = ChiselDB.createTable("L2TlbPrefetch_hart" + p(XSCoreParamsKey).HartId.toString, new L2TlbPrefetchDB)
    val L2TlbPrefetchDB = Wire(new L2TlbPrefetchDB)
    L2TlbPrefetchDB.vpn := prefetch.io.out.bits.vpn
    L2TlbPrefetchTable.log(L2TlbPrefetchDB, isWriteL2TlbPrefetchTable.orR && prefetch.io.out.fire, "L2TlbPrefetch", clock, reset)
  }
  arb2.io.out.ready := cache.io.req.ready
```

关于 Req 接口的各个位域

- source：指定`kwio.tlb`的 index
- isFirst：不是来自 MissQueue
- bypass：`Vec(3, Bool())`，Inputs 均为 false

```scala
cache.io.req.valid := arb2.io.out.valid
cache.io.req.bits.req_info.vpn := arb2.io.out.bits.vpn
cache.io.req.bits.req_info.source := arb2.io.out.bits.source
cache.io.req.bits.isFirst := arb2.io.chosen =/= InArbMissQueuePort.U
cache.io.req.bits.bypassed.map(_ := false.B)
```

## PTW Req

均来自 Cache Resp，但置起 valid 需要是非页节点的 Miss 且 bypassed 和 isFirst 为 false

```scala
// NOTE: missQueue req has higher priority
ptw.io.req.valid := cache.io.resp.valid && !cache.io.resp.bits.hit &&
	!cache.io.resp.bits.toFsm.l2Hit && !cache.io.resp.bits.bypassed &&
	!cache.io.resp.bits.isFirst
ptw.io.req.bits.req_info := cache.io.resp.bits.req_info
ptw.io.req.bits.l1Hit := cache.io.resp.bits.toFsm.l1Hit
ptw.io.req.bits.ppn := cache.io.resp.bits.toFsm.ppn
```

## MissQueue

本质是 Chisel.Queue 的实例化，在 sfence 时刷新

```scala
class L2TlbMissQueue(implicit p: Parameters) extends XSModule with HasPtwConst {
  require(MissQueueSize >= (l2tlbParams.ifilterSize + l2tlbParams.dfilterSize))
  val io = IO(new L2TlbMQIO())

  io.out <> Queue(io.in, MissQueueSize,
    flush = Some(io.sfence.valid || io.csr.satp.changed)
  )
}
```

`io.in`来自`mq_arb`，仲裁 Cache Resp 和`llptw.io.cache`。
对于 Cache Resp，接收条件可以概括成三个需要同时成立的条件。

1. 不来自 prefetch
2. 页节点的 Miss || bypassed 为 true 的 Miss
3. bypassed || isFirst || 当前 ptw.req 没有 ready

```scala
class L2TLBImp(...)(...) extends PtwModule(outer) with ... {
  ...
  val mq_arb = Module(new Arbiter(new L2TlbInnerBundle, 2))
  mq_arb.io.in(0).valid := cache.io.resp.valid && !cache.io.resp.bits.hit &&
	(!cache.io.resp.bits.toFsm.l2Hit || cache.io.resp.bits.bypassed) &&
	!from_pre(cache.io.resp.bits.req_info.source) &&
	(
	  cache.io.resp.bits.bypassed ||
	  cache.io.resp.bits.isFirst ||
	  !ptw.io.req.ready
	)
  mq_arb.io.in(0).bits :=  cache.io.resp.bits.req_info
  mq_arb.io.in(1) <> llptw.io.cache
  missQueue.io.in <> mq_arb.io.out
  missQueue.io.sfence  := sfence_dup(6)
  missQueue.io.csr := csr_dup(5)
  ...
}
```

## LLPTW Req

仅来自 Cache Resp，valid 置起条件为页节点 Miss 且 bypassed 为 false

```scala
llptw.io.in.valid := cache.io.resp.valid && !cache.io.resp.bits.hit &&
	cache.io.resp.bits.toFsm.l2Hit && !cache.io.resp.bits.bypassed
llptw.io.in.bits.req_info := cache.io.resp.bits.req_info
llptw.io.in.bits.ppn := cache.io.resp.bits.toFsm.ppn
```

# Mem

## Req

对外单独使用一个 TileLink 端口访问内存，只使用了 A 和 D 通道读取功能。
对内存在一个简单的 req bundle，id 字段需要表示`llptwsize + 1`个数字
ptw 和 llptw 均有一个 mem 端口，ptw 的 id 硬连线 llptwsize.U，llptw 则表示发出请求的表项的 index(0 ～ llptwsize-1)。因此可以根据 id 区分 mem 请求的来源。

```scala
class L2TlbMemReqBundle(implicit p: Parameters) extends PtwBundle {
  val addr = UInt(PAddrBits.W)
  val id = UInt(bMemID.W)
}
```

使用`mem_arb`仲裁 mem.req 后，转接到 TL 的 A 通道。
TL 的请求地址不是实际 mem req 地址，而是 Cache 块对齐的地址，同样使用 burst 来实现块传输。
很自然的，需要记录 mem req 位于块的哪一个 offset，因此定义 req_add_low。

```scala
val mem_arb = Module(new Arbiter(new L2TlbMemReqBundle(), 2))
mem_arb.io.in(0) <> ptw.io.mem.req
mem_arb.io.in(1) <> llptw_mem.req
mem_arb.io.out.ready := mem.a.ready && !flush
...
// mem read
val memRead =  edge.Get(
  fromSource = mem_arb.io.out.bits.id,
  // toAddress  = memAddr(log2Up(CacheLineSize / 2 / 8) - 1, 0),
  toAddress  = blockBytes_align(mem_arb.io.out.bits.addr),
  lgSize     = log2Up(l2tlbParams.blockBytes).U
)._2
mem.a.bits := memRead
mem.a.valid := mem_arb.io.out.valid && !flush
mem.a.bits.user.lift(ReqSourceKey).foreach(_ := MemReqSource.PTW.id.U)
```

## req_addr_low

Cache 的一个 block 为 64 bytes，可以存储 8 个 pte，使用 3 位的 offset 索引
req_addr_low 用于记录每一个 mem req 的 pte 相对于 block 的 offset。
在 Cache 的叶 pte 不命中时，进入 llptw，同时写 req_addr_low。这里的 vpn 是请求翻译的虚地址的 vpn,即`vaddr(63, 12)`，仅取末三位`vaddr(14, 12)`，即`vpn(2, 0)`，对应于 addr_low_from_vpn 函数
在发起 mem req 时也会记录对应的 req_addr_low，此时的 addr 对于 llptw 的请求来说是页条目的翻译物理地址，即`addr = Cat(..., vaddr(20, 12), 0.U(3.W))`。因此 offset 所需的`vaddr(14, 12)`，即`addr(5, 3)`，对应 addr_low_from_paddr 函数

由于mem req使用不同id并行发送，且一个id仅存在一个inflight的请求，所以需要在发出时记录offset

```scala
def addr_low_from_vpn(vpn: UInt) = {
  vpn(log2Ceil(l2tlbParams.blockBytes)-log2Ceil(XLEN/8)-1, 0)
}
def addr_low_from_paddr(paddr: UInt) = {
  paddr(log2Up(l2tlbParams.blockBytes)-1, log2Up(XLEN/8))
}

val req_addr_low = Reg(
  Vec(
    MemReqWidth,
    UInt((log2Up(l2tlbParams.blockBytes)-log2Up(XLEN/8)).W)
  )
)

when (llptw.io.in.fire) {
  req_addr_low(llptw_mem.enq_ptr) :=
    addr_low_from_vpn(llptw.io.in.bits.req_info.vpn)
}
when (mem_arb.io.out.fire) {
  req_addr_low(mem_arb.io.out.bits.id) :=
    addr_low_from_paddr(mem_arb.io.out.bits.addr)
  waiting_resp(mem_arb.io.out.bits.id) := true.B
}

val memRead =  edge.Get(
  fromSource = mem_arb.io.out.bits.id,
  toAddress  = blockBytes_align(mem_arb.io.out.bits.addr),
  lgSize     = log2Up(l2tlbParams.blockBytes).U
)._2
mem.a.bits := memRead
mem.a.valid := mem_arb.io.out.valid && !flush
mem.a.bits.user.lift(ReqSourceKey).foreach(_ := MemReqSource.PTW.id.U)
mem.d.ready := true.B
```

## Resp

远古时期，llptw存在于missQueue之中，所以注释和变量名中的mq在现在指代llptw。

获取block之后，为了获取pte需要知道所在的offset，使用d通道的source，即a通道发送时的设备id，去索引req_addr_low向量获取offset

```scala
mem.d.ready := true.B
// mem -> data buffer
val refill_data = Reg(Vec(blockBits / l1BusDataWidth, UInt(l1BusDataWidth.W)))
val refill_helper = edge.firstlastHelper(mem.d.bits, mem.d.fire)
val mem_resp_done = refill_helper._3
val mem_resp_from_mq = from_missqueue(mem.d.bits.source)
when (mem.d.valid) {
  assert(mem.d.bits.source <= l2tlbParams.llptwsize.U)
  refill_data(refill_helper._4) := mem.d.bits.data
}

// refill_data_tmp is the wire fork of refill_data, but one cycle earlier
val refill_data_tmp = WireInit(refill_data)
refill_data_tmp(refill_helper._4) := mem.d.bits.data

val resp_pte = VecInit((0 until MemReqWidth).map(i =>
  if (i == l2tlbParams.llptwsize) {
    RegEnable(
      get_part(refill_data_tmp, req_addr_low(i)), 
      mem_resp_done && !mem_resp_from_mq
    ) 
  }
  else { 
    DataHoldBypass(
      get_part(refill_data, req_addr_low(i)), 
      llptw_mem.buffer_it(i)
    )
  }
  // llptw could not use refill_data_tmp
  // because enq bypass's result works at next cycle
))
...
// mem -> miss queue
llptw_mem.resp.valid := mem_resp_done && mem_resp_from_mq
llptw_mem.resp.bits.id := DataHoldBypass(mem.d.bits.source, mem.d.valid)
// mem -> ptw
ptw.io.mem.req.ready := mem.a.ready
ptw.io.mem.resp.valid := mem_resp_done && !mem_resp_from_mq
ptw.io.mem.resp.bits := resp_pte.last
// mem -> cache
val refill_from_mq = mem_resp_from_mq
val refill_level = Mux(refill_from_mq, 2.U, RegEnable(ptw.io.refill.level, 0.U, ptw.io.mem.req.fire))
val refill_valid = mem_resp_done && !flush && !flush_latch(mem.d.bits.source)

cache.io.refill.valid := RegNext(refill_valid, false.B)
cache.io.refill.bits.ptes := refill_data.asUInt
cache.io.refill.bits.req_info_dup.map(_ := RegEnable(Mux(refill_from_mq, llptw_mem.refill, ptw.io.refill.req_info), refill_valid))
cache.io.refill.bits.level_dup.map(_ := RegEnable(refill_level, refill_valid))
cache.io.refill.bits.levelOH(refill_level, refill_valid)
cache.io.refill.bits.sel_pte_dup.map(_ := RegNext(sel_data(refill_data_tmp.asUInt, req_addr_low(mem.d.bits.source))))
```