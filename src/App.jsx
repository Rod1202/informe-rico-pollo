import React, { useEffect, useMemo, useRef, useState } from 'react'
import dataset from './data/dataset.json'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import Login from './components/Login.jsx'
import Resumen from './views/Resumen.jsx'
import Volumetria from './views/Volumetria.jsx'
import Facturacion from './views/Facturacion.jsx'
import Auditoria from './views/Auditoria.jsx'
import Kpi from './views/Kpi.jsx'
import { filtrar, medidas, serieMensual, auditoriaNDD, ytd } from './lib/measures.js'
import { prorratear, agruparPorArea, agruparPorUsuario } from './lib/prorrateo.js'
import { usuariosDeGerencia, acotarAtribucion, medidasAtribuidas, serieMensualAtribuida } from './lib/gerencia.js'
import { ROLES, verificarPin, configurado, CLAVE_SESION } from './lib/acceso.js'
import { fFecha } from './lib/format.js'


const rolGuardado = () => {
  try {
    return ROLES[sessionStorage.getItem(CLAVE_SESION)] ?? null
  } catch {
    return null
  }
}

export default function App() {
  const { meta, periodos, tarifas, contador, costosModelo, ndd, catalogoSeries } = dataset
  const ultimo = periodos[periodos.length - 1]

  
  const panel = useRef(null)
  const irArriba = () => panel.current?.scrollTo({ top: 0, behavior: 'smooth' })

  const [rol, setRol] = useState(rolGuardado)
  const [vista, setVista] = useState(() => rolGuardado()?.inicio ?? 'resumen')
  const [filtros, setFiltros] = useState({
    periodo: ultimo?.key ?? 'TODOS',
    sede: 'TODAS',
    area: 'TODAS',
    estado: 'TODOS'
  })

  
  useEffect(() => {
    if (rol && !rol.vistas.includes(vista)) setVista(rol.inicio)
  }, [rol, vista])

  const entrar = (nuevo) => {
    try { sessionStorage.setItem(CLAVE_SESION, nuevo.id) } catch {  }
    setRol(nuevo)
    setVista(nuevo.inicio)
  }

  const salir = () => {
    try { sessionStorage.removeItem(CLAVE_SESION) } catch {  }
    setRol(null)
  }

  const modelo = useMemo(() => {
    const periodosSel = filtros.periodo === 'TODOS' ? periodos.map((p) => p.key) : [filtros.periodo]

    
    const rows = filtrar(contador, filtros)
    const m = medidas(rows, tarifas)

    
    const rowsTodoPeriodo = filtrar(contador, { ...filtros, periodo: 'TODOS' })
    const mensual = serieMensual(rowsTodoPeriodo, periodos, tarifas)
    const actual = mensual.serie.find((s) => s.periodo === filtros.periodo) ?? null

    
    const rowsSoloPeriodo = filtrar(contador, { periodo: filtros.periodo, sede: 'TODAS', area: 'TODAS', estado: 'TODOS' })
    const totalContexto = medidas(rowsSoloPeriodo, tarifas)

    const acumulado = medidas(rowsTodoPeriodo, tarifas)
    const auditoria = auditoriaNDD(rows, ndd.porSerie, periodosSel)
    const acum = ytd(rowsTodoPeriodo, periodos, tarifas, filtros.periodo === 'TODOS' ? ultimo?.key : filtros.periodo)

    const periodosInfo = periodos.filter((p) => periodosSel.includes(p.key))
    const nddParcial = periodosInfo.filter((p) => p.enNDD && p.nddParcial)

    // Atribucion: reparte el volumen facturado del contador SDS entre los
    // usuarios que NDD identifico en cada impresora. Se calcula una sola vez
    // aca porque la consumen tanto Gerencia como Auditoria.
    const atribucion = prorratear({
      contador,
      porSerieUsuario: ndd.porSerieUsuario,
      catalogoSeries,
      periodosSel,
      tarifas,
      filtros,
      periodos
    })
    const areasAtribuidas = agruparPorArea(atribucion, tarifas)
    const usuariosAtribuidos = agruparPorUsuario(atribucion, tarifas)
    const sinAuditoria = areasAtribuidas.reduce((a, b) => a + b.sinAuditoria, 0)

    // Mismo reparto pero sobre todos los periodos: lo necesita el evolutivo,
    // que dibuja la historia completa aunque el filtro sea de un solo mes.
    const repartoHistorico = prorratear({
      contador,
      porSerieUsuario: ndd.porSerieUsuario,
      catalogoSeries,
      periodosSel: periodos.map((p) => p.key),
      tarifas,
      filtros: { ...filtros, periodo: 'TODOS' },
      periodos
    })

    return {
      periodosSel,
      periodosInfo,
      rows,
      rowsTodoPeriodo,
      m,
      mensual,
      actual,
      totalContexto,
      acumulado,
      auditoria,
      atribucion,
      areasAtribuidas,
      usuariosAtribuidos,
      sinAuditoria,
      repartoHistorico,
      ytd: acum,
      nddParcial,
      esAcumulado: filtros.periodo === 'TODOS'
    }
  }, [filtros, contador, periodos, tarifas, ndd.porSerie, ndd.porSerieUsuario, catalogoSeries, ultimo])

  // Si el PIN es de una gerencia, todo el tablero se recalcula sobre el
  // consumo de sus usuarios: no ve el volumen de las demas ni el que quedo sin
  // auditoria. El cargo fijo no entra porque es del equipo, no de la persona.
  const acotado = useMemo(() => {
    if (!rol?.gerencia) return null

    const cat = new Map(catalogoSeries.map((c) => [c.serie, c]))
    const suyos = usuariosDeGerencia(dataset.gerencias?.usuarios, rol.gerencia)
    const periodosTodos = periodos.map((p) => p.key)

    const todo = acotarAtribucion(
      prorratear({
        contador,
        porSerieUsuario: ndd.porSerieUsuario,
        catalogoSeries,
        periodosSel: periodosTodos,
        tarifas,
        filtros: { ...filtros, periodo: 'TODOS' },
        periodos
      }),
      suyos
    )

    const enPeriodos = (claves) => todo.asignado.filter((a) => claves.includes(a.periodo))
    const periodosSel = filtros.periodo === 'TODOS' ? periodosTodos : [filtros.periodo]
    const i = periodos.findIndex((p) => p.key === filtros.periodo)
    const previo = filtros.periodo !== 'TODOS' && i > 0 ? periodos[i - 1] : null

    const asignadoActual = enPeriodos(periodosSel)
    const asignadoPrevio = previo ? enPeriodos([previo.key]) : []
    const atribucion = { ...todo, asignado: asignadoActual }

    const mensual = serieMensualAtribuida(todo.asignado, periodos, tarifas, cat)

    return {
      m: medidasAtribuidas(asignadoActual, tarifas, cat),
      mensual,
      actual: mensual.serie.find((s) => s.periodo === filtros.periodo) ?? null,
      atribucion,
      areasAtribuidas: agruparPorArea(atribucion, tarifas),
      usuariosAtribuidos: agruparPorUsuario(atribucion, tarifas),
      sinAuditoria: 0,
      alcance: {
        tipo: 'gerencia',
        gerencia: rol.gerencia,
        etiqueta: rol.etiqueta,
        personas: suyos.size,
        asignadoActual,
        asignadoPrevio,
        asignadoTodo: todo.asignado,
        mPrev: medidasAtribuidas(asignadoPrevio, tarifas, cat),
        usuariosPrev: agruparPorUsuario({ ...todo, asignado: asignadoPrevio }, tarifas)
      }
    }
  }, [rol, dataset.gerencias, catalogoSeries, contador, ndd.porSerieUsuario, periodos, tarifas, filtros])

  if (!rol) return <Login onAcceso={entrar} verificar={verificarPin} configurado={configurado} />

  const ctx = {
    dataset, meta, periodos, tarifas, contador, costosModelo, ndd, catalogoSeries, filtros, setFiltros, rol,
    alcance: { tipo: 'general' },
    ...modelo,
    ...(acotado ?? {}),
    // El reparto completo se conserva aparte: el grafico de gerencias compara
    // toda la empresa aunque el resto del tablero este acotado.
    atribucionCompleta: modelo.atribucion,
    repartoHistorico: modelo.repartoHistorico
  }

  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar vista={vista} setVista={setVista} meta={meta} rol={rol} onSalir={salir} onInicio={irArriba} />
      <div ref={panel} className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <Header
          meta={meta}
          periodos={periodos}
          filtros={filtros}
          setFiltros={setFiltros}
          vista={vista}
        />

        <main className="p-5 space-y-5 max-w-[1600px] mx-auto w-full">
          {modelo.nddParcial.length > 0 && (vista === 'auditoria' || vista === 'resumen') && (
            <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 shrink-0 mt-px" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4.5m0 3.5h.01" strokeLinecap="round" />
              </svg>
              <p>
                <strong>NDD parcial:</strong>{' '}
                {modelo.nddParcial
                  .map((p) => `${p.label} solo registra desde el ${fFecha(p.nddMinFecha)} (${p.nddDiasConDatos}/${p.nddDiasMes} días)`)
                  .join(' · ')}
                . La brecha contra el contador SDS de ese mes no es comparable.
              </p>
            </div>
          )}

          {vista === 'kpi' && <Kpi ctx={ctx} />}
          {vista === 'resumen' && <Resumen ctx={ctx} />}
          {vista === 'volumetria' && <Volumetria ctx={ctx} />}
          {vista === 'facturacion' && <Facturacion ctx={ctx} />}
          {vista === 'auditoria' && <Auditoria ctx={ctx} />}
        </main>

        <footer className="mt-auto py-3 px-6 border-t border-slate-200/80 bg-white text-[11px] flex items-center justify-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-slate-700 font-semibold">Misión Tecnológica</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Gerencia de Operaciones</span>
        </footer>
      </div>
    </div>
  )
}
