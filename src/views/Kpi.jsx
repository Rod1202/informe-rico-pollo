import React, { useCallback, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts'
import { Card, Kpi as Tile, Tabla, Badge, Delta, TooltipBox, Nota, Fuente, Buscador, normaliza } from '../components/ui.jsx'
import HistoricoLinea from '../components/HistoricoLinea.jsx'
import TopRanking, { armarTop } from '../components/TopRanking.jsx'
import GerenciasBarra, { nombreGerencia } from '../components/GerenciasBarra.jsx'
import ModalTrabajos from '../components/ModalTrabajos.jsx'
import { C, CAT } from '../lib/palette.js'
import { filtrar, medidas, periodoPrevio } from '../lib/measures.js'
import { prorratear, trabajosProrrateados, SIN_AUDITORIA } from '../lib/prorrateo.js'
import { compararAtribuido, serieMensualAtribuida } from '../lib/gerencia.js'
import { agruparPersonas, agruparAreasPersonas, usuariosDePersonas, balde } from '../lib/organizacion.js'
import { fInt, fMoney, fTarifa, fPct, fDelta, fCompact, titulo } from '../lib/format.js'

const IC = {
  dinero: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  hoja: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  bn: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 3v18',
  color: 'M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.439-.439 1.151-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z',
  escudo: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
}
const Icono = ({ d }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)


function Var({ pct, alta, sinBase }) {
  if (sinBase) return <span className="text-[10px] text-slate-400 font-medium">sin mes previo</span>
  if (alta) return <Badge tone="azul">nuevo</Badge>
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return <span className="text-slate-300">—</span>
  const sube = pct > 0.0005
  const baja = pct < -0.0005

  const tono = sube ? 'text-rose-600' : baja ? 'text-emerald-600' : 'text-slate-500'
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${tono}`}>
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d={sube ? 'M5 15l7-7 7 7' : baja ? 'M19 9l-7 7-7-7' : 'M5 12h14'} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {fDelta(pct, 1)}
    </span>
  )
}


const DIMENSIONES = [
  { id: 'area', l: 'Área', col: 'Área (padrón)' },
  { id: 'dpto', l: 'Depto.', col: 'Departamento (padrón)' },
  { id: 'ubicacion', l: 'Ubicación', col: 'Ubicación del equipo' },
  { id: 'sede', l: 'Sede', col: 'Sede' },
  { id: 'serie', l: 'Impresora', col: 'Serie / área' }
]


const recorta = (s, max = 14) => {
  const t = titulo(s)
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

const nombreUsuario = (u) =>
  u.usuario === SIN_AUDITORIA ? 'Sin auditoría NDD' : u.nombre && u.nombre !== '-' ? u.nombre : u.usuario


export default function Kpi({ ctx }) {
  const {
    m, mensual, actual, esAcumulado, contador, tarifas, periodos, filtros, rowsTodoPeriodo,
    ndd, catalogoSeries, periodosSel, atribucion, atribucionCompleta, repartoHistorico, alcance
  } = ctx

  // Con un PIN de gerencia el tablero ya viene acotado a sus usuarios: las
  // medidas y los rankings salen del reparto, no del contador completo.
  const esGerencia = alcance?.tipo === 'gerencia'
  // La jerarquia sale del padron de personas, no de la columna Gerencia del
  // contador: agrupa por quien imprimio, no por de quien es el equipo.
  const padron = ctx.dataset.gerencias?.usuarios ?? {}


  const previo = useMemo(() => periodoPrevio(periodos, filtros.periodo), [periodos, filtros.periodo])
  const rowsActual = useMemo(() => filtrar(contador, filtros), [contador, filtros])
  const rowsPrevio = useMemo(
    () => (previo ? filtrar(contador, { ...filtros, periodo: previo.key }) : []),
    [contador, filtros, previo]
  )
  const mPrev = useMemo(
    () => (esGerencia ? alcance.mPrev : medidas(rowsPrevio, tarifas)),
    [esGerencia, alcance, rowsPrevio, tarifas]
  )

  const sinBase = esGerencia ? !previo || alcance.asignadoPrevio.length === 0 : !previo || rowsPrevio.length === 0
  const pct = (a, b) => (sinBase || !b ? null : (a - b) / b)

  const etiqueta = esAcumulado ? 'el acumulado' : (actual?.label ?? '')
  const etiquetaPrev = sinBase ? null : previo.label


  // Los tres conceptos que componen el clic variable del contrato.
  const desglose = [
    {
      tipo: 'Monocromo (B/N)',
      detalle: `${fTarifa(tarifas.bn)} por página`,
      icono: IC.bn,
      pags: m.volBN, costo: m.clicBN, pagsPrev: mPrev.volBN, costoPrev: mPrev.clicBN,
      color: CAT[0]
    },
    {
      tipo: 'Color estándar',
      detalle: `${fTarifa(tarifas.color)} por página`,
      icono: IC.color,
      pags: m.volColorStd, costo: m.clicColorStd, pagsPrev: mPrev.volColorStd, costoPrev: mPrev.clicColorStd,
      color: CAT[2]
    },
    {
      tipo: 'Color A3 adicional',
      detalle: `${fTarifa(tarifas.colorA3)} · solo ${tarifas.nombreA3}`,
      icono: IC.color,
      pags: m.volColorA3, costo: m.clicColorA3, pagsPrev: mPrev.volColorA3, costoPrev: mPrev.clicColorA3,
      color: CAT[3]
    }
  ].map((d) => ({
    ...d,
    pctPags: m.volumetria ? d.pags / m.volumetria : 0,
    pctCosto: m.clicVariable ? d.costo / m.clicVariable : 0,
    varCosto: pct(d.costo, d.costoPrev),
    varPags: pct(d.pags, d.pagsPrev)
  }))


  // Ranking SDS por dimension, y el de areas que manda el resto de la vista.
  const [dimension, setDimension] = useState('area')
  const dimActiva = DIMENSIONES.find((d) => d.id === dimension) ?? DIMENSIONES[0]
  const catSerie = useMemo(() => new Map(catalogoSeries.map((c) => [c.serie, c])), [catalogoSeries])
  // Reparto del periodo anterior sin acotar: lo usan el grafico de gerencias y
  // la variacion del top de usuarios.
  const atribucionPrevia = useMemo(() => {
    if (!previo) return null
    return prorratear({
      contador,
      porSerieUsuario: ndd.porSerieUsuario,
      catalogoSeries,
      periodosSel: [previo.key],
      tarifas,
      filtros: { ...filtros, periodo: previo.key },
      periodos
    })
  }, [previo, contador, ndd.porSerieUsuario, catalogoSeries, tarifas, filtros, periodos])

  const repartoTodas = useMemo(
    () => ({ actual: atribucionCompleta.asignado, previo: atribucionPrevia?.asignado ?? [] }),
    [atribucionCompleta, atribucionPrevia]
  )



  // Gerencia seleccionada en el grafico de barras. Es el primer nivel de la
  // jerarquia Gerencia -> Area -> Ubicacion, y acota todo lo que viene abajo.
  const [gerenciaSel, setGerenciaSel] = useState(null)
  const [areaSel, setAreaSel] = useState(null)
  const alternarArea = useCallback((a) => setAreaSel((prev) => (prev === a ? null : a)), [])
  const alternarGerencia = useCallback((g) => {
    setGerenciaSel((prev) => (prev === g ? null : g))
    setAreaSel(null)
  }, [])

  // El grafico compara el parque completo, tambien con un PIN de gerencia: lo
  // que se acota es el detalle, no la comparativa.
  // El grafico compara todas las gerencias, tambien con PIN de gerencia: se
  // arma sobre el reparto completo, no sobre el acotado.
  const rankingGerencias = useMemo(
    () => agruparPersonas(repartoTodas.actual, repartoTodas.previo, padron, 'gerencia', tarifas),
    [repartoTodas, padron, tarifas]
  )

  // Nombre de la gerencia propia tal como lo escribe el contador.
  const gerenciaPropia = esGerencia ? alcance.gerencia : null

  // Con PIN de gerencia el detalle arranca y se queda en la gerencia propia.
  const gerenciaActiva = esGerencia ? gerenciaPropia : gerenciaSel

  // Todo lo que va debajo del grafico se acota a la gerencia elegida, y la
  // pertenencia la define el padron de personas, no el dueño del equipo.
  const deGerencia = useCallback(
    (fila) => !gerenciaActiva || balde(fila, padron, 'gerencia') === gerenciaActiva,
    [gerenciaActiva, padron]
  )
  const asignadoVista = useMemo(
    () => (gerenciaActiva ? atribucion.asignado.filter(deGerencia) : atribucion.asignado),
    [atribucion, gerenciaActiva, deGerencia]
  )
  const asignadoVistaPrev = useMemo(() => {
    const base = esGerencia ? alcance.asignadoPrevio : (atribucionPrevia?.asignado ?? [])
    return gerenciaActiva ? base.filter(deGerencia) : base
  }, [esGerencia, alcance, atribucionPrevia, gerenciaActiva, deGerencia])

  const areasVisibles = useMemo(
    () => agruparAreasPersonas(asignadoVista, padron, tarifas),
    [asignadoVista, padron, tarifas]
  )
  const usuariosVisibles = useMemo(
    () => usuariosDePersonas(asignadoVista, padron, tarifas),
    [asignadoVista, padron, tarifas]
  )

  // Area y departamento salen de la persona; ubicacion y serie, del equipo.
  const rankingDim = useMemo(() => {
    if (dimension === 'area' || dimension === 'dpto') {
      return agruparPersonas(asignadoVista, asignadoVistaPrev, padron, dimension, tarifas)
    }
    const r = compararAtribuido(asignadoVista, asignadoVistaPrev, dimension, tarifas, catSerie)
    return dimension === 'serie' ? r.filter((x) => x.volumetria > 0 || x.volPrev > 0) : r
  }, [asignadoVista, asignadoVistaPrev, padron, dimension, tarifas, catSerie])

  const rankingAreas = useMemo(
    () => agruparPersonas(asignadoVista, asignadoVistaPrev, padron, 'area', tarifas),
    [asignadoVista, asignadoVistaPrev, padron, tarifas]
  )


  const mapaUsuariosPrev = useMemo(
    () => new Map(usuariosDePersonas(asignadoVistaPrev, padron, tarifas).map((u) => [u.usuario, u])),
    [asignadoVistaPrev, padron, tarifas]
  )


  const topAreas = useMemo(
    () =>
      armarTop(rankingAreas, {
        id: (a) => a.clave,
        etiqueta: (a) => titulo(a.clave),
        valor: (a) => a.volumetria,
        valorPrev: (a) => a.volPrev
      }),
    [rankingAreas]
  )

  // El top de usuarios es un ranking de personas, asi que deja fuera la fila
  // tecnica de volumen sin auditoria (si existe, se explica en la tabla).
  const topUsuarios = useMemo(() => {
    const mapaActual = new Map(usuariosVisibles.map((u) => [u.usuario, u]))
    const claves = [...new Set([...mapaActual.keys(), ...mapaUsuariosPrev.keys()])].filter((k) => k !== SIN_AUDITORIA)
    const items = claves.map((k) => ({
      usuario: k,
      actual: mapaActual.get(k) ?? null,
      prev: mapaUsuariosPrev.get(k) ?? null
    }))
    return armarTop(items, {
      id: (x) => x.usuario,
      etiqueta: (x) => nombreUsuario(x.actual ?? x.prev ?? { usuario: x.usuario, nombre: '-' }),
      valor: (x) => x.actual?.total ?? 0,
      valorPrev: (x) => x.prev?.total ?? 0
    })
  }, [usuariosVisibles, mapaUsuariosPrev])

  const personasAtribuidas = useMemo(
    () => usuariosVisibles.filter((u) => u.usuario !== SIN_AUDITORIA).length,
    [usuariosVisibles]
  )


  const topAreasChart = rankingAreas
    .filter((a) => a.volumetria > 0)
    .slice(0, 12)
    .map((a) => ({ ...a, corto: recorta(a.clave) }))


  // Tabla de usuarios: general, o solo los del area elegida.

  const areaElegida = useMemo(
    () => (areaSel ? areasVisibles.find((a) => a.area === areaSel) ?? null : null),
    [areaSel, areasVisibles]
  )
  // Base de la tabla: el ranking general, o solo el area elegida arriba.
  const usuariosBase = areaElegida ? areaElegida.usuarios : usuariosVisibles
  const totalBase = usuariosBase.reduce((a, b) => a + b.total, 0)

  const [busqueda, setBusqueda] = useState('')
  const usuariosTabla = useMemo(() => {
    const q = normaliza(busqueda)
    if (!q) return usuariosBase
    return usuariosBase.filter((u) => normaliza(nombreUsuario(u)).includes(q) || normaliza(u.usuario).includes(q))
  }, [usuariosBase, busqueda])
  const totalTabla = usuariosTabla.reduce((a, b) => a + b.total, 0)
  const filtrando = usuariosTabla.length !== usuariosBase.length

  // Serie mensual de lo que muestre el ranking: el area elegida, o el
  // consolidado mientras no haya ninguna.
  // El evolutivo sigue el camino elegido: consolidado -> gerencia -> area.
  const coincideJerarquia = useCallback(
    (g, a) => (!gerenciaActiva || g === gerenciaActiva) && (!areaSel || a === areaSel),
    [gerenciaActiva, areaSel]
  )

  const mensualArea = useMemo(() => {
    if (!gerenciaActiva && !areaSel) return mensual
    const base = esGerencia ? alcance.asignadoTodo : repartoHistorico.asignado
    return serieMensualAtribuida(
      base.filter((a) => coincideJerarquia(balde(a, padron, 'gerencia'), balde(a, padron, 'area'))),
      periodos,
      tarifas,
      catSerie
    )
  }, [esGerencia, alcance, repartoHistorico, gerenciaActiva, areaSel, coincideJerarquia, padron, mensual, catSerie, periodos, tarifas])

  // Titulo y etiqueta del evolutivo segun hasta donde se bajo.
  const rutaEvolutivo = [
    gerenciaActiva ? nombreGerencia(gerenciaActiva) : null,
    areaSel ? titulo(areaSel) : null
  ].filter(Boolean)

  // Detalle de trabajos en ventana flotante: se abre desde cualquier lista de
  // usuarios y muestra todo lo que imprimio dentro del alcance vigente.
  const [usuarioModal, setUsuarioModal] = useState(null)
  const [busquedaTrabajo, setBusquedaTrabajo] = useState('')
  const abrirUsuario = useCallback((u) => {
    setUsuarioModal(u)
    setBusquedaTrabajo('')
  }, [])

  // El usuario ya pertenece a una sola gerencia y area del padron, asi que sus
  // trabajos no se filtran: se muestran todos los del periodo.
  const trabajosModal = useMemo(() => {
    if (!usuarioModal) return []
    return trabajosProrrateados(atribucion, ndd.porTrabajo, null, usuarioModal.usuario, periodosSel, tarifas)
  }, [usuarioModal, atribucion, ndd.porTrabajo, periodosSel, tarifas])

  const alcanceModal = [
    gerenciaActiva ? nombreGerencia(gerenciaActiva) : null,
    areaElegida ? titulo(areaElegida.area) : null
  ].filter(Boolean).join(' › ')


  return (
    <>

      <Fuente
        tono="sds"
        titulo={esGerencia ? `Consumo de ${alcance.etiqueta.replace('Gerencia · ', '')}` : 'Facturación · contador SDS'}
        descripcion={
          esGerencia
            ? `Volumen facturado que corresponde a las ${alcance.personas} personas del padrón de esta gerencia. No incluye el consumo de otras gerencias ni el cargo fijo de los equipos, que es del parque y no de las personas.`
            : 'Volumetría y costos que se cobran en el contrato. Todo este tablero toma el contador SDS como el 100%.'
        }
        etiqueta={esGerencia ? 'Alcance acotado' : 'Fuente SDS'}
      />

      {/* 1 · Evolución histórica, con pestaña volumetría / facturación. */}
      <HistoricoLinea mensual={mensual} periodoActivo={filtros.periodo} esAcumulado={esAcumulado} />

      {/* 2 · KPIs del periodo. */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <Tile
          destacado
          icon={<Icono d={IC.dinero} />}
          label={`${esGerencia ? 'Costo de clic' : 'Costo total'} ${esAcumulado ? 'acumulado' : (actual?.label ?? '')}`}
          value={fMoney(m.facturacion)}
          foot={
            sinBase ? (
              <span className="text-[10px] text-white/80 font-medium">{esGerencia ? 'solo clic variable' : 'clic + cargo fijo'}</span>
            ) : (
              <Delta value={pct(m.facturacion, mPrev.facturacion)} suffix={`vs ${etiquetaPrev}`} />
            )
          }
        />
        <Tile
          icon={<Icono d={IC.bn} />}
          label="Costo B/N"
          value={fMoney(m.clicBN)}
          foot={<span className="text-[10px] text-slate-400 font-medium">{fPct(m.clicVariable ? m.clicBN / m.clicVariable : 0)} del clic</span>}
        />
        <Tile
          icon={<Icono d={IC.color} />}
          label="Costo color"
          value={fMoney(m.clicColor)}
          foot={<span className="text-[10px] text-slate-400 font-medium">{fPct(m.clicVariable ? m.clicColor / m.clicVariable : 0)} del clic</span>}
        />
        {esGerencia ? (
          <Tile
            icon={<Icono d={IC.escudo} />}
            label="Equipos usados"
            value={fInt(m.equiposActivos)}
            foot={<span className="text-[10px] text-slate-400 font-medium">impresoras donde imprimió</span>}
          />
        ) : (
          <Tile
            icon={<Icono d={IC.escudo} />}
            label="Cargo fijo"
            value={fMoney(m.cargoFijo)}
            foot={<span className="text-[10px] text-slate-400 font-medium">{fPct(m.pctCargoFijo)} de la factura</span>}
          />
        )}
        <Tile
          icon={<Icono d={IC.hoja} />}
          label="Volumetría"
          value={fInt(m.volumetria)}
          foot={
            sinBase ? (
              <span className="text-[10px] text-slate-400 font-medium">páginas</span>
            ) : (
              <Delta value={pct(m.volumetria, mPrev.volumetria)} suffix={`vs ${etiquetaPrev}`} />
            )
          }
        />
      </section>

      {/* 3 · Composición del clic variable: B/N, color estándar y color A3. */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {desglose.map((d) => (
          <div key={d.tipo} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
            <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: d.color }} />
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-800 leading-tight">{d.tipo}</p>
                <p className="text-[10px] text-slate-400 leading-tight num mt-0.5">{d.detalle}</p>
              </div>
              <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${d.color}18`, color: d.color }}>
                <Icono d={d.icono} />
              </span>
            </div>

            <p className="text-2xl font-bold text-slate-900 num leading-none">{fMoney(d.costo)}</p>
            <p className="text-[10px] text-slate-500 num mt-1">
              {fPct(d.pctCosto)} del clic variable
              {!sinBase && (
                <>
                  {' · '}
                  <span className={d.varCosto > 0.0005 ? 'text-rose-600 font-semibold' : d.varCosto < -0.0005 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                    {fDelta(d.varCosto, 1)}
                  </span>{' '}
                  vs {etiquetaPrev}
                </>
              )}
            </p>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Páginas</span>
                <span className="block text-[13px] font-bold text-slate-800 num leading-tight">{fInt(d.pags)}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">% del volumen</span>
                <span className="block text-[13px] font-bold text-slate-800 num leading-tight">{fPct(d.pctPags)}</span>
              </span>
            </div>

            {/* Proporción del costo dentro del clic variable. */}
            <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(1, d.pctCosto * 100)}%`, background: d.color }} />
            </div>
          </div>
        ))}
      </section>

      <Nota tono="aviso" titulo="Peso real del color" icono="▸">
        El color es el <strong className="num">{fPct(m.pctVolColor)}</strong> del volumen pero el{' '}
        <strong className="num">{fPct(m.clicVariable ? m.clicColor / m.clicVariable : 0)}</strong> del clic. La serie{' '}
        <strong>{tarifas.nombreA3}</strong> concentra <strong className="num">{fMoney(m.clicColorA3)}</strong> con solo{' '}
        {fInt(m.volColorA3)} páginas por la tarifa A3 de {fTarifa(tarifas.colorA3)}.
      </Nota>

      {/* 4 · Comparativa de gerencias. Gobierna áreas, ubicaciones y usuarios. */}
      <GerenciasBarra
        filas={rankingGerencias}
        activo={gerenciaActiva}
        onClic={esGerencia ? null : alternarGerencia}
        propia={esGerencia ? gerenciaPropia : null}
        soloPropia={esGerencia}
        sinBase={sinBase}
        etiquetaPrev={etiquetaPrev}
        etiqueta={etiqueta}
      />

      {/* 5 · Los dos top 5, con variación de consumo y de puesto. */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopRanking
          title="Top 5 áreas"
          subtitle={sinBase ? 'El periodo seleccionado no tiene mes previo con el cual comparar' : `Páginas facturadas en ${etiqueta}, contra ${etiquetaPrev}`}
          right={<Badge tone="azul">{rankingAreas.filter((a) => a.volumetria > 0).length} áreas</Badge>}
          filas={topAreas}
          sinBase={sinBase}
          onClic={alternarArea}
          activo={areaSel}
          vacio="Sin consumo facturado para los filtros aplicados."
        />
        <TopRanking
          title="Top 5 usuarios"
          subtitle={sinBase ? 'Reparto del volumen facturado entre los usuarios identificados' : `Volumen atribuido en ${etiqueta}, contra ${etiquetaPrev}`}
          right={<Badge tone="azul">{personasAtribuidas} usuarios</Badge>}
          filas={topUsuarios}
          sinBase={sinBase}
          vacio="Sin usuarios identificados para los filtros aplicados."
        />
      </section>

      {/* 5 · Ranking de áreas (clickeable) y variación contra el periodo previo. */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card
          className="xl:col-span-6"
          title="Consumo por área · ranking"
          subtitle={`Páginas facturadas por el contador SDS en ${etiqueta}. Clic en una barra para filtrar el detalle de abajo.`}
          right={
            areaSel ? (
              <button
                type="button"
                onClick={() => setAreaSel(null)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-mt-blue/30 bg-mt-blueTint text-mt-blue hover:bg-mt-blue hover:text-white transition-colors"
              >
                {titulo(areaSel)} · quitar filtro ✕
              </button>
            ) : (
              <Badge tone="azul">top {topAreasChart.length} de {rankingAreas.length}</Badge>
            )
          }
        >
          <div style={{ height: Math.max(220, topAreasChart.length * 30 + 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topAreasChart}
                layout="vertical"
                margin={{ top: 4, right: 78, left: 4, bottom: 4 }}
                className="cursor-pointer"
                onClick={(estado) => {
                  const clave = estado?.activePayload?.[0]?.payload?.clave
                  if (clave) alternarArea(clave)
                }}
              >
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="corto"
                  width={128}
                  tick={{ fontSize: 10, fill: C.text, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<TooltipBox titulo={(l, p) => titulo(p?.[0]?.payload?.clave ?? l)} />}
                  cursor={{ fill: 'rgba(0,102,255,0.06)' }}
                />
                <Bar dataKey="volumetria" name="Páginas" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {topAreasChart.map((a) => (
                    <Cell key={a.clave} fill={!areaSel || areaSel === a.clave ? C.blue : C.gray} />
                  ))}
                  <LabelList dataKey="volumetria" position="right" formatter={fInt} style={{ fontSize: 10, fill: C.text, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          className="xl:col-span-6"
          title={`Variación por ${dimActiva.l.toLowerCase()} vs periodo anterior`}
          subtitle={sinBase ? 'El periodo seleccionado no tiene un mes previo con el cual comparar' : `${etiqueta} contra ${etiquetaPrev}`}
          right={
            <div className="flex items-center bg-slate-100/90 rounded-full p-1 border border-slate-200 text-[11px]">
              {DIMENSIONES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDimension(o.id)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    dimension === o.id
                      ? 'bg-white text-mt-blue font-bold border border-slate-200/60 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          }
        >
          <Tabla
            maxAltura="392px"
            initialSort={{ key: 'volumetria', dir: 'desc' }}
            onFila={dimension === 'area' ? (r) => alternarArea(r.clave) : undefined}
            filaActiva={dimension === 'area' ? areaSel : undefined}
            columnas={[
              {
                key: 'clave',
                label: dimActiva.col,
                render: (r) =>
                  dimension === 'serie' ? (
                    <span className="block min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-slate-800">{r.clave}</span>
                      <span className="block text-[10px] text-slate-400 truncate max-w-[170px]">
                        {titulo(catSerie.get(r.clave)?.area ?? '—')}
                      </span>
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-800 truncate max-w-[170px] inline-block align-bottom">{titulo(r.clave)}</span>
                  )
              },
              { key: 'volumetria', label: 'Páginas', align: 'right', render: (r) => fInt(r.volumetria) },
              { key: 'volPrev', label: 'Periodo prev.', align: 'right', render: (r) => (sinBase ? '—' : fInt(r.volPrev)) },
              {
                key: 'pctVol',
                label: 'Var. vol.',
                align: 'right',
                sortValue: (r) => (Number.isFinite(r.pctVol) ? r.pctVol : -Infinity),
                render: (r) => <Var pct={r.pctVol} alta={r.alta} sinBase={sinBase} />
              },
              { key: 'facturacion', label: 'Costo', align: 'right', render: (r) => <strong className="text-slate-900">{fMoney(r.facturacion)}</strong> },
              {
                key: 'pctFact',
                label: 'Var. costo',
                align: 'right',
                sortValue: (r) => (Number.isFinite(r.pctFact) ? r.pctFact : -Infinity),
                render: (r) => <Var pct={r.pctFact} alta={r.alta} sinBase={sinBase} />
              }
            ]}
            filas={rankingDim.map((r) => ({ ...r, __key: r.clave }))}
            pie={{
              clave: `TOTAL · ${rankingDim.length}`,
              volumetria: fInt(rankingDim.reduce((a, b) => a + b.volumetria, 0)),
              volPrev: sinBase ? '—' : fInt(rankingDim.reduce((a, b) => a + b.volPrev, 0)),
              pctVol: sinBase ? '—' : fDelta(pct(m.volumetria, mPrev.volumetria), 1),
              facturacion: fMoney(rankingDim.reduce((a, b) => a + b.facturacion, 0)),
              pctFact: sinBase ? '—' : fDelta(pct(m.facturacion, mPrev.facturacion), 1)
            }}
          />
        </Card>
      </section>


      {/* Evolución de lo que este seleccionado en el ranking de arriba. */}
      <HistoricoLinea
        mensual={mensualArea}
        periodoActivo={filtros.periodo}
        esAcumulado={esAcumulado}
        title={rutaEvolutivo.length ? `Evolución de ${rutaEvolutivo.join(' › ')}` : 'Evolución del contrato'}
        subtitle={
          areaSel
            ? 'Consumo mes a mes de esta área dentro de la gerencia elegida. Quitá el área para ver la gerencia completa.'
            : gerenciaActiva
              ? 'Consumo mes a mes de esta gerencia. Elegí un área en el ranking de abajo para bajar un nivel más.'
              : 'Consolidado de todas las gerencias. Clic en una barra del gráfico de gerencias para bajar un nivel.'
        }
        etiqueta={rutaEvolutivo.length ? rutaEvolutivo[rutaEvolutivo.length - 1] : 'todo el contrato'}
        vacio="No hay consumo registrado en ningún periodo para esta selección."
      />

      {/* 6 · Usuarios: top general, o solo los del área elegida arriba. */}
      <Card
        title={areaElegida ? `Usuarios de ${titulo(areaElegida.area)}` : 'Consumo por usuario · ranking general'}
        subtitle={
          areaElegida
            ? 'Solo los usuarios que imprimieron en las impresoras de esta área. Clic en una fila para ver el detalle de sus trabajos.'
            : 'Quién concentra el volumen facturado. Clic en una fila para ver el detalle de sus trabajos.'
        }
        right={
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar usuario o cuenta…" />
            {areaSel ? (
              <button
                type="button"
                onClick={() => setAreaSel(null)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-mt-blue/30 bg-mt-blueTint text-mt-blue hover:bg-mt-blue hover:text-white transition-colors"
              >
                {titulo(areaSel)} · ver todos ✕
              </button>
            ) : (
              <Badge tone="azul">{fInt(personasAtribuidas)} usuarios</Badge>
            )}
          </div>
        }
      >
        <Tabla
          maxAltura="420px"
          initialSort={{ key: 'total', dir: 'desc' }}
          onFila={(r) => (r.usuario === SIN_AUDITORIA ? null : abrirUsuario(r))}
          filaActiva={usuarioModal?.usuario}
          vacio={busqueda ? `Ningún usuario coincide con «${busqueda}».` : 'Sin usuarios para los filtros aplicados.'}
          columnas={[
            {
              key: 'nombre',
              label: 'Usuario',
              render: (r) => (
                <span
                  className={`truncate max-w-[240px] inline-block align-bottom ${
                    r.usuario === SIN_AUDITORIA ? 'font-semibold text-amber-700 italic' : 'font-semibold text-slate-800'
                  }`}
                >
                  {nombreUsuario(r)}
                </span>
              )
            },
            {
              key: 'usuario',
              label: 'Cuenta',
              render: (r) => (
                <span className="text-slate-400 truncate max-w-[150px] inline-block align-bottom">
                  {r.usuario === SIN_AUDITORIA ? 'sin registro NDD' : r.usuario}
                </span>
              )
            },
            ...(areaElegida
              ? []
              : [
                  {
                    key: 'areas',
                    label: 'Áreas',
                    sortValue: (r) => r.areas.length,
                    render: (r) => (
                      <span className="text-slate-500 truncate max-w-[220px] inline-block align-bottom">{r.areas.map(titulo).join(' · ')}</span>
                    )
                  }
                ]),
            { key: 'jobs', label: 'Trabajos', align: 'right', render: (r) => (r.usuario === SIN_AUDITORIA ? '—' : fInt(r.jobs)) },
            { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
            { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
            { key: 'total', label: 'Págs', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.total)}</strong> },
            { key: 'pctTotal', label: '% del total', align: 'right', sortValue: (r) => r.total, render: (r) => fPct(totalBase ? r.total / totalBase : 0) },
            { key: 'costo', label: 'Costo', align: 'right', render: (r) => <span className="font-semibold text-mt-blue">{fMoney(r.costo)}</span> }
          ]}
          filas={usuariosTabla.slice(0, 50)}
          pie={{
            nombre: filtrando
              ? `FILTRADO · ${usuariosTabla.length} de ${usuariosBase.length} usuarios`
              : `TOTAL · ${usuariosBase.length} usuarios`,
            jobs: fInt(usuariosTabla.reduce((a, b) => a + b.jobs, 0)),
            mono: fInt(usuariosTabla.reduce((a, b) => a + b.mono, 0)),
            color: fInt(usuariosTabla.reduce((a, b) => a + b.color, 0)),
            total: fInt(totalTabla),
            pctTotal: fPct(totalBase ? totalTabla / totalBase : 0),
            costo: fMoney(usuariosTabla.reduce((a, b) => a + b.costo, 0))
          }}
        />
        <Nota tono={esGerencia ? 'azul' : 'ok'} titulo={esGerencia ? 'Alcance de este total' : 'Este total sí es la factura'} icono="▸">
          {esGerencia ? (
            <>
              Son <strong className="num">{fInt(totalBase)}</strong> páginas atribuidas a las personas de{' '}
              <strong>{alcance.etiqueta.replace('Gerencia · ', '')}</strong>
              {areaElegida ? ` en ${titulo(areaElegida.area)}` : ''}, sobre el volumen que factura el contador SDS. Es una parte de la
              factura total del contrato, no la factura completa: el resto corresponde a otras gerencias, a impresoras sin registro NDD y
              al cargo fijo del parque.
            </>
          ) : (
            <>
          El reparto suma <strong className="num">{fInt(totalBase)}</strong> páginas
          {areaElegida ? ` en ${titulo(areaElegida.area)}` : ''}, exactamente el volumen del contador SDS
          {areaElegida ? '' : <> de {etiqueta} (<strong className="num">{fInt(m.volumetria)}</strong> págs)</>}. NDD ya no aporta el
              número: aporta solo la proporción con la que se reparte.
            </>
          )}
        </Nota>
      </Card>

      {usuarioModal && (
        <ModalTrabajos
          usuario={usuarioModal}
          trabajos={trabajosModal}
          alcance={alcanceModal}
          busqueda={busquedaTrabajo}
          onBusqueda={setBusquedaTrabajo}
          onCerrar={() => setUsuarioModal(null)}
        />
      )}
    </>
  )
}
