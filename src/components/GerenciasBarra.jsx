import React, { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell, PieChart, Pie, Sector } from 'recharts'
import { Card, Badge, TooltipBox } from './ui.jsx'
import { C, ESTADO, rampaColor } from '../lib/palette.js'
import { ES_RESIDUAL, ETIQUETA_RESIDUAL } from '../lib/organizacion.js'
import { fInt, fMoney, fPct, fCompact, fDelta, titulo } from '../lib/format.js'

// Conectores que quedan feos capitalizados, y siglas que no son palabras.
const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])
const SIGLAS = new Set(['AB', 'TI', 'A3', 'PBA', 'PTC', 'SDS', 'NDD', 'CD', 'MPS'])

// Se muestra el nombre completo de la gerencia, tal como viene del contador.
// Recortar el prefijo "GERENCIA" hacia que las barras se leyeran como areas,
// que es una columna distinta del Excel.
export const nombreGerencia = (g) => {
  if (ES_RESIDUAL(g)) return ETIQUETA_RESIDUAL[g]
  const v = String(g ?? '').trim()
  if (!v) return '—'
  return v
    .split(/\s+/)
    .map((palabra, i) => {
      const limpio = palabra.replace(/[.,]/g, '')
      if (SIGLAS.has(limpio.toUpperCase()) && limpio.length <= 4) return palabra.toUpperCase()
      const bajo = palabra.toLowerCase()
      if (i > 0 && MINUSCULAS.has(bajo)) return bajo
      return titulo(palabra)
    })
    .join(' ')
}

// Una gerencia real que cayo a cero sigue en el grafico: ese cero es
// informacion. Un balde residual en cero no es una gerencia que dejo de
// imprimir, es un problema que se resolvio, asi que desaparece.
export const barrasVisibles = (filas) =>
  filas.filter((g) => ((g.residual ?? ES_RESIDUAL(g.clave)) ? g.volumetria > 0 : g.volumetria > 0 || g.volPrev > 0))

// Alto que necesita el grafico. Se exporta para que la tabla de al lado se
// alinee en vez de quedar corta con scroll propio.
export const altoGerencias = (filas) => Math.max(200, barrasVisibles(filas).length * 30 + 30)

// La porcion elegida crece y gana un anillo exterior. Recharts anima la
// transicion de radio, asi que el resalte se ve como un movimiento.
const PorcionActiva = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 9}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.55}
      />
    </g>
  )
}

const IconBarras = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
    <rect x="2" y="9" width="3" height="5" rx="1" />
    <rect x="6.5" y="5" width="3" height="9" rx="1" />
    <rect x="11" y="2" width="3" height="12" rx="1" />
  </svg>
)

const IconTorta = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden>
    <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.4" />
    <path d="M8 2a6 6 0 016 6H8V2z" fill="currentColor" />
  </svg>
)

const VISTAS = [
  { id: 'torta', l: 'Torta', Icono: IconTorta },
  { id: 'barras', l: 'Barras', Icono: IconBarras }
]

export default function GerenciasBarra({
  filas,
  className = '',
  activo = null,
  onClic = null,
  propia = null,
  soloPropia = false,
  sinBase = false,
  etiquetaPrev = null,
  etiqueta = ''
}) {
  const datos = barrasVisibles(filas)
    .map((g) => ({
      ...g,
      residual: g.residual ?? ES_RESIDUAL(g.clave),
      corto: nombreGerencia(g.clave),
      esPropia: propia != null && g.clave === propia
    }))

  const [vista, setVista] = useState('torta')

  const total = datos.reduce((a, b) => a + b.volumetria, 0)
  // En barras un cero con historial se muestra; en la torta una porcion de cero
  // no dibuja arco, asi que solo entran las gerencias con volumen.
  const datosTorta = datos.filter((d) => d.volumetria > 0)
  const idxActivo = datosTorta.findIndex((d) => d.clave === (activo ?? propia))
  // El color sigue el ranking: la porcion mas grande, la mas oscura.
  const colorTorta = (d, i) =>
    d.residual ? '#fcd9a4' : rampaColor(datosTorta.length > 1 ? 1 - i / (datosTorta.length - 1) : 1, 0.45)
  const clicable = typeof onClic === 'function'

  const color = (d) => {
    if (d.residual) return d.clave === activo ? ESTADO.aviso : '#fcd9a4'
    if (propia != null) return d.esPropia ? C.blue : C.gray
    if (!activo) return C.blue
    return d.clave === activo ? C.blue : C.gray
  }

  return (
    <Card
      className={className}
      title="Consumo por gerencia"
      subtitle={
        soloPropia
          ? `Volumen facturado atribuido a las personas de cada gerencia en ${etiqueta}. Tu gerencia está resaltada; el detalle de abajo es solo tuyo.`
          : `Volumen facturado atribuido a las personas de cada gerencia en ${etiqueta}, según el padrón. Clic en una barra para filtrar áreas y usuarios.`
      }
      right={
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {activo && clicable ? (
            <button
              type="button"
              onClick={() => onClic(activo)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-mt-blue/30 bg-mt-blueTint text-mt-blue hover:bg-mt-blue hover:text-white transition-colors"
            >
              {nombreGerencia(activo)} · quitar filtro ✕
            </button>
          ) : (
            <Badge tone="azul">{datos.length} gerencias</Badge>
          )}
          <div className="flex items-center bg-slate-100/90 rounded-full p-1 border border-slate-200">
            {VISTAS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setVista(o.id)}
                title={`Ver como ${o.l.toLowerCase()}`}
                aria-label={`Ver como ${o.l.toLowerCase()}`}
                aria-pressed={vista === o.id}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  vista === o.id
                    ? 'bg-white text-mt-blue border border-slate-200/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <o.Icono />
              </button>
            ))}
          </div>
        </div>
      }
    >
      {!datos.length ? (
        <p className="text-xs text-slate-400 py-8 text-center">Sin consumo para los filtros aplicados.</p>
      ) : (
        <>
          <div style={{ height: altoGerencias(filas) }}>
            {vista === 'torta' ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <Tooltip
                  content={
                    <TooltipBox
                      titulo={(l, p) => nombreGerencia(p?.[0]?.payload?.clave ?? l)}
                      pie={(d) => (
                        <>
                          <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <span className="flex-1">Costo de impresión</span>
                            <span className="font-semibold text-slate-800 num">{fMoney(d?.facturacion ?? 0)}</span>
                          </p>
                          <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <span className="flex-1">% del total</span>
                            <span className="font-semibold text-slate-800 num">
                              {fPct(total ? (d?.volumetria ?? 0) / total : 0)}
                            </span>
                          </p>
                        </>
                      )}
                    />
                  }
                />
                <Pie
                  data={datosTorta}
                  dataKey="volumetria"
                  nameKey="corto"
                  cx="50%"
                  cy="50%"
                  innerRadius="42%"
                  outerRadius="72%"
                  paddingAngle={1}
                  activeIndex={idxActivo >= 0 ? idxActivo : undefined}
                  activeShape={PorcionActiva}
                  isAnimationActive
                  animationDuration={420}
                  className={clicable ? 'cursor-pointer' : undefined}
                  onClick={(_, i) => {
                    const g = datosTorta[i]
                    if (!g || !clicable) return
                    if (soloPropia && !g.esPropia) return
                    onClic(g.clave)
                  }}
                >
                  {datosTorta.map((d, i) => (
                    <Cell
                      key={d.clave}
                      fill={colorTorta(d, i)}
                      stroke="#fff"
                      strokeWidth={1.5}
                      opacity={propia != null && !d.esPropia ? 0.45 : 1}
                    />
                  ))}
                </Pie>
                {/* Centro de la dona: lo elegido, o el total del periodo. */}
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                  <tspan x="50%" dy="-0.7em" style={{ fontSize: 10, fill: C.textMuted, fontWeight: 700 }}>
                    {idxActivo >= 0 ? nombreGerencia(datosTorta[idxActivo].clave) : 'Total del periodo'}
                  </tspan>
                  <tspan x="50%" dy="1.5em" style={{ fontSize: 18, fill: C.ink, fontWeight: 700 }}>
                    {fInt(idxActivo >= 0 ? datosTorta[idxActivo].volumetria : total)}
                  </tspan>
                  <tspan x="50%" dy="1.5em" style={{ fontSize: 10, fill: C.textMuted }}>
                    {idxActivo >= 0 ? `${fPct(total ? datosTorta[idxActivo].volumetria / total : 0)} del total` : 'páginas'}
                  </tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datos}
                layout="vertical"
                margin={{ top: 4, right: 86, left: 4, bottom: 4 }}
                className={clicable ? 'cursor-pointer' : undefined}
                onClick={(estado) => {
                  const g = estado?.activePayload?.[0]?.payload
                  if (!g || !clicable) return
                  // Con PIN de gerencia solo se puede abrir la propia.
                  if (soloPropia && !g.esPropia) return
                  if (soloPropia && g.residual) return
                  onClic(g.clave)
                }}
              >
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="corto"
                  width={196}
                  tick={{ fontSize: 10, fill: C.text, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,102,255,0.06)' }}
                  content={
                    <TooltipBox
                      titulo={(l, p) => nombreGerencia(p?.[0]?.payload?.clave ?? l)}
                      pie={(d) => (
                        <>
                          <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <span className="flex-1">Costo de Impresión</span>
                            <span className="font-semibold text-slate-800 num">{fMoney(d?.facturacion ?? 0)}</span>
                          </p>
                          <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <span className="flex-1">% del total</span>
                            <span className="font-semibold text-slate-800 num">
                              {total ? ((d?.volumetria ?? 0) / total * 100).toFixed(1) : '0.0'}%
                            </span>
                          </p>
                          {!sinBase && (
                            <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                              <span className="flex-1">vs {etiquetaPrev}</span>
                              <span
                                className={`font-semibold num ${
                                  d?.pctVol > 0.0005 ? 'text-rose-600' : d?.pctVol < -0.0005 ? 'text-emerald-600' : 'text-slate-500'
                                }`}
                              >
                                {fDelta(d?.pctVol)}
                              </span>
                            </p>
                          )}
                        </>
                      )}
                    />
                  }
                />
                <Bar dataKey="volumetria" name="Páginas" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {datos.map((d) => (
                    <Cell key={d.clave} fill={color(d)} />
                  ))}
                  <LabelList
                    dataKey="volumetria"
                    position="right"
                    formatter={fInt}
                    style={{ fontSize: 10, fill: C.text, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 flex-wrap mt-1 pt-2 border-t border-slate-100 text-[10px] text-slate-500 num">
            <span>
              Total del periodo: <strong className="text-slate-700">{fInt(total)}</strong> págs
            </span>
          </div>
        </>
      )}
    </Card>
  )
}
