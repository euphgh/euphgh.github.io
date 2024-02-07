## 成员变量

```scala
val writebackSourceImp: HasWritebackSourceImp
val writebackSourceParams: Seq[WritebackSourceParams]
```

## 成员函数

```scala
final def writebackSource(sourceMod: HasWritebackSourceImp):
	Seq[Seq[Valid[ExuOutput]]]`
final def writebackSource1(sourceMod: HasWritebackSourceImp):
	Seq[Seq[DecoupledIO[ExuOutput]]]`
```

- 对参数`sourceMod`进行**存在性**和**宽度检查**
- `sourceMod`的对应接口函数的返回值类型是成员函数返回值类型的`Option`
  1. 确认`Option`的`isDfine`，代码称其为`source`
  2. 确认`source`的第一个`Seq`的宽度等于`writebackSourceParams`的宽度
	  - 可见`writebackSourceParams`的`Seq`代表`Int`和`Float`两个`ExuBlock`
  1. 逐个确认`source`中第二个`Seq`的宽度等于`writebackSourceParams`的各个元素的`exuConfigs`的第一维的宽度
	  - 可见`source`的第二个`Seq`实际写回端口的数目

## 用法

- 仅用于[[./LazyModule|LazyModule]]的 extends，需记录其`module`变量
  - [[LazyModuleImp|LazyModuleImp]]需要 extends [[./HasWritebackSourceImp|HasWritebackSourceImp]]
  - `writebackSource`变量就是该`LazyModule`的`module`的引用
