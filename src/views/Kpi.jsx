import React, { useCallback, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts'
import { Card, Kpi as Tile, Tabla, Badge, Delta, TooltipBox, Nota, Fuente, Buscador, normaliza } from '../components/ui.jsx'
import PanelAreas from '../components/PanelAreas.jsx'
import HistoricoLinea from '../components/HistoricoLinea.jsx'
import TopRanking, { armarTop } from '../components/TopRanking.jsx'
import { C, CAT } from '../lib/palette.js'
import { filtrar, medidas, comparar, periodoPrevio, serieMensual } from '../lib/measures.js'
import { prorratear, agruparPorUsuario, trabajosProrrateados, SIN_AUDITORIA } from '../lib/prorrateo.js'
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
  { id: 'area', l: 'Área', col: 'Área' },
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
    ndd, catalogoSeries, periodosSel, atribucion, areasAtribuidas, usuariosAtribuidos, sinAuditoria
  } = ctx


  const previo = useMemo(() => periodoPrevio(periodos, filtros.periodo), [periodos, filtros.periodo])
  const rowsActual = useMemo(() => filtrar(contador, filtros), [contador, filtros])
  const rowsPrevio = useMemo(
    () => (previo ? filtrar(contador, { ...filtros, periodo: previo.key }) : []),
    [contador, filtros, previo]
  )
  const mPrev = useMemo(() => medidas(rowsPrevio, tarifas), [rowsPrevio, tarifas])

  const sinBase = !previo || rowsPrevio.length === 0
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
      detalle: `${fTarifa(tarifas.colorA3)} · solo ${tarifas.serieA3}`,
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
  const rankingDim = useMemo(() => {
    const r = comparar(rowsActual, rowsPrevio, dimension, tarifas)
    return dimension === 'serie' ? r.filter((x) => x.volumetria > 0 || x.volPrev > 0) : r
  }, [rowsActual, rowsPrevio, dimension, tarifas])
  const rankingAreas = useMemo(() => comparar(rowsActual, rowsPrevio, 'area', tarifas), [rowsActual, rowsPrevio, tarifas])
  const catSerie = useMemo(() => new Map(catalogoSeries.map((c) => [c.serie, c])), [catalogoSeries])


  // Area seleccionada: la eligen tanto el top 5 como el grafico de ranking, y
  // filtra la tabla de usuarios y el panel de detalle.
  const [areaSel, setAreaSel] = useState(null)
  const alternarArea = useCallback((a) => setAreaSel((prev) => (prev === a ? null : a)), [])


  // Reparto del periodo anterior, necesario para la variacion del top de usuarios.
  const usuariosPrev = useMemo(() => {
    if (!previo) return []
    const res = prorratear({
      contador,
      porSerieUsuario: ndd.porSerieUsuario,
      catalogoSeries,
      periodosSel: [previo.key],
      tarifas,
      filtros: { ...filtros, periodo: previo.key },
      periodos
    })
    return agruparPorUsuario(res, tarifas)
  }, [previo, contador, ndd.porSerieUsuario, catalogoSeries, tarifas, filtros])

  const mapaUsuariosPrev = useMemo(() => new Map(usuariosPrev.map((u) => [u.usuario, u])), [usuariosPrev])


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
    const mapaActual = new Map(usuariosAtribuidos.map((u) => [u.usuario, u]))
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
  }, [usuariosAtribuidos, mapaUsuariosPrev])

  const personasAtribuidas = useMemo(
    () => usuariosAtribuidos.filter((u) => u.usuario !== SIN_AUDITORIA).length,
    [usuariosAtribuidos]
  )


  const topAreasChart = rankingAreas
    .filter((a) => a.volumetria > 0)
    .slice(0, 12)
    .map((a) => ({ ...a, corto: recorta(a.clave) }))


  // Tabla de usuarios: general, o solo los del area elegida.
  const areaElegida = useMemo(
    () => (areaSel ? areasAtribuidas.find((a) => a.area === areaSel) ?? null : null),
    [areaSel, areasAtribuidas]
  )
  // Base de la tabla: el ranking general, o solo el area elegida arriba.
  const usuariosBase = areaElegida ? areaElegida.usuarios : usuariosAtribuidos
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
  const mensualArea = useMemo(() => {
    const rows = areaSel ? rowsTodoPeriodo.filter((r) => r.area === areaSel) : rowsTodoPeriodo
    return serieMensual(rows, periodos, tarifas)
  }, [areaSel, rowsTodoPeriodo, periodos, tarifas])

  const trabajosDe = useCallback(
    (area, usuario) => trabajosProrrateados(atribucion, ndd.porTrabajo, area, usuario, periodosSel, tarifas),
    [atribucion, ndd.porTrabajo, periodosSel, tarifas]
  )

  const fueraContrato = atribucion.fueraContrato
  const totalFuera = fueraContrato.reduce((a, b) => a + b.total, 0)

  return (
    <>

      <Fuente
        tono="sds"
        titulo="Facturación · contador SDS"
        descripcion="Volumetría y costos que se cobran en el contrato. Todo este tablero toma el contador SDS como el 100%."
        etiqueta="Fuente SDS"
      />

      {/* 1 · Evolución histórica, con pestaña volumetría / facturación. */}
      <HistoricoLinea mensual={mensual} periodoActivo={filtros.periodo} esAcumulado={esAcumulado} />

      {/* 2 · KPIs del periodo. */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <Tile
          destacado
          icon={<Icono d={IC.dinero} />}
          label={`Costo total ${esAcumulado ? 'acumulado' : (actual?.label ?? '')}`}
          value={fMoney(m.facturacion)}
          foot={
            sinBase ? (
              <span className="text-[10px] text-white/80 font-medium">clic + cargo fijo</span>
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
        <Tile
          icon={<Icono d={IC.escudo} />}
          label="Cargo fijo"
          value={fMoney(m.cargoFijo)}
          foot={<span className="text-[10px] text-slate-400 font-medium">{fPct(m.pctCargoFijo)} de la factura</span>}
        />
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
        <strong className="font-mono">{tarifas.serieA3}</strong> concentra <strong className="num">{fMoney(m.clicColorA3)}</strong> con solo{' '}
        {fInt(m.volColorA3)} páginas por la tarifa A3 de {fTarifa(tarifas.colorA3)}.
      </Nota>

      {/* 4 · Los dos top 5, con variación de consumo y de puesto. */}
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
        title={areaSel ? `Evolución de ${titulo(areaSel)}` : 'Evolución por área'}
        subtitle={
          areaSel
            ? `Cómo viene consumiendo esta área mes a mes. Clic en otra barra del ranking de arriba para cambiarla, o en la misma para volver al consolidado.`
            : 'Consolidado de todas las áreas. Clic en una barra del ranking de arriba para ver la evolución de un área concreta.'
        }
        etiqueta={areaSel ? titulo(areaSel) : 'todas las áreas'}
        vacio="Esta área no registra consumo en ningún periodo."
      />

      {/* 6 · Usuarios: top general, o solo los del área elegida arriba. */}
      <Card
        title={areaElegida ? `Usuarios de ${titulo(areaElegida.area)}` : 'Consumo por usuario · ranking general'}
        subtitle={
          areaElegida
            ? 'Solo los usuarios que imprimieron en las impresoras de esta área. Quita el filtro para volver al ranking general.'
            : 'Quién concentra el volumen facturado, en qué áreas y cuánto representa ese consumo'
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
        <Nota tono="ok" titulo="Este total sí es la factura" icono="▸">
          El reparto suma <strong className="num">{fInt(totalBase)}</strong> páginas
          {areaElegida ? ` en ${titulo(areaElegida.area)}` : ''}, exactamente el volumen del contador SDS
          {areaElegida ? '' : <> de {etiqueta} (<strong className="num">{fInt(m.volumetria)}</strong> págs)</>}. NDD ya no aporta el
          número: aporta solo la proporción con la que se reparte.
        </Nota>
      </Card>

      {/* 7 · Detalle área → usuario → trabajo, gobernado por la misma selección. */}
      <PanelAreas
        areas={areasAtribuidas}
        trabajosDe={trabajosDe}
        tarifas={tarifas}
        area={areaSel}
        onArea={alternarArea}
        mostrarRanking={false}
        sinAuditoriaTotal={sinAuditoria}
      />

      {/* 8 · Lo que NDD ve fuera del contrato: no se factura, va aparte. */}
      {fueraContrato.length > 0 && (
        <Card
          title="Impresoras fuera del contrato"
          subtitle="NDD registra actividad en estas series, pero no están en el contador SDS: no se facturan y no entran en ningún reparto"
          right={<Badge tone="aviso">{fueraContrato.length} series · no facturable</Badge>}
        >
          <Tabla
            maxAltura="280px"
            initialSort={{ key: 'total', dir: 'desc' }}
            columnas={[
              { key: 'serie', label: 'Serie', render: (r) => <span className="font-mono text-[11px] font-semibold text-slate-800">{r.serie}</span> },
              {
                key: 'usuarios',
                label: 'Usuarios',
                sortValue: (r) => r.usuarios.length,
                render: (r) => (
                  <span className="text-slate-500 truncate max-w-[260px] inline-block align-bottom">
                    {r.usuarios.slice(0, 3).map((u) => (u.nombre && u.nombre !== '-' ? u.nombre : u.usuario)).join(' · ')}
                    {r.usuarios.length > 3 ? ` +${r.usuarios.length - 3}` : ''}
                  </span>
                )
              },
              { key: 'jobs', label: 'Trabajos', align: 'right', render: (r) => fInt(r.jobs) },
              { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
              { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
              { key: 'total', label: 'Págs NDD', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.total)}</strong> },
              { key: 'costo', label: 'Costo referencial', align: 'right', render: (r) => <span className="text-slate-500">{fMoney(r.costo)}</span> }
            ]}
            filas={fueraContrato}
            pie={{
              serie: `TOTAL · ${fueraContrato.length} series`,
              jobs: fInt(fueraContrato.reduce((a, b) => a + b.jobs, 0)),
              mono: fInt(fueraContrato.reduce((a, b) => a + b.mono, 0)),
              color: fInt(fueraContrato.reduce((a, b) => a + b.color, 0)),
              total: fInt(totalFuera),
              costo: fMoney(fueraContrato.reduce((a, b) => a + b.costo, 0))
            }}
          />
          <Nota tono="aviso" titulo="Por qué están fuera del reparto" icono="▸">
            Estas <strong className="num">{fInt(totalFuera)}</strong> páginas no tienen contador SDS contra el cual prorratearse, así que no
            forman parte de la factura ni del ranking de áreas. El costo mostrado es solo referencial, valorizado a tarifa de contrato para
            dimensionar el consumo que queda fuera del MPS.
          </Nota>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-3">
        <Nota tono="neutro" titulo="Cómo leer este tablero" icono="▸">
          El contador <strong>SDS es el 100%</strong> y es lo que se factura. NDD no aporta volumen: aporta el patrón de uso que permite
          repartir ese volumen entre áreas, usuarios y trabajos. B/N y color se reparten por separado, porque casi nunca tienen el mismo
          factor. Cuando una impresora factura pero NDD no la registró, esas páginas se marcan como <strong>sin auditoría</strong> en vez de
          repartirse a ciegas.
        </Nota>
      </section>
    </>
  )
}
