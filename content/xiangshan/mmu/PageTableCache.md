# bypass

在req和resp端口中存在bypassed的端口，
```scala
// req
val bypassed = Vec(3, Bool())
// resp
val bypassed = Bool()
```
在Cache流水线中，以`Vec(3, Bool())`的形式传递，3表示sv39中的三级页表。
仅指示req.vpn命中refill，但不会将数据真正旁路到resp。
所有bypass的resp仅进入[[./L2Tlb#MissQueue|L2Tlb > MissQueue]] 等待再一次发起请求。

# H Extension
为各级Cache增加`h`位，表示**是否是第二级地址翻译的页表**。
使用`s2xlate`的宽度来表示，但是只能赋值为`onlyStage1`和`onlyStage2`
refill时，该字段来自[[./PageTableWalker|PageTableWalker]]、[[./LLPtw|LLPtw]]和[[HPtw|HPtw]]的直接赋值。
比对时，除了一般的tag命中，还需要`h`位相同。
如果req是`allStage`会转换成`onlyStage1`进行匹配，命中的话则会输出`stage1Hit`
