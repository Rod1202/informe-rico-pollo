import React, { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts'
import { Card, Kpi as Tile, Tabla, Badge, Delta, Leyenda, TooltipBox, Nota, Fuente } from '../components/ui.jsx'
import PanelAreas from '../components/PanelAreas.jsx'
import { C, CAT } from '../lib/palette.js'
import { filtrar, medidas, comparar, periodoPrevio, nddPorArea } from '../lib/measures.js'
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

export default function Kpi({ ctx }) {
  const {
    m, mensual, actual, esAcumulado, contador, tarifas, periodos, filtros,
    ndd, catalogoSeries, periodosSel, meta, auditoria
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

  
  const desglose = [
    {
      tipo: 'Monocromo (B/N)',
      detalle: `${fTarifa(tarifas.bn)} por página`,
      pags: m.volBN, costo: m.clicBN, pagsPrev: mPrev.volBN, costoPrev: mPrev.clicBN,
      color: CAT[0]
    },
    {
      tipo: 'Color estándar',
      detalle: `${fTarifa(tarifas.color)} por página`,
      pags: m.volColorStd, costo: m.clicColorStd, pagsPrev: mPrev.volColorStd, costoPrev: mPrev.clicColorStd,
      color: CAT[2]
    },
    {
      tipo: 'Color A3 adicional',
      detalle: `${fTarifa(tarifas.colorA3)} · solo ${tarifas.serieA3}`,
      pags: m.volColorA3, costo: m.clicColorA3, pagsPrev: mPrev.volColorA3, costoPrev: mPrev.clicColorA3,
      color: CAT[3]
    }
  ].map((d) => ({
    ...d,
    __key: d.tipo,
    pctPags: m.volumetria ? d.pags / m.volumetria : 0,
    pctCosto: m.clicVariable ? d.costo / m.clicVariable : 0,
    varCosto: pct(d.costo, d.costoPrev)
  }))

  
  const meses = mensual.serie
    .filter((s) => s.tiene)
    .map((s) => ({
      label: s.label,
      volBN: s.volBN,
      volColor: s.volColor,
      total: s.volumetria,
      costoBN: +s.clicBN.toFixed(2),
      costoColor: +s.clicColor.toFixed(2),
      costoClic: +s.clicVariable.toFixed(2)
    }))

  
  const [dimension, setDimension] = useState('area')
  const dimActiva = DIMENSIONES.find((d) => d.id === dimension) ?? DIMENSIONES[0]
  const rankingDim = useMemo(() => {
    const r = comparar(rowsActual, rowsPrevio, dimension, tarifas)
    
    return dimension === 'serie' ? r.filter((x) => x.volumetria > 0 || x.volPrev > 0) : r
  }, [rowsActual, rowsPrevio, dimension, tarifas])
  const rankingAreas = useMemo(() => comparar(rowsActual, rowsPrevio, 'area', tarifas), [rowsActual, rowsPrevio, tarifas])
  const catSerie = useMemo(() => new Map(catalogoSeries.map((c) => [c.serie, c])), [catalogoSeries])

  const topAreasChart = rankingAreas
    .filter((a) => a.volumetria > 0)
    .slice(0, 12)
    .map((a) => ({ ...a, corto: recorta(a.clave) }))

  
  const areasNdd = useMemo(
    () => nddPorArea(ndd.porSerieUsuario, catalogoSeries, periodosSel, tarifas, filtros),
    [ndd.porSerieUsuario, catalogoSeries, periodosSel, tarifas, filtros]
  )
  const usuariosRank = useMemo(() => {
    const g = new Map()
    for (const a of areasNdd) {
      for (const u of a.usuarios) {
        const o = g.get(u.usuario) ?? { usuario: u.usuario, nombre: u.nombre, mono: 0, color: 0, total: 0, jobs: 0, costo: 0, areas: new Set() }
        o.mono += u.mono
        o.color += u.color
        o.total += u.total
        o.jobs += u.jobs
        o.costo += u.costo
        o.areas.add(a.area)
        if (o.nombre === '-' && u.nombre !== '-') o.nombre = u.nombre
        g.set(u.usuario, o)
      }
    }
    return [...g.values()]
      .map((o) => ({ ...o, areas: [...o.areas], __key: o.usuario }))
      .sort((a, b) => b.total - a.total)
  }, [areasNdd])

  const totalNdd = usuariosRank.reduce((a, b) => a + b.total, 0)

  return (
    <>
      
      <Fuente
        tono="sds"
        titulo="Facturación · contador SDS"
        descripcion="Volumetría y costos que se cobran en el contrato. Todo lo de este bloque es la factura."
        etiqueta="Fuente SDS"
      />

      
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

      
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card
          className="xl:col-span-5"
          title="Impresiones B/N y color"
          subtitle="Volumetría, participación y costo del clic en el periodo"
          right={sinBase ? <Badge tone="neutro">sin mes previo</Badge> : <Badge tone="azul">vs {etiquetaPrev}</Badge>}
        >
          <Tabla
            initialSort={{ key: 'costo', dir: 'desc' }}
            columnas={[
              {
                key: 'tipo',
                label: 'Tipo de impresión',
                render: (r) => (
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-6 rounded-full shrink-0" style={{ background: r.color }} />
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-800 leading-tight">{r.tipo}</span>
                      <span className="block text-[10px] text-slate-400 leading-tight">{r.detalle}</span>
                    </span>
                  </span>
                )
              },
              { key: 'pags', label: 'Páginas', align: 'right', render: (r) => fInt(r.pags) },
              { key: 'pctPags', label: '% vol.', align: 'right', render: (r) => fPct(r.pctPags) },
              { key: 'costo', label: 'Costo', align: 'right', render: (r) => <strong className="text-slate-900">{fMoney(r.costo)}</strong> },
              { key: 'pctCosto', label: '% costo', align: 'right', render: (r) => fPct(r.pctCosto) },
              { key: 'varCosto', label: 'Var. costo', align: 'right', render: (r) => <Var pct={r.varCosto} sinBase={sinBase} /> }
            ]}
            filas={desglose}
            pie={{
              tipo: 'TOTAL CLIC VARIABLE',
              pags: fInt(m.volumetria),
              pctPags: '100.0%',
              costo: fMoney(m.clicVariable),
              pctCosto: '100.0%',
              varCosto: sinBase ? '—' : fDelta(pct(m.clicVariable, mPrev.clicVariable), 1)
            }}
          />
          <Nota tono="aviso" titulo="Peso real del color" icono="▸">
            El color es el <strong className="num">{fPct(m.pctVolColor)}</strong> del volumen pero el{' '}
            <strong className="num">{fPct(m.clicVariable ? m.clicColor / m.clicVariable : 0)}</strong> del clic. La serie{' '}
            <strong className="font-mono">{tarifas.serieA3}</strong> concentra <strong className="num">{fMoney(m.clicColorA3)}</strong> con
            solo {fInt(m.volColorA3)} páginas por la tarifa A3 de {fTarifa(tarifas.colorA3)}.
          </Nota>
        </Card>

        <Card
          className="xl:col-span-7"
          title="Consolidado mensual · B/N vs color"
          subtitle="Volumetría y costo del clic mes a mes"
          right={<Badge tone="azul">{meses.length} meses</Badge>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Volumetría (páginas)</p>
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={meses} margin={{ top: 16, right: 6, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={46} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
                    <Bar dataKey="volBN" name="B/N" stackId="v" fill={CAT[0]} maxBarSize={44} />
                    <Bar dataKey="volColor" name="Color" stackId="v" fill={CAT[3]} maxBarSize={44} radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="total" position="top" formatter={fCompact} style={{ fontSize: 9, fill: C.textMuted, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Costo del clic (US$)</p>
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={meses} margin={{ top: 16, right: 6, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: C.axis }} tickFormatter={(v) => `$${fCompact(v)}`} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<TooltipBox formato={fMoney} />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
                    <Bar dataKey="costoBN" name="Clic B/N" stackId="c" fill={CAT[0]} maxBarSize={44} />
                    <Bar dataKey="costoColor" name="Clic color" stackId="c" fill={CAT[3]} maxBarSize={44} radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="costoClic"
                        position="top"
                        formatter={(v) => `$${fCompact(v)}`}
                        style={{ fontSize: 9, fill: C.textMuted, fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <Leyenda
            className="mt-2 justify-center"
            items={[{ label: 'Monocromo (B/N)', color: CAT[0] }, { label: 'Color', color: CAT[3] }]}
          />
        </Card>
      </section>

      
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card
          className="xl:col-span-6"
          title="Consumo por área · ranking"
          subtitle={`Páginas facturadas por el contador SDS en ${etiqueta}`}
          right={<Badge tone="azul">top {topAreasChart.length} de {rankingAreas.length}</Badge>}
        >
          <div style={{ height: Math.max(220, topAreasChart.length * 30 + 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAreasChart} layout="vertical" margin={{ top: 4, right: 78, left: 4, bottom: 4 }}>
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
                <Bar dataKey="volumetria" name="Páginas" fill={C.blue} radius={[0, 4, 4, 0]} maxBarSize={20}>
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

      
      <Fuente
        tono="ndd"
        titulo="Atribución de consumo · auditoría NDD"
        descripcion={`Quién imprime y qué imprime. NDD cuenta páginas enviadas a la cola, siempre más que el contador, así que estos totales no son la factura: valorizan el gasto para poder atribuirlo (${fInt(meta.statsNDD.trabajos)} trabajos).`}
        etiqueta="Fuente NDD"
      />

      <Card
        title="Consumo por usuario · ranking"
        subtitle="Quién imprime más, en qué áreas y cuánto representa ese consumo"
        right={<Badge tone="aviso">{fInt(usuariosRank.length)} usuarios</Badge>}
      >
        <Tabla
          maxAltura="420px"
          initialSort={{ key: 'total', dir: 'desc' }}
          columnas={[
            {
              key: 'nombre',
              label: 'Usuario',
              render: (r) => (
                <span className="font-semibold text-slate-800 truncate max-w-[240px] inline-block align-bottom">
                  {r.nombre && r.nombre !== '-' ? r.nombre : r.usuario}
                </span>
              )
            },
            { key: 'usuario', label: 'Cuenta', render: (r) => <span className="text-slate-400 truncate max-w-[150px] inline-block align-bottom">{r.usuario}</span> },
            {
              key: 'areas',
              label: 'Áreas',
              sortValue: (r) => r.areas.length,
              render: (r) => <span className="text-slate-500 truncate max-w-[220px] inline-block align-bottom">{r.areas.map(titulo).join(' · ')}</span>
            },
            { key: 'jobs', label: 'Trabajos', align: 'right', render: (r) => fInt(r.jobs) },
            { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
            { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
            { key: 'total', label: 'Págs', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.total)}</strong> },
            { key: 'pctTotal', label: '% del total', align: 'right', sortValue: (r) => r.total, render: (r) => fPct(totalNdd ? r.total / totalNdd : 0) },
            { key: 'costo', label: 'Costo', align: 'right', render: (r) => <span className="font-semibold text-mt-blue">{fMoney(r.costo)}</span> }
          ]}
          filas={usuariosRank.slice(0, 50)}
          pie={{
            nombre: `TOTAL · ${usuariosRank.length} usuarios`,
            jobs: fInt(usuariosRank.reduce((a, b) => a + b.jobs, 0)),
            mono: fInt(usuariosRank.reduce((a, b) => a + b.mono, 0)),
            color: fInt(usuariosRank.reduce((a, b) => a + b.color, 0)),
            total: fInt(totalNdd),
            pctTotal: '100.0%',
            costo: fMoney(usuariosRank.reduce((a, b) => a + b.costo, 0))
          }}
        />
        <Nota tono="aviso" titulo="No comparar este total con la factura" icono="▸">
          NDD registra las páginas que se envían a la cola de impresión, siempre más que las que llega a contar el equipo, así que este
          total supera al clic facturado de {fMoney(m.clicVariable)}. Sirve para saber <strong>quién</strong> genera el gasto, no cuánto
          se cobra.
        </Nota>
      </Card>

      
      <PanelAreas
        ndd={ndd}
        catalogoSeries={catalogoSeries}
        periodosSel={periodosSel}
        tarifas={tarifas}
        filtros={filtros}
        brecha={auditoria?.totales?.brecha ?? null}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Nota tono="ok" titulo="Costo total de impresión" icono="▸">
          <strong className="num">{fMoney(m.facturacion)}</strong> en {etiqueta}: {fMoney(m.clicVariable)} de clic variable más{' '}
          {fMoney(m.cargoFijo)} de cargo fijo por {m.equiposTotales} equipos. Costo por página{' '}
          <strong className="num">{fMoney(m.costoPagina)}</strong>.
        </Nota>
        <Nota tono="azul" titulo="Tarifas aplicadas" icono="▸">
          B/N {fTarifa(tarifas.bn)} · color {fTarifa(tarifas.color)} · adicional A3 {fTarifa(tarifas.colorA3)}, este último solo sobre las
          páginas color de la serie <strong className="font-mono">{tarifas.serieA3}</strong>; su monocromo va a la tarifa B/N normal.
        </Nota>
        <Nota tono="neutro" titulo="Qué mide cada bloque" icono="▸">
          El bloque azul sale del contador SDS y es lo que se factura. El bloque ámbar sale de NDD, única fuente que identifica quién
          imprimió, y sirve para atribuir el gasto a cada área y usuario.
        </Nota>
      </section>
    </>
  )
}
