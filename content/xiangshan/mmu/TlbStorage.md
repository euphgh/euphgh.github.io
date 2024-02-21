## TlbSectorEntry

```scala
val entries = Reg(Vec(nWays, new TlbSectorEntry(normalPage, superPage)))
```

- 全相连映射，路数为nWays，默认2
- `normalPage`和`superPage`均为 true，以下只讨论该情况

```scala
class TlbSectorEntry(pageNormal: Boolean, pageSuper: Boolean)
(implicit p: Parameters) extends TlbBundle {
  val tag = if (!pageNormal) UInt((vpnLen - vpnnLen).W)
            else UInt(sectorvpnLen.W)
  val asid = UInt(asidLen.W)
  val level = if (!pageNormal) Some(UInt(1.W))
              else if (!pageSuper) None
              else Some(UInt(2.W))
  val ppn = if (!pageNormal) UInt((ppnLen - vpnnLen).W)
            else UInt(sectorppnLen.W) //only used when disable s2xlate
  val perm = new TlbSectorPermBundle
  val valididx = Vec(tlbcontiguous, Bool())
  val pteidx = Vec(tlbcontiguous, Bool())
  val ppn_low = Vec(tlbcontiguous, UInt(sectortlbwidth.W))

  val g_perm = new TlbPermBundle
  val vmid = UInt(vmidLen.W)
  val s2xlate = UInt(2.W)
...
}
```

- ppn：宽度为`(PAddrBits - offLen) - sectortlbwidth`
  - 减少 sectortlbwidth（默认为 3）对应`ppn_low`宽度和 Vec 的长度
- tlbcontiguous：一组 Entry 中存在的直接映射组数目
  - 默认为 8，对应 sectortlbwidth 的作为索引长度，默认 3
  - 只有 valididx、pteidx、ppn_low 是`Vec(tlbcontiguous, ...)`

```scala
def genPPN(saveLevel: Boolean, valid: Bool)(vpn: UInt) : UInt = {
  val inner_level = level.getOrElse(0.U)
  val ppn_res = if (!pageSuper) ... else if (!pageNormal) ...
    else Cat(
      ppn(sectorppnLen - 1, vpnnLen * 2 - sectortlbwidth),
      Mux(inner_level(1),
        vpn(vpnnLen * 2 - 1, vpnnLen),
        ppn(vpnnLen * 2 - sectortlbwidth - 1, vpnnLen - sectortlbwidth)
      ),
      Mux(inner_level(0),
        vpn(vpnnLen - 1, 0),
        Cat(
          ppn(vpnnLen - sectortlbwidth - 1, 0),
          ppn_low(vpn(sectortlbwidth - 1, 0))
        )
      )
    )
...
  ppn_res
}
```

- 可忽略第一组参数，用途是多存一拍，但未使用
- 使用`vpn`的最低 3 位直接索引`ppn_low`向量，拼到 ppn 的最低 3 位
- level：判断当前存储的页表的级数，用于判断中间的段数的来源

## HitVec

```scala
val hitVec = VecInit((entries.zipWithIndex).zip(v zip refill_mask.asBools).map{
  case (e, m) => {
    val s2xlate_hit = e._1.s2xlate === req.bits.s2xlate
    val hit = e._1.hit(vpn,
      Mux(hasS2xlate, io.csr.vsatp.asid, io.csr.satp.asid),
      vmid = io.csr.hgatp.asid, hasS2xlate = hasS2xlate,
	  onlyS2 = OnlyS2, onlyS1 = OnlyS1
	)
    s2xlate_hit && hit && m._1 && !m._2
  }
})
```

- 只有`s2xlate`和`vpn`都相等才命中
- 根据`s2xlate`开启第二阶段地址翻译
- 计算命中均在请求当周期完成，会将 HitVec**存一拍的 HitVecReg 送出**

## write

```scala
when (io.w.valid) {
  v(io.w.bits.wayIdx) := true.B
  entries(io.w.bits.wayIdx).apply(io.w.bits.data)
}
// write assert, should not duplicate with the existing entries
val w_hit_vec = VecInit(entries.zip(v).map{case (e, vi) => 
  e.wbhit(io.w.bits.data, 
    Mux(io.w.bits.data.s2xlate =/= noS2xlate, 
      io.csr.vsatp.asid, 
      io.csr.satp.asid
    ), 
    s2xlate = io.w.bits.data.s2xlate
  ) && vi
})
XSError(io.w.valid && Cat(w_hit_vec).orR, s"${parentName} refill, duplicate with existing entries")
```
- 写回替换时需要Assert没有写回已经存在的条目
  - 在未加入H扩展时已经存k在
  - 为什么需要`PopCount(wb_valididx) === 1.U`不太理解
```scala
def wbhit(data: PtwRespS2, asid: UInt, nSets: Int = 1, ignoreAsid: Boolean = false, s2xlate: UInt): Bool = {
    val s1vpn = data.s1.entry.tag
    val s2vpn = data.s2.entry.tag(vpnLen - 1, sectortlbwidth)
    val wb_vpn = Mux(s2xlate === onlyStage2, s2vpn, s1vpn) 
    val vpn = Cat(wb_vpn, 0.U(sectortlbwidth.W))
    val asid_hit = if (ignoreAsid) true.B else (this.asid === asid)
    val vpn_hit = Wire(Bool())
    val index_hit = Wire(Vec(tlbcontiguous, Bool()))
    val wb_valididx = Wire(Vec(tlbcontiguous, Bool()))
    //for onlystage2 entry, every valididx is true
    wb_valididx := Mux(s2xlate === onlyStage2, VecInit(UIntToOH(data.s2.entry.tag(sectortlbwidth - 1, 0)).asBools), data.s1.valididx)
    val s2xlate_hit = s2xlate === this.s2xlate
    // NOTE: for timing, dont care low set index bits at hit check
    //       do not need store the low bits actually
    if (!pageSuper) {
      vpn_hit := asid_hit && drop_set_equal(vpn(vpn.getWidth - 1, sectortlbwidth), tag, nSets)
    }
    else if (!pageNormal) {
      val tag_match_hi = tag(vpnnLen * 2 - 1, vpnnLen - sectortlbwidth) === vpn(vpnnLen * 3 - 1, vpnnLen * 2)
      val tag_match_mi = tag(vpnnLen - 1, 0) === vpn(vpnnLen * 2 - 1, vpnnLen)
      val tag_match = tag_match_hi && (level.get.asBool || tag_match_mi)
      vpn_hit := asid_hit && tag_match
    }
    else {
      val tmp_level = level.get
      val tag_match_hi = tag(vpnnLen * 3 - sectortlbwidth - 1, vpnnLen * 2 - sectortlbwidth) === vpn(vpnnLen * 3 - 1, vpnnLen * 2)
      val tag_match_mi = tag(vpnnLen * 2 - sectortlbwidth - 1, vpnnLen - sectortlbwidth) === vpn(vpnnLen * 2 - 1, vpnnLen)
      val tag_match_lo = tag(vpnnLen - sectortlbwidth - 1, 0) === vpn(vpnnLen - 1, sectortlbwidth) // if pageNormal is false, this will always be false
      val tag_match = tag_match_hi && (tmp_level(1) || tag_match_mi) && (tmp_level(0) || tag_match_lo)
      vpn_hit := asid_hit && tag_match
    }

    for (i <- 0 until tlbcontiguous) {
      index_hit(i) := wb_valididx(i) && valididx(i)
    }

    // For example, tlb req to page cache with vpn 0x10
    // At this time, 0x13 has not been paged, so page cache only resp 0x10
    // When 0x13 refill to page cache, previous item will be flushed
    // Now 0x10 and 0x13 are both valid in page cache
    // However, when 0x13 refill to tlb, will trigger multi hit
    // So will only trigger multi-hit when PopCount(data.valididx) = 1
    vpn_hit && index_hit.reduce(_ || _) && PopCount(wb_valididx) === 1.U && s2xlate_hit
  }
```

## TlbStorageWrapper
- 相比TlbStorage，只改动端口的`w`和`access`的部分
- Storage的access是`Vec(ports,.._)`，表示每个读端口的命中路
  - 一旦唯一的写端口`valid`则所有access均为写命中路
```scala
class TlbStorageIO(...)(...) extends MMUIOBaseBundle {
  ...
  val w = Flipped(ValidIO(new Bundle {
    val wayIdx = Output(UInt(log2Up(nWays).W))
    val data = Output(new PtwRespS2)
  }))
  val access = Vec(ports, new ReplaceAccessBundle(nSets, nWays))
}
class TlbStorageWrapperIO(...)(...) extends MMUIOBaseBundle {
  ...
  val w = Flipped(ValidIO(new Bundle { val data = Output(new PtwRespS2) }))
  val replace = if (q.outReplace) Flipped(new TlbReplaceIO(ports, q)) else null
}
```
- Wapper的replace展开后实际使用的只有两项
  - 传递Storage的`Output(access)`
  - 指示refill写哪一路的`Inputs(chosen_set)`
```scala
class ReplaceIO(...)(...) extends TlbBundle {
  val access = Vec(Width, Flipped(new ReplaceAccessBundle(nSets, nWays)))
  val refillIdx = Output(UInt(log2Up(nWays).W))
  val chosen_set = Flipped(Output(UInt(log2Up(nSets).W)))
  ...
}

class TlbReplaceIO(...)(...) extends TlbBundle {
  val page = new ReplaceIO(Width, q.NSets, q.NWays)
  ...
}
```