import React, { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, ComposedChart, Line, ReferenceLine, LabelList, Cell
} from 'recharts'
import { Card, Kpi, Ring, Barra, Delta, Leyenda, TooltipBox, Nota, Semaforo, Badge } from '../components/ui.jsx'
import { C, CAT, ESTADO } from '../lib/palette.js'
import { agrupar, nddAgrupar, medidas } from '../lib/measures.js'
import { filtrar } from '../lib/measures.js'
import { fInt, fMoney, fTarifa, fPct, fDelta, fCompact, fFecha, titulo } from '../lib/format.js'

const IC = {
  dinero: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  hoja: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  clic: 'M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5',
  escudo: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
}
const Icono = ({ d }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const EtiquetaDesv = ({ x, y, width, height, value }) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const arriba = value >= 0
  const borde = arriba ? Math.min(y, y + height) - 5 : Math.max(y, y + height) + 13
  return (
    <text x={x + width / 2} y={borde} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: C.text }}>
      {fDelta(value, 1)}
    </text>
  )
}

function Desviacion({ titulo, referencia, datos, clave }) {
  const valores = datos.map((d) => d[clave]).filter((v) => Number.isFinite(v))
  if (!valores.length) {
    return (
      <div>
        <p className="text-[10px] font-bold text-slate-700 leading-tight">{titulo}</p>
        <p className="text-[10px] text-slate-400 text-center py-10">Sin meses comparables.</p>
      </div>
    )
  }

  const tope = Math.max(...valores.map(Math.abs)) * 1.5 || 0.1

  return (
    <div>
      <p className="text-[10px] font-bold text-slate-700 leading-tight">{titulo}</p>
      <p className="text-[9px] text-slate-400 num leading-tight">prom. {referencia}</p>
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <YAxis hide domain={[-tope, tope]} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipBox formato={(v) => fDelta(v, 1)} />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
            <ReferenceLine y={0} stroke={C.ink} strokeWidth={1.5} />
            <Bar dataKey={clave} name={`${titulo} vs promedio`} maxBarSize={34}>
              {datos.map((d) => (
                <Cell key={d.label} fill={d.sel ? C.blue : C.gray} radius={(d[clave] ?? 0) >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]} />
              ))}
              <LabelList dataKey={clave} content={<EtiquetaDesv />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function Resumen({ ctx }) {
  const { m, mensual, actual, periodos, tarifas, contador, filtros, ndd, periodosSel, esAcumulado } = ctx

  const sedes = useMemo(() => {
    const base = filtrar(contador, { ...filtros, sede: 'TODAS' })
    const actualSedes = agrupar(base, 'sede', tarifas)
    const todo = filtrar(contador, { ...filtros, sede: 'TODAS', periodo: 'TODOS' })
    return actualSedes.map((s) => ({
      ...s,
      tendencia: periodos.map((p) => {
        const rs = todo.filter((r) => r.sede === s.clave && r.periodo === p.key)
        const mm = medidas(rs, tarifas)
        return { label: p.label, vol: mm.volumetria, fact: mm.facturacion }
      })
    }))
  }, [contador, filtros, tarifas, periodos])

  const diario = useMemo(
    () => ndd.porDia.filter((d) => periodosSel.includes(d.periodo)).map((d) => ({ ...d, dia: Number(d.fecha.slice(8)) })),
    [ndd.porDia, periodosSel]
  )
  const picos = useMemo(() => [...diario].sort((a, b) => b.total - a.total).slice(0, 2), [diario])

  const serieMeses = mensual.serie.filter((s) => s.tiene)

  const desviacion = serieMeses.map((s) => ({
    label: s.label,
    vol: s.pctVarVsPromVolumetria,
    fact: s.pctVarVsPromFacturacion,
    sel: esAcumulado || s.periodo === filtros.periodo
  }))
  const datosFact = serieMeses.map((s) => ({
    label: s.label,
    clic: +s.clicVariable.toFixed(2),
    fijo: +s.cargoFijo.toFixed(2),
    total: s.facturacion
  }))
  const datosVol = serieMeses.map((s) => ({
    label: s.label,
    vol: s.volumetria,
    promedio: Math.round(mensual.promedioVolumetria)
  }))

  const cardEtiqueta = esAcumulado ? 'Acumulado' : (actual?.label ?? '').toUpperCase()
  const mesCorto = esAcumulado ? 'acumulada' : (actual?.label ?? '').split('-')[0]

  const tarifasClic = [
    { label: 'Clic B/N', detalle: 'Toda impresión monocroma del parque', tarifa: tarifas.bn, paginas: m.volBN, importe: m.clicBN, color: CAT[0] },
    { label: 'Clic color', detalle: 'Color en los equipos del parque estándar', tarifa: tarifas.color, paginas: m.volColorStd, importe: m.clicColorStd, color: CAT[1] },
    { label: 'Clic adicional A3', detalle: `Solo color de la serie ${tarifas.serieA3}`, tarifa: tarifas.colorA3, paginas: m.volColorA3, importe: m.clicColorA3, color: CAT[3] }
  ]

  return (
    <>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi
              destacado
              icon={<Icono d={IC.dinero} />}
              label={`Facturación ${mesCorto}`}
              value={fMoney(m.facturacion)}
              foot={esAcumulado ? <span className="text-[10px] text-white/80 font-medium">{mensual.mesesEvaluados} meses</span> : <Delta value={actual?.pctVarFacturacionMoM} />}
            />
            <Kpi
              icon={<Icono d={IC.hoja} />}
              label="Volumetría"
              value={fInt(m.volumetria)}
              foot={esAcumulado ? <span className="text-[10px] text-slate-400 font-medium">páginas</span> : <Delta value={actual?.pctVarVolumetriaMoM} />}
            />
            <Kpi
              icon={<Icono d={IC.clic} />}
              label="Clic variable"
              value={fMoney(m.clicVariable)}
              foot={<span className="text-[10px] text-slate-400 font-medium">B/N + Color</span>}
            />
            <Kpi
              icon={<Icono d={IC.escudo} />}
              label="Cargo fijo"
              value={fMoney(m.cargoFijo)}
              foot={<span className="text-[10px] text-slate-400 font-medium">{fPct(m.pctCargoFijo)} de la factura</span>}
            />
          </div>

          <Card
            title="Distribución de consumo"
            subtitle="Volumen monocromo vs color y estructura de la facturación"
            className="!p-5"
            right={<Badge tone="azul">{esAcumulado ? 'jun–ago 2026' : actual?.largo}</Badge>}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="space-y-2 min-w-[190px]">
                <div className="pb-2 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-700">
                    Cargo fijo / total factura: <span className="text-mt-blue font-bold num">{fPct(m.pctCargoFijo)}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">El clic variable representa el {fPct(1 - m.pctCargoFijo)} restante</p>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  El color es el <strong className="text-slate-700 num">{fPct(m.pctVolColor)}</strong> del volumen pero el{' '}
                  <strong className="text-slate-700 num">{fPct(m.pctFactColor)}</strong> del clic facturado.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
                <Ring value={m.pctVolBN} label="Vol B/N" color={CAT[0]} />
                <Ring value={m.pctVolColor} label="Vol Color" color={CAT[1]} />
                <Ring value={m.pctCargoFijo} label="Cargo fijo" color={CAT[3]} />
                <Ring value={1 - m.pctCargoFijo} label="Fact. clic" color={CAT[2]} />
                <Ring value={m.pctEquiposActivos} label="Equipos activos" color={ESTADO.ok} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="xl:col-span-5" title="Cumplimiento del parque" subtitle="Contra el contrato y el promedio del periodo">
          <Barra
            label="Parque operativo activo"
            right={`${m.equiposActivos} de ${m.equiposTotales} equipos (${fPct(m.pctEquiposActivos)})`}
            value={m.pctEquiposActivos}
            color={C.blue}
          />

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold text-slate-700 uppercase">¿Superó el promedio del periodo?</span>
              <span className="text-[9px] text-slate-400 font-medium">la línea 0% es el promedio</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Desviacion
                titulo="Volumetría"
                referencia={`${fInt(mensual.promedioVolumetria)} págs/mes`}
                datos={desviacion}
                clave="vol"
              />
              <Desviacion
                titulo="Facturación"
                referencia={`${fMoney(mensual.promedioFacturacion)}/mes`}
                datos={desviacion}
                clave="fact"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[10px] font-bold text-slate-700 uppercase">Picos de impresión diarios · fuente NDD</span>
              <span className="text-[9px] text-slate-400 font-medium">{diario.length} días con actividad</span>
            </div>
            <div className="h-28">
              {diario.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={diario} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gDia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.blue} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={C.blue} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 9, fill: C.axis }}
                      tickFormatter={(v) => v.slice(8)}
                      minTickGap={18}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 9, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={58} />
                    <Tooltip content={<TooltipBox titulo={(l) => fFecha(l)} />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
                    <Area type="monotone" dataKey="total" name="Páginas NDD" stroke={C.blue} strokeWidth={2} fill="url(#gDia)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">Sin registros NDD en el periodo seleccionado.</p>
              )}
            </div>
            {picos.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Picos máximos: {picos.map((p) => `${fFecha(p.fecha)} (${fInt(p.total)} págs)`).join(' y ')}.
              </p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-3.5">
          {sedes.map((s, i) => (
            <div key={s.clave} className="card p-4 flex items-center justify-between gap-3">
              <div className="w-36 h-20 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={s.tendencia} margin={{ top: 6, right: 4, left: -30, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: C.axis }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={34} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
                    <Bar dataKey="vol" name="Páginas" fill={C.blueSoft} radius={[3, 3, 0, 0]} maxBarSize={16} />
                    <Line type="monotone" dataKey="vol" name="Tendencia" stroke={CAT[i % CAT.length]} strokeWidth={2} dot={{ r: 2.5, fill: '#fff', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="text-right flex flex-col items-end min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-mt-blueSoft flex items-center justify-center text-mt-blue font-bold text-[11px] shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{titulo(s.clave)}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.equiposTotales} equipos · {fPct(s.pctParticipacionVol)} del volumen
                    </p>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-900 num">{fInt(s.volumetria)} págs</p>
                <p className="text-[10px] font-medium text-mt-blue num">{fMoney(s.facturacion)} facturados</p>
              </div>
            </div>
          ))}
        </div>

        <Card className="lg:col-span-4" title="Control del parque" subtitle="Equipos que generan volumen y equipos ociosos">
          <div className="flex flex-col justify-around h-full gap-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-11 h-6 bg-mt-blue rounded-full flex items-center p-0.5 shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-white ml-auto shadow" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Parque activo en operación</p>
                  <p className="text-[10px] text-slate-500">
                    {m.equiposActivos} impresoras generando volumetría · {fInt(m.volPorEquipo)} págs/equipo
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ring value={m.pctEquiposActivos} label="Activos" color={C.blue} size={44} />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 num leading-none">{fCompact(m.volPorEquipo)}</p>
                  <p className="text-[9px] text-slate-500 font-semibold mt-1">Págs/equipo</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-11 h-6 bg-amber-400 rounded-full flex items-center p-0.5">
                  <div className="w-5 h-5 rounded-full bg-white shadow" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800">Equipos sin actividad</p>
                    <Badge tone="aviso">{m.equiposSinActividad} equipos</Badge>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Costo ocioso: <strong className="text-rose-600 font-bold num">{fMoney(m.cargoFijoSinActividad)}</strong>
                    {!esAcumulado && ' en el mes'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ring
                  value={m.equiposTotales ? m.equiposSinActividad / m.equiposTotales : 0}
                  label="Del parque"
                  color={ESTADO.aviso}
                  size={44}
                />
                <Ring
                  value={m.facturacion ? m.cargoFijoSinActividad / m.facturacion : 0}
                  label="De la factura"
                  color={ESTADO.grave}
                  size={44}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card
          className="lg:col-span-4"
          title="Costos de clic vigentes"
          subtitle="Tarifas del contrato aplicadas a la volumetría del periodo"
          right={<Badge tone="azul">por página</Badge>}
        >
          <div className="space-y-2.5">
            {tarifasClic.map((t) => (
              <div key={t.label} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5">
                <span className="w-2.5 h-9 rounded-full shrink-0" style={{ background: t.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">{t.label}</p>
                  <p className="text-[10px] text-slate-500 leading-snug">{t.detalle}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900 num leading-none">{fTarifa(t.tarifa)}</p>
                  <p className="text-[10px] text-slate-500 num mt-1">
                    {fInt(t.paginas)} págs · <strong className="text-slate-700">{fMoney(t.importe)}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500">
              Clic variable {cardEtiqueta}: <strong className="text-slate-800 num">{fMoney(m.clicVariable)}</strong> sobre{' '}
              <strong className="text-slate-800 num">{fInt(m.volumetria)}</strong> págs
            </span>
            <Semaforo estado={Math.abs(m.difClicOrigen) < 0.005 ? 'ok' : 'grave'}>
              Validado vs origen {fMoney(m.difClicOrigen)}
            </Semaforo>
          </div>

          <Nota tono="aviso" titulo="Regla del clic adicional A3" icono="▸">
            Solo la <strong className="font-mono">{tarifas.serieA3}</strong> factura el color a{' '}
            <strong className="num">{fTarifa(tarifas.colorA3)}</strong>. Su monocromo se cobra a la tarifa B/N normal, igual que el resto
            del parque.
          </Nota>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card
          className="lg:col-span-7"
          title={`Composición de facturación (${serieMeses.map((s) => s.label).join(' · ')})`}
          subtitle="Clic variable contratado frente al cargo fijo mensual"
          right={
            <Semaforo estado={Math.abs(m.difClicOrigen) < 0.005 ? 'ok' : 'grave'}>Dif. origen {fMoney(m.difClicOrigen)}</Semaforo>
          }
        >
          <div className="grid grid-cols-12 gap-5 items-center">
            <div className="col-span-12 sm:col-span-8 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosFact} margin={{ top: 14, right: 8, left: -8, bottom: 0 }} barGap={2}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} className="capitalize" />
                  <YAxis tick={{ fontSize: 10, fill: C.axis }} tickFormatter={(v) => `$${fCompact(v)}`} axisLine={false} tickLine={false} width={54} />
                  <Tooltip content={<TooltipBox formato={fMoney} />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
                  <Bar dataKey="clic" name="Clic variable" fill={CAT[0]} radius={[4, 4, 0, 0]} maxBarSize={38}>
                    <LabelList dataKey="clic" position="top" formatter={(v) => `$${fCompact(v)}`} style={{ fontSize: 9, fill: C.textMuted, fontWeight: 600 }} />
                  </Bar>
                  <Bar dataKey="fijo" name="Cargo fijo" fill={CAT[1]} radius={[4, 4, 0, 0]} maxBarSize={38}>
                    <LabelList dataKey="fijo" position="top" formatter={(v) => `$${fCompact(v)}`} style={{ fontSize: 9, fill: C.textMuted, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="col-span-12 sm:col-span-4 space-y-3 text-[10px] text-slate-500 leading-snug">
              <div className="flex items-start gap-2.5">
                <span className="w-3.5 h-3.5 rounded shrink-0 mt-0.5" style={{ background: CAT[0] }} />
                <div>
                  <p className="font-bold text-slate-700 num">Clic variable ({fMoney(m.clicVariable)})</p>
                  <p>Impresiones y copias facturadas según lectura de contador.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-3.5 h-3.5 rounded shrink-0 mt-0.5" style={{ background: CAT[1] }} />
                <div>
                  <p className="font-bold text-slate-700 num">Cargo fijo ({fMoney(m.cargoFijo)})</p>
                  <p>Arrendamiento mensual por disponibilidad de {m.equiposTotales} equipos.</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-800 num">Total {cardEtiqueta}: {fMoney(m.facturacion)}</p>
                <p>{Math.abs(m.difClicOrigen) < 0.005 ? 'Facturación consolidada sin desviaciones contractuales.' : 'Existen diferencias contra el importe de origen.'}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card
          className="lg:col-span-5"
          title="Evolución de volumetría mensual"
          subtitle={`Promedio del periodo: ${fInt(mensual.promedioVolumetria)} págs/mes`}
          right={
            actual?.pctVarVsPromVolumetria !== null && actual?.pctVarVsPromVolumetria !== undefined ? (
              <Delta value={actual.pctVarVsPromVolumetria} suffix="vs prom." />
            ) : null
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datosVol} margin={{ top: 22, right: 46, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<TooltipBox />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
                <ReferenceLine
                  y={Math.round(mensual.promedioVolumetria)}
                  stroke={C.gray}
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{ value: `Promedio ${fInt(mensual.promedioVolumetria)}`, position: 'insideBottomRight', fontSize: 9, fill: C.textMuted, fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="vol" name="Volumetría" stroke={C.blue} strokeWidth={2.5} fill="url(#gVol)" dot={{ r: 4, fill: '#fff', stroke: C.blue, strokeWidth: 2.5 }}>
                  <LabelList dataKey="vol" position="top" offset={10} formatter={fInt} style={{ fontSize: 10, fill: C.text, fontWeight: 700 }} />
                </Area>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 mt-1 border-t border-slate-100">
            <Leyenda
              items={[
                { label: 'Volumetría mensual', color: C.blue },
                { label: 'Promedio del periodo', color: C.gray }
              ]}
            />
            {actual && (
              <span className="font-bold text-slate-700 num whitespace-nowrap">
                {actual.pctVarVsPromVolumetria !== null ? `${fPct(actual.pctVarVsPromVolumetria)} vs promedio` : ''}
              </span>
            )}
          </div>
        </Card>
      </section>
    </>
  )
}
