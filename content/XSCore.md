---
title: XSCore
---

- `trait HasWritebackSink`
	- `writebackSinks`的类型中`Seq[Int]`的含义
	- `addWritebackSink`函数中`realIndex`的具体赋值含义
	- `writebackSinksImp`的具体函数语义
- `trait HasWritebackSourceImp`
	- 接口函数`writebackSource`和`writebackSource1`的返回值的类型定义含义
- `trait XSCoreBase`
	- `Wb2Ctrl`和`WbArbiter`的职能
	- `CtrlBlock`和`Wb2Ctrl`,`WbArbiter`两个模块的连接方式
	- `ExuBlock`和`MemBlock`与`Wb2Ctrl`,`WbArbiter`两个模块的连接方式
- `LazyModule`的层次结构
- 波形`difftest`模块的名称较为抽象
- `firtool`优化较为抽象
