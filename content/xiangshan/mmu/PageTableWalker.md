## Access Fault

- pmp 的查询是组合逻辑
- 使用寄存一拍的**翻译地址**检查
- sent_pmp：表示该周期进行 pmp 检查，根据状态机生成
- accessFault：使用 sent_pmp 寄存一拍的检查结果，表示是否异常
  - 会以组合逻辑的形式影响`io.resp`
- 检测出 af 的下一周期会拉起`mem_addr_update`，然后等待`io.resp.fire`，复位状态机

```scala
// s/w register
val s_pmp_check = RegInit(true.B)
// for updating "level"
val mem_addr_update = RegInit(false.B)
val sent_to_pmp = idle === false.B &&
  (s_pmp_check === false.B || mem_addr_update) && !finish
val accessFault = RegEnable(io.pmp.resp.ld || io.pmp.resp.mmio, sent_to_pmp)
val l1addr = MakeAddr(satp.ppn, getVpnn(vpn, 2))
val l2addr = MakeAddr(Mux(l1Hit, ppn, memPte.ppn), getVpnn(vpn, 1))
val mem_addr = Mux(af_level === 0.U, l1addr, l2addr)

io.resp.valid := idle === false.B && mem_addr_update &&
  ((w_mem_resp && find_pte) || (s_pmp_check && accessFault))

io.resp.bits.resp.apply(pageFault && !accessFault && !ppn_af,
  accessFault || ppn_af,
  Mux(accessFault, af_level,level),
  memPte, vpn, satp.asid, vpn(sectortlbwidth - 1, 0), not_super = false
)
...
io.pmp.req.valid := DontCare // samecycle, do not use valid
io.pmp.req.bits.addr := mem_addr
io.pmp.req.bits.size := 3.U // TODO: fix it
io.pmp.req.bits.cmd := TlbCmd.read
...
when (io.req.fire){
  val req = io.req.bits
  level := Mux(req.l1Hit, 1.U, 0.U)
  af_level := Mux(req.l1Hit, 1.U, 0.U)
  ppn := Mux(req.l1Hit, io.req.bits.ppn, satp.ppn)
  vpn := io.req.bits.req_info.vpn
  l1Hit := req.l1Hit
  accessFault := false.B
  s_pmp_check := false.B
  idle := false.B
}
when(sent_to_pmp && mem_addr_update === false.B){
  s_mem_req := false.B
  s_pmp_check := true.B
}
...
when(accessFault && idle === false.B){
  s_pmp_check := true.B
  s_mem_req := true.B
  w_mem_resp := true.B
  s_llptw_req := true.B
  mem_addr_update := true.B
}
...
when(mem_addr_update){
  when(level === 0.U && !(find_pte || accessFault)){
    ...
  }.elsewhen(io.llptw.valid){
    ...
  }.elsewhen(io.resp.valid){
    when(io.resp.fire) {
      idle := true.B
      s_llptw_req := true.B
      mem_addr_update := false.B
      accessFault := false.B
    }
    finish := true.B
  }
}
```

## Tanslation

- 只支持 sv39，根据 sv39 写自动机
- 存在两种标志寄存器
  - s\_\*：启动寄存器，表示下一拍需要开始的工作，false 有效
  - w\_\*：等待寄存器，表示等待的工作已经完成，false 有效
- T0：`req.fire`第一拍保存请求信息到寄存器，拉起 s_pmp_check(标志下一拍开始 pmp 检查的启动寄存器)
- T1：检查 pmp，参照 [[PageTableWalker#Access Fault|PageTableWalker > Access Fault]]，同时拉起 s_mem_req(标志下一拍发起 mem 请求的启动寄存器)
- mem req state：等待`mem.req.fire`
  - 清除 s_mem_req，表示不需要拉起 mem.req.valid
  - 拉起 w_mem_resp，表示需要下一拍开始等待 mem.resp.valid
  - mem.req.bits：直连 mem_addr，根据 level 拼接翻译地址
- mem back state：等待`mem.resp.fire`
  - 只有 w_mem_resp 拉起才会进入该状态
  - 增加 af_level，置起 s_llptw_req(标志下一拍发起 llptw 请求的启动寄存器)
    - 置起 s_llptw_req 不代表 llptw.req.valid，还需要 level 正确，没有页错误，因此需要等待 memPte 的返回
  - 置起 mem_addr_update，为了进入 finial state
- final state：结束自动机返回，或者进行下一级翻译
  - lv0 的页表翻译需要再进行 lv1 页表翻译
    - 置起 s_mem_req，清除 mem_addr_update，lv 自增
      - 准备回到 mem req state，进行 lv1 翻译
    - 清除 s_llptw_req，不在准备发起 llptw.req
  - lv1 的翻译结束，等待 llptw 返回，结束翻译

```scala
val memPte = mem.resp.bits.asTypeOf(new PteBundle().cloneType)
val pageFault = memPte.isPf(level)
val accessFault = RegEnable(io.pmp.resp.ld || io.pmp.resp.mmio, sent_to_pmp)

val ppn_af = memPte.isAf()
val find_pte = memPte.isLeaf() || ppn_af || pageFault
val to_find_pte = level === 1.U && find_pte === false.B

io.llptw.valid := s_llptw_req === false.B && to_find_pte && !accessFault
io.llptw.bits.req_info.source := source
io.llptw.bits.req_info.vpn := vpn
io.llptw.bits.ppn := memPte.ppn

val l1addr = MakeAddr(satp.ppn, getVpnn(vpn, 2))
val l2addr = MakeAddr(Mux(l1Hit, ppn, memPte.ppn), getVpnn(vpn, 1))
val mem_addr = Mux(af_level === 0.U, l1addr, l2addr)

mem.req.valid := s_mem_req === false.B
	&& !mem.mask && !accessFault && s_pmp_check
mem.req.bits.addr := mem_addr
mem.req.bits.id := FsmReqID.U(bMemID.W)

when (io.req.fire){
  val req = io.req.bits
  level := Mux(req.l1Hit, 1.U, 0.U)
  af_level := Mux(req.l1Hit, 1.U, 0.U)
  ppn := Mux(req.l1Hit, io.req.bits.ppn, satp.ppn)
  vpn := io.req.bits.req_info.vpn
  l1Hit := req.l1Hit
  accessFault := false.B
  s_pmp_check := false.B
  idle := false.B
}

when(sent_to_pmp && mem_addr_update === false.B){
  s_mem_req := false.B
  s_pmp_check := true.B
}

when(accessFault && idle === false.B){ ... }

// mem req state
when (mem.req.fire){
  s_mem_req := true.B
  w_mem_resp := false.B
}

// mem back state
when(mem.resp.fire && w_mem_resp === false.B){
  w_mem_resp := true.B
  af_level := af_level + 1.U
  s_llptw_req := false.B
  mem_addr_update := true.B
}

// finial state
when(mem_addr_update){
  when(level === 0.U && !(find_pte || accessFault)){
    level := levelNext
    s_mem_req := false.B
    s_llptw_req := true.B
    mem_addr_update := false.B
  }.elsewhen(io.llptw.valid){
    when(io.llptw.fire) {
      idle := true.B
      s_llptw_req := true.B
      mem_addr_update := false.B
    }
    finish := true.B
  }.elsewhen(io.resp.valid){ ...}
}
```

## H-Extension

- io.req：新增 stage1Hit 表示 Cache 中命中第一段地址翻译，并给出翻译结果 stage1
- io.resp：新增 s2xlate 表示请求类型，新增 h_resp 表示第二级翻译结果
- io.hptw：对 HPTW 模块的访存端口

```scala
class PTWIO()(implicit p: Parameters) extends MMUIOBaseBundle with HasPtwConst {
  val req = Flipped(DecoupledIO(new Bundle {
    ...
    val stage1Hit = Bool()
    val stage1 = new PtwMergeResp
  }))
  val resp = DecoupledIO(new Bundle {
    ...
    val s2xlate = UInt(2.W)
    val h_resp = new HptwResp
  })

  val hptw = new Bundle {
    val req = DecoupledIO(new Bundle {
      val source = UInt(bSourceWidth.W)
      val id = UInt(log2Up(l2tlbParams.llptwsize).W)
      val gvpn = UInt(vpnLen.W)
    })
    val resp = Flipped(Valid(new Bundle {
      val h_resp = Output(new HptwResp)
    }))
  }
  ...
}
```

- hptw 模块的请求由自动机控制，发起地址为 gpaddr
  - 默认为 mem_addr，即`mem.req.bits.addr `
  - 根据翻译类型不同也有不同取值

```scala
val gpaddr = MuxCase(mem_addr, Seq(
  stage1Hit -> Cat(stage1.genPPN(), 0.U(offLen.W)),
  onlyS2xlate -> Cat(vpn, 0.U(offLen.W)),
  !s_last_hptw_req -> Cat(pte.ppn, 0.U(offLen.W))
))
val hpaddr = Cat(hptw_resp.genPPNS2(get_pn(gpaddr)), get_off(gpaddr))
...
io.hptw.req.valid := !s_hptw_req || !s_last_hptw_req
io.hptw.req.bits.id := FsmReqID.U(bMemID.W)
io.hptw.req.bits.gvpn := get_pn(gpaddr)
io.hptw.req.bits.source := source
```

- 新增状态机控制第二级地址翻译

```scala
when (io.req.fire && io.req.bits.stage1Hit){
  idle := false.B
  req_s2xlate := io.req.bits.req_info.s2xlate
  s_hptw_req := false.B
  hptw_resp_stage2 := false.B
}

when (io.hptw.resp.fire && w_hptw_resp === false.B && stage1Hit){
  w_hptw_resp := true.B
  hptw_resp_stage2 := true.B
}

when (io.resp.fire && stage1Hit){
  idle := true.B
}

when (io.req.fire && !io.req.bits.stage1Hit){
  val req = io.req.bits
  level := Mux(req.l1Hit, 1.U, 0.U)
  af_level := Mux(req.l1Hit, 1.U, 0.U)
  ppn := Mux(req.l1Hit, io.req.bits.ppn, satp.ppn)
  vpn := io.req.bits.req_info.vpn
  l1Hit := req.l1Hit
  accessFault := false.B
  idle := false.B
  hptw_pageFault := false.B
  req_s2xlate := io.req.bits.req_info.s2xlate
  when(io.req.bits.req_info.s2xlate =/= noS2xlate && io.req.bits.req_info.s2xlate =/= onlyStage1){
    last_s2xlate := true.B
    s_hptw_req := false.B
  }.otherwise {
    s_pmp_check := false.B
  }
}

when(io.hptw.req.fire && s_hptw_req === false.B){
  s_hptw_req := true.B
  w_hptw_resp := false.B
}

when(io.hptw.resp.fire && w_hptw_resp === false.B && !stage1Hit) {
  hptw_pageFault := io.hptw.resp.bits.h_resp.gpf
  hptw_accessFault := io.hptw.resp.bits.h_resp.gaf
  w_hptw_resp := true.B
  when(onlyS2xlate){
    mem_addr_update := true.B
    last_s2xlate := false.B
  }.otherwise {
    s_pmp_check := false.B
  }
}

when(io.hptw.req.fire && s_last_hptw_req === false.B) {
  w_last_hptw_resp := false.B
  s_last_hptw_req := true.B
}

when(io.hptw.resp.fire && w_last_hptw_resp === false.B){
  hptw_pageFault := io.hptw.resp.bits.h_resp.gpf
  hptw_accessFault := io.hptw.resp.bits.h_resp.gaf
  w_last_hptw_resp := true.B
  mem_addr_update := true.B
  last_s2xlate := false.B
}
```
