## GPA

- 如下的寄存器专门用于获取 Guest Physical Address

```scala
val need_gpa = RegInit(false.B)
val need_gpa_vpn = Reg(UInt(vpnLen.W))
val need_gpa_gvpn = Reg(UInt(vpnLen.W))
...
val resp_gpa_refill = RegInit(false.B)
val need_gpa_vpn_hit = RegEnable(
  need_gpa_vpn === get_pn(req_in(i).bits.vaddr),
  req_in(i).fire
)
```

- `need_gpa`和`resp_gpa_refill`负责状态机的状态记录
- 状态机在`tlb.req.fire`的下一拍（非阻塞返回拍）启动
  - 需要一拍时间比对`tlb.req.vaddr`和保存的 gpa(`need_gpa_vpn_hit`)

### GPA 状态机转换

1. 默认状态均为`false`
2. 满足如下条件时，设置状态`need_gpa,resp_gpa_refill = true,false`，同时保存本次 tlb 请求虚地址
   1. `tlb.resp.valid`
   2. 翻译结果存在 gpf
   3. 请求虚地址`==`现有 gpa 对应的虚地址
   4. 需要二级翻译
3. 在 2 的状态下，如果`ptw.resp.valid`且返回的虚地址与保存的相同，进行如下操作
   1. 记录 ptw 返回的 gpa
   2. 设置状态`resp_gpa_refill = true`
4. 在 3 的状态下，如果存在 tlb 请求虚地址和记录的相同，同时也有 gpf
   1. 设置状态`need_gpa = false`

```scala
when (io.requestor(i).resp.valid &&
			hasGpf(i) && need_gpa === false.B &&
			!need_gpa_vpn_hit && !isOnlys2xlate) {
  need_gpa := true.B
  need_gpa_vpn := get_pn(req_out(i).vaddr)
  resp_gpa_refill := false.B
}

when (ptw.resp.fire && need_gpa && need_gpa_vpn === ptw.resp.bits.getVpn) {
  need_gpa_gvpn := Mux(
    ptw.resp.bits.s2xlate === onlyStage2,
    ptw.resp.bits.s2.entry.tag,
    Cat(
      ptw.resp.bits.s1.entry.tag,
      ptw.resp.bits.s1.ppn_low(OHToUInt(ptw.resp.bits.s1.pteidx))
    )
  )
  resp_gpa_refill := true.B
}

when (hasGpf(i) && resp_gpa_refill && need_gpa_vpn_hit){
  need_gpa := false.B
}
```

- `need_gpa_gvpn`用于`resp.bits.gpaddr`

- TLB 模块中 tlb 翻译端口数目等于 ptw 翻译端口数目
  - 对于非阻塞 TLB，如果 tlb 请求不命中，则会在 tlb 返回拍拉起对应的 ptw.req.valid
  - 如果返回拍当周期 ptw.resp.valid，TLB 会根据该请求的虚地址拉低对应 ptw.req，返回数据也会通过旁路之间送回 tlb.resp
- 在[[MemBlock|MemBlock]]中会判断 T0 拍 resp 的 ptw 请求是否命中 T1 拍发的新请求
  - 个人认为这里应该使用 Assert 而不是拉低 valid 的行为，因为不会出现

```scala
  val ptw_resp_next = RegEnable(io.ptw.resp.bits, io.ptw.resp.valid)
  val ptw_resp_v = RegNext(
    io.ptw.resp.valid && !(RegNext(sfence_dup.last.valid && tlbcsr_dup.last.satp.changed)),
    init = false.B
  )
  io.ptw.resp.ready := true.B

  dtlb.flatMap(a => a.ptw.req)
    .zipWithIndex
    .foreach{ case (tlb, i) =>
    tlb <> io.ptw.req(i)
    val vector_hit = if (refillBothTlb) Cat(ptw_resp_next.vector).orR
      else if (i < exuParameters.LduCnt) Cat(ptw_resp_next.vector.take(exuParameters.LduCnt)).orR
      else Cat(ptw_resp_next.vector.drop(exuParameters.LduCnt)).orR
    val hasS2xlate = tlb.bits.hasS2xlate()
    val isOnlyStage2 = tlb.bits.isOnlyStage2() && ptw_resp_next.data.isOnlyStage2()
    val s1_hit = ptw_resp_next.data.s1.hit(tlb.bits.vpn, Mux(hasS2xlate, tlbcsr_dup(i).vsatp.asid, tlbcsr_dup(i).satp.asid),
      tlbcsr_dup(i).hgatp.asid, allType = true, ignoreAsid = true, hasS2xlate)
    val s2_hit = ptw_resp_next.data.s2.hit(tlb.bits.vpn, tlbcsr_dup(i).hgatp.asid)
    io.ptw.req(i).valid := tlb.valid && !(ptw_resp_v && vector_hit && Mux(isOnlyStage2, s2_hit, s1_hit))
  }
  dtlb.foreach(_.ptw.resp.bits := ptw_resp_next.data)
  if (refillBothTlb) {
    dtlb.foreach(_.ptw.resp.valid := ptw_resp_v && Cat(ptw_resp_next.vector).orR)
  } else {
    dtlb_ld.foreach(_.ptw.resp.valid := ptw_resp_v && Cat(ptw_resp_next.vector.take(ld_tlb_ports)).orR)
    dtlb_st.foreach(_.ptw.resp.valid := ptw_resp_v && Cat(ptw_resp_next.vector.drop(ld_tlb_ports)).orR)
  }

```
