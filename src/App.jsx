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
      ytd: acum,
      nddParcial,
      esAcumulado: filtros.periodo === 'TODOS'
    }
  }, [filtros, contador, periodos, tarifas, ndd.porSerie, ultimo])

  if (!rol) return <Login onAcceso={entrar} verificar={verificarPin} configurado={configurado} />

  const ctx = { dataset, meta, periodos, tarifas, contador, costosModelo, ndd, catalogoSeries, filtros, setFiltros, rol, ...modelo }

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
