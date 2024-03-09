# 端口

```scala
class BypassInfo(numWays: Int, dataBits: Int) extends Bundle {
  val valid = Vec(numWays, Bool())
  val data = UInt(dataBits.W)
}
class BypassNetworkIO(numWays: Int, numBypass: Int, dataBits: Int) 
	extends Bundle {
  val hold = Input(Bool())
  val source = Vec(numWays, Input(UInt(dataBits.W)))
  val target = Vec(numWays, Output(UInt(dataBits.W)))
  val bypass = Vec(numBypass, Input(new BypassInfo(numWays, dataBits)))
}
```

具体结构可以参考 [[../BypassNetwork.canvas|BypassNetwork.canvas]]，下文是关键参数
- numBypass：旁路输入数目
- numWays：旁路输出数目
- source：多个输出的默认值，在bypass的valid为false的时候，target为source
- hold：T0拉起时，T1的target应当为T0的target，保持不变

# 实现

存在两种实现
1. 先Mux旁路数据再RegNext
2. 先RegNext在Mux旁路数据