- 成员变量
	```scala
var writebackSinks = ListBuffer.empty[(Seq[HasWritebackSource], Seq[Int])]
	```
	- `Seq[Int]`只有在[[Rob|Rob]]使用，用于区分不同的`Seq[HasWritebackSource]`
	- 第一维度的`List`指的是需要连接的组建的个数
		- 比如`Wb2Ctrl`和`WbArbiter`都需要连续`CtrlBlock`，则宽度为2
		- 第二维度是整数和浮点两个
		- `Seq[Int]`是等宽度的**所有元素相同**的整数数组
- 成员函数
```scala
def addWritebackSink(source: Seq[HasWritebackSource], 
	index: Option[Seq[Int]] = None): HasWritebackSink

def writebackSinksParams: Seq[WritebackSourceParams]

final def writebackSinksMod(
   thisMod: Option[HasWritebackSource] = None,
   thisModImp: Option[HasWritebackSourceImp] = None
 ): Seq[Seq[HasWritebackSourceImp]]

final def writebackSinksImp(
  thisMod: Option[HasWritebackSource] = None,
  thisModImp: Option[HasWritebackSourceImp] = None
): Seq[Seq[ValidIO[ExuOutput]]]
	
def selWritebackSinks(func: WritebackSourceParams => Int): Int

def generateWritebackIO(
  thisMod: Option[HasWritebackSource] = None,
  thisModImp: Option[HasWritebackSourceImp] = None
 ): Unit
```
- `addWritebackSink`用于向`writebackSinks`添加，不用在意这里的`index`
- `writebackSinksParams`
- `writebackSinksMod`用于提取`writebackSinks`中的`HasWritebackSourceImp`
	- `List[Seq[HasWritebackSource]] ==> Seq[Seq[HasWritebackSourceImp]]`
	- 如果参数`(thisMod，thisModImp).isDefined`，并且`thisMod`等于成员变量`writebackSouce`中的一个`HasWritebackSource`，则使用`thisModImp`替换
- 
- 仅用于[[./LazyModule|LazyModule]]的extends，不用记录其`module`变量