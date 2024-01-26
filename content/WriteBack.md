- [[WritebackSourceParams|WritebackSourceParams]]
- [[HasWritebackSource|HasWritebackSource]]
- [[HasWritebackSink|HasWritebackSink]]
```scala
WbArbiterWrapper: HasWritebackSource = Seq[WritebackSourceParams, 1](
    WritebackSourceParams: Seq[Seq[ExuConfig, 11]](
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 3]((MulDivExeUnit, Int), (JmpCSRExeUnit, Int), (FmiscExeUnit, Fp)), Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExcConfig, 2]((FmiscExeUnit, Fp), (JmpCSRExeUnit, Int)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem))
    )
)

ExuBlock: HasWritebackSource = Seq[WritebackSourceParams, 1](
    WritebackSourceParams: Seq[Seq[ExuConfig, 4]](
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((MulDivExeUnit, Int)), 
        Seq[ExcConfig, 1]((JmpCSRExeUnit, Int))
    )
)

ExuBlock: HasWritebackSource = Seq[WritebackSourceParams, 1](
    WritebackSourceParams: Seq[Seq[ExuConfig, 2]](
        Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExcConfig, 1]((FmiscExeUnit, Fp))
    )
)

MemBlock's HasWritebackSource: MemBlock: HasWritebackSource = Seq[WritebackSourceParams, 1](
    WritebackSourceParams: Seq[Seq[ExuConfig, 6]](
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem))
    )
)

Wb2Ctrl: HasWritebackSink = List[(Seq[HasWritebackSource], Seq[Int]), 1](
    Seq[HasWritebackSource, 3](
        ExuBlock: HasWritebackSource = Seq[WritebackSourceParams, 1](
            WritebackSourceParams: Seq[Seq[ExuConfig, 4]](
                Seq[ExcConfig, 1]((AluExeUnit, Int)), 
                Seq[ExcConfig, 1]((AluExeUnit, Int)), 
                Seq[ExcConfig, 1]((MulDivExeUnit, Int)), 
                Seq[ExcConfig, 1]((JmpCSRExeUnit, Int))
            )
        ), 

        ExuBlock: HasWritebackSource = Seq[WritebackSourceParams, 1](
            WritebackSourceParams: Seq[Seq[ExuConfig, 2]](
                Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
                Seq[ExcConfig, 1]((FmiscExeUnit, Fp))
            )
        ), 
        
        MemBlock: HasWritebackSource = Seq[WritebackSourceParams, 1](
            WritebackSourceParams: Seq[Seq[ExuConfig, 6]](
                Seq[ExcConfig, 1]((LoadExu, Mem)), 
                Seq[ExcConfig, 1]((LoadExu, Mem)), 
                Seq[ExcConfig, 1]((StaExu, Mem)), 
                Seq[ExcConfig, 1]((StaExu, Mem)), 
                Seq[ExcConfig, 1]((StdExu, Mem)),
                Seq[ExcConfig, 1]((StdExu, Mem))
            )
        )
    ), 
    Seq[Int, 3](0, 0, 0)
)

Wb2Ctrl: HasWritebackSource = Seq[WritebackSourceParams, 1](
    WritebackSourceParams: Seq[Seq[ExuConfig, 12]](
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((MulDivExeUnit, Int)), 
        Seq[ExcConfig, 1]((JmpCSRExeUnit, Int)), 
        Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExcConfig, 1]((FmiscExeUnit, Fp)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem))
    )
)


CtrlBlock: HasWritebackSink = List[(Seq[HasWritebackSource], Seq[Int]), 2](
    Seq[HasWritebackSource, 1](
        Wb2Ctrl: HasWritebackSource = Seq[WritebackSourceParams, 1](
            WritebackSourceParams: Seq[Seq[ExuConfig, 12]](
                Seq[ExcConfig, 1]((AluExeUnit, Int)), 
                Seq[ExcConfig, 1]((AluExeUnit, Int)), 
                Seq[ExcConfig, 1]((MulDivExeUnit, Int)), 
                Seq[ExcConfig, 1]((JmpCSRExeUnit, Int)), 
                Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
                Seq[ExcConfig, 1]((FmiscExeUnit, Fp)), 
                Seq[ExcConfig, 1]((LoadExu, Mem)), 
                Seq[ExcConfig, 1]((LoadExu, Mem)), 
                Seq[ExcConfig, 1]((StaExu, Mem)), 
                Seq[ExcConfig, 1]((StaExu, Mem)), 
                Seq[ExcConfig, 1]((StdExu, Mem)), 
                Seq[ExcConfig, 1]((StdExu, Mem))
            )
        )
    ), 
    Seq[Int, 1](0), 
    
    Seq[HasWritebackSource, 1](
        WbArbiterWrapper: HasWritebackSource = Seq[WritebackSourceParams, 1](
            WritebackSourceParams: Seq[Seq[ExuConfig, 11]](
                Seq[ExcConfig, 1]((AluExeUnit, Int)), 
                Seq[ExcConfig, 1]((AluExeUnit, Int)), 
                Seq[ExcConfig, 1]((LoadExu, Mem)), 
                Seq[ExcConfig, 1]((LoadExu, Mem)), 
                Seq[ExcConfig, 3]((MulDivExeUnit, Int), (JmpCSRExeUnit, Int), (FmiscExeUnit, Fp)), 
                Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
                Seq[ExcConfig, 2]((FmiscExeUnit, Fp), (JmpCSRExeUnit, Int)), 
                Seq[ExcConfig, 1]((StaExu, Mem)), 
                Seq[ExcConfig, 1]((StaExu, Mem)), 
                Seq[ExcConfig, 1]((StdExu, Mem)), 
                Seq[ExcConfig, 1]((StdExu, Mem))
            )
        )
    ), 
    Seq[Int, 1](0)
)

CtrlBlock: HasWritebackSource = Seq[WritebackSourceParams, 2](
  WritebackSourceParams: Seq[Seq[ExuConfig, 12]](
    Seq[ExcConfig, 1]((AluExeUnit, Int)), 
    Seq[ExcConfig, 1]((AluExeUnit, Int)), 
    Seq[ExcConfig, 1]((MulDivExeUnit, Int)), 
    Seq[ExcConfig, 1]((JmpCSRExeUnit, Int)), 
    Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
    Seq[ExcConfig, 1]((FmiscExeUnit, Fp)), 
    Seq[ExcConfig, 1]((LoadExu, Mem)), 
    Seq[ExcConfig, 1]((LoadExu, Mem)), 
    Seq[ExcConfig, 1]((StaExu, Mem)), 
    Seq[ExcConfig, 1]((StaExu, Mem)), 
    Seq[ExcConfig, 1]((StdExu, Mem)), 
    Seq[ExcConfig, 1]((StdExu, Mem))
  ), 
  WritebackSourceParams: Seq[Seq[ExuConfig, 11]](
    Seq[ExcConfig, 1]((AluExeUnit, Int)), 
    Seq[ExcConfig, 1]((AluExeUnit, Int)), 
    Seq[ExcConfig, 1]((LoadExu, Mem)), 
    Seq[ExcConfig, 1]((LoadExu, Mem)), 
    Seq[ExcConfig, 3]((MulDivExeUnit, Int), (JmpCSRExeUnit, Int), (FmiscExeUnit, Fp)), 
    Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
    Seq[ExcConfig, 2]((FmiscExeUnit, Fp), (JmpCSRExeUnit, Int)), 
    Seq[ExcConfig, 1]((StaExu, Mem)), 
    Seq[ExcConfig, 1]((StaExu, Mem)), 
    Seq[ExcConfig, 1]((StdExu, Mem)), 
    Seq[ExcConfig, 1]((StdExu, Mem))
  )
)

Rob's HasWritebackSink = List[(Seq[HasWritebackSource], Seq[Int]), 2](
  Seq[HasWritebackSource, 1](
    CtrlBlock: HasWritebackSource = Seq[WritebackSourceParams, 2](
      WritebackSourceParams: Seq[Seq[ExuConfig, 12]](
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((MulDivExeUnit, Int)), 
        Seq[ExcConfig, 1]((JmpCSRExeUnit, Int)), 
        Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExcConfig, 1]((FmiscExeUnit, Fp)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)),
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem))
      ), 
      
      WritebackSourceParams: Seq[Seq[ExuConfig, 11]](
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 3]((MulDivExeUnit, Int), (JmpCSRExeUnit, Int), (FmiscExeUnit, Fp)), 
        Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExcConfig, 2]((FmiscExeUnit, Fp), (JmpCSRExeUnit, Int)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem))
      )
    )
  ), 
  Seq[Int, 1](0), 
  
  Seq[HasWritebackSource, 1](
    CtrlBlock: HasWritebackSource = Seq[WritebackSourceParams, 2](
      WritebackSourceParams: Seq[Seq[ExuConfig, 12]](
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((MulDivExeUnit, Int)), 
        Seq[ExcConfig, 1]((JmpCSRExeUnit, Int)), 
        Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExcConfig, 1]((FmiscExeUnit, Fp)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem))
      ), 
      WritebackSourceParams: Seq[Seq[ExuConfig, 11]](
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((AluExeUnit, Int)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 1]((LoadExu, Mem)), 
        Seq[ExcConfig, 3]((MulDivExeUnit, Int), (JmpCSRExeUnit, Int), (FmiscExeUnit, Fp)), 
        Seq[ExcConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExcConfig, 2]((FmiscExeUnit, Fp), (JmpCSRExeUnit, Int)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StaExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem)), 
        Seq[ExcConfig, 1]((StdExu, Mem))
      )
    )
  ), 
  Seq[Int, 1](1)
)

Rob's wbExuConfigs = Seq[Seq[Seq[ExuConfig]], 2](
    Seq[Seq[ExuConfig], 12](
        Seq[ExuConfig, 1]((AluExeUnit, Int)), 
        Seq[ExuConfig, 1]((AluExeUnit, Int)), 
        Seq[ExuConfig, 1]((MulDivExeUnit, Int)), 
        Seq[ExuConfig, 1]((JmpCSRExeUnit, Int)), 
        Seq[ExuConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExuConfig, 1]((FmiscExeUnit, Fp)), 
        Seq[ExuConfig, 1]((LoadExu, Mem)), 
        Seq[ExuConfig, 1]((LoadExu, Mem)), 
        Seq[ExuConfig, 1]((StaExu, Mem)), 
        Seq[ExuConfig, 1]((StaExu, Mem)), 
        Seq[ExuConfig, 1]((StdExu, Mem)), 
        Seq[ExuConfig, 1]((StdExu, Mem))
    ), 
    Seq[Seq[ExuConfig], 11](
        Seq[ExuConfig, 1]((AluExeUnit, Int)), 
        Seq[ExuConfig, 1]((AluExeUnit, Int)), 
        Seq[ExuConfig, 1]((LoadExu, Mem)), 
        Seq[ExuConfig, 1]((LoadExu, Mem)), 
        Seq[ExuConfig, 3]((MulDivExeUnit, Int), (JmpCSRExeUnit, Int), (FmiscExeUnit, Fp)), 
        Seq[ExuConfig, 1]((FmacExeUnit, Fp)), 
        Seq[ExuConfig, 2]((FmiscExeUnit, Fp), (JmpCSRExeUnit, Int)), 
        Seq[ExuConfig, 1]((StaExu, Mem)), 
        Seq[ExuConfig, 1]((StaExu, Mem)), 
        Seq[ExuConfig, 1]((StdExu, Mem)), 
        Seq[ExuConfig, 1]((StdExu, Mem))
    )
)
```