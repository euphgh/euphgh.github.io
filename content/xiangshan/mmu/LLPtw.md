一个去重，仲裁页表向翻译请求的模块，本身不存在任何翻译功能

# state

具有 llptwsize 个表项，每一个都是寄存器，含有一个 state 和 entries
wait_id 指如果 mem resp 时 id

```scala
class LLPTWEntry(implicit p: Parameters) extends XSBundle with HasPtwConst {
  val req_info = new L2TlbInnerBundle()
  val ppn = UInt(ppnLen.W)
  val wait_id = UInt(log2Up(l2tlbParams.llptwsize).W)
  val af = Bool()
}
class LLPTW(...) extends XSModule ... {
...
val entries = Reg(Vec(l2tlbParams.llptwsize, new LLPTWEntry()))
val state_idle :: state_addr_check :: state_mem_req :: state_mem_waiting ::
  state_mem_out :: state_cache :: Nil = Enum(6)
val state = RegInit(VecInit(Seq.fill(l2tlbParams.llptwsize)(state_idle)))
```

# In

进入时，和所有现有条目比较，是否位于同一 Cache block，如果是，则 state 相同。
位于同一 block 的条目已经发送了 mem req 或者是刚刚发送，则 wait_id 也相同。
从而实现合并功能。
**但是会跳过 PMP 检查阶段，这要求同一 Cache block 的 pte 地址的 pmp 检查结果相同**

to_wait：dup 条目的 mem.req 已经发出，但是 mem.resp.valid 未置起
to_mem_out：dup 条目的 mem.resp.valid 置起
to_cache：dup 条目的 mem.resp 已经返回，即 dup 的条目处于 state_mem_out

#bug cache_ptr 不应该是 Mux，也应该从 PriorityMux

```scala
val cache_ptr = ParallelMux(is_cache, (0 until l2tlbParams.llptwsize).map(_.U(log2Up(l2tlbParams.llptwsize).W)))

// duplicate req
// to_wait: wait for the last to access mem, set to mem_resp
// to_cache: the last is back just right now, set to mem_cache
val dup_vec = state.indices.map(i =>
  dup(io.in.bits.req_info.vpn, entries(i).req_info.vpn)
)
val dup_req_fire = mem_arb.io.out.fire && dup(io.in.bits.req_info.vpn, mem_arb.io.out.bits.req_info.vpn) // dup with the req fire entry
val dup_vec_wait = dup_vec.zip(is_waiting).map{case (d, w) => d && w} // dup with "mem_waiting" entres, sending mem req already
val dup_vec_having = dup_vec.zipWithIndex.map{case (d, i) => d && is_having(i)} // dup with the "mem_out" entry recv the data just now
val wait_id = Mux(dup_req_fire, mem_arb.io.chosen, ParallelMux(dup_vec_wait zip entries.map(_.wait_id)))
val dup_wait_resp = io.mem.resp.fire && VecInit(dup_vec_wait)(io.mem.resp.bits.id) // dup with the entry that data coming next cycle
val to_wait = Cat(dup_vec_wait).orR || dup_req_fire
val to_mem_out = dup_wait_resp
val to_cache = Cat(dup_vec_having).orR
XSError(RegNext(dup_req_fire && Cat(dup_vec_wait).orR, init = false.B), "mem req but some entries already waiting, should not happed")

XSError(io.in.fire && ((to_mem_out && to_cache) || (to_wait && to_cache)), "llptw enq, to cache conflict with to mem")
val mem_resp_hit = RegInit(VecInit(Seq.fill(l2tlbParams.llptwsize)(false.B)))
val enq_state_normal = Mux(to_mem_out, state_mem_out, // same to the blew, but the mem resp now
  Mux(to_wait, state_mem_waiting,
  Mux(to_cache, state_cache, state_addr_check)))
val enq_state = Mux(from_pre(io.in.bits.req_info.source) && enq_state_normal =/= state_addr_check, state_idle, enq_state_normal)
when (io.in.fire) {
  // if prefetch req does not need mem access, just give it up.
  // so there will be at most 1 + FilterSize entries that needs re-access page cache
  // so 2 + FilterSize is enough to avoid dead-lock
  state(enq_ptr) := enq_state
  entries(enq_ptr).req_info := io.in.bits.req_info
  entries(enq_ptr).ppn := io.in.bits.ppn
  entries(enq_ptr).wait_id := Mux(to_wait, wait_id, enq_ptr)
  entries(enq_ptr).af := false.B
  mem_resp_hit(enq_ptr) := to_mem_out
}
```

# out

仅送出 req 信息 id 和叶表项地址的 pmp 检查的 af

```scala
val out = DecoupledIO(new Bundle {
    val req_info = Output(new L2TlbInnerBundle())
    val id = Output(UInt(bMemID.W))
    val af = Output(Bool())
})
```

在存在 mem resp 的时候置起 out.valid，id 为对应的表项

```scala
io.out.valid := ParallelOR(is_having).asBool
io.out.bits.req_info := entries(mem_ptr).req_info
io.out.bits.id := mem_ptr
io.out.bits.af := entries(mem_ptr).af
```

每一个表项都会出队一次，只要处于 state_mem_out 就可以出队

```scala
when (io.out.fire) {
  assert(state(mem_ptr) === state_mem_out)
  state(mem_ptr) := state_idle
}
```

如果 pmp 检查不通过，或者是 mem resp 都会造成 state 设为 state_mem_out

```scala
when (pmp_resp_valid) {
  // NOTE: when pmp resp but state is not addr check,
  //       then the entry is dup with other entry, the state was changed before
  //       when dup with the req-ing entry, set to mem_waiting (above codes),
  //       and the ld must be false, so dontcare
  val accessFault = io.pmp.resp.ld || io.pmp.resp.mmio
  entries(enq_ptr_reg).af := accessFault
  state(enq_ptr_reg) := Mux(accessFault, state_mem_out, state_mem_req)
}

when (io.mem.resp.fire) {
  state.indices.map{i =>
    when (state(i) === state_mem_waiting &&
      io.mem.resp.bits.id === entries(i).wait_id) {
      state(i) := state_mem_out
      mem_resp_hit(i) := true.B
    }
  }
}
```

在L2TLB中仅连接mergeArb，位于最低优先级，直连到`io.tlb`。
# cache

弹出 cache 态的条目到 MissQueue，等待再次访问 L2TLBCache

```scala
when (io.cache.fire) {
	state(cache_ptr) := state_idle
}
...
io.cache.valid := Cat(is_cache).orR
io.cache.bits := ParallelMux(is_cache, entries.map(_.req_info))
```

# H Extentison
新增state，在`addr_check`之前先进行叶pte.ppn的第二级地址转换，
也就是Guest页pte基地址的第二级转换，对应`htpw_req`和`hptw_resp`。
此外，在得到叶pte后，也需要对其ppn进行第二级地址转换，对应`last_hptw_req`和`last_hptw_resp`。
```scala
val state_idle :: state_hptw_req :: state_hptw_resp :: state_addr_check :: state_mem_req :: state_mem_waiting :: state_mem_out :: state_last_hptw_req :: state_last_hptw_resp :: state_cache :: Nil = Enum(10)
```

