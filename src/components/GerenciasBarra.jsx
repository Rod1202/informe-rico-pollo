import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts'
import { Card, Badge, TooltipBox } from './ui.jsx'
import { C, ESTADO } from '../lib/palette.js'
import { ES_RESIDUAL, ETIQUETA_RESIDUAL } from '../lib/organizacion.js'
import { fInt, fMoney, fCompact, fDelta, titulo } from '../lib/format.js'

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

export default function GerenciasBarra({
  filas,
  activo = null,
  onClic = null,
  propia = null,
  soloPropia = false,
  sinBase = false,
  etiquetaPrev = null,
  etiqueta = ''
}) {
  const datos = filas
    .filter((g) => g.volumetria > 0 || g.volPrev > 0)
    .map((g) => ({
      ...g,
      residual: g.residual ?? ES_RESIDUAL(g.clave),
      corto: nombreGerencia(g.clave),
      esPropia: propia != null && g.clave === propia
    }))

  const total = datos.reduce((a, b) => a + b.volumetria, 0)
  const residual = datos.filter((d) => d.residual).reduce((a, b) => a + b.volumetria, 0)
  const clicable = typeof onClic === 'function'

  const color = (d) => {
    if (d.residual) return d.clave === activo ? ESTADO.aviso : '#fcd9a4'
    if (propia != null) return d.esPropia ? C.blue : C.gray
    if (!activo) return C.blue
    return d.clave === activo ? C.blue : C.gray
  }

  return (
    <Card
      title="Consumo por gerencia"
      subtitle={
        soloPropia
          ? `Volumen facturado atribuido a las personas de cada gerencia en ${etiqueta}. Tu gerencia está resaltada; el detalle de abajo es solo tuyo.`
          : `Volumen facturado atribuido a las personas de cada gerencia en ${etiqueta}, según el padrón. Clic en una barra para filtrar áreas y usuarios.`
      }
      right={
        activo && clicable ? (
          <button
            type="button"
            onClick={() => onClic(activo)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-mt-blue/30 bg-mt-blueTint text-mt-blue hover:bg-mt-blue hover:text-white transition-colors"
          >
            {nombreGerencia(activo)} · quitar filtro ✕
          </button>
        ) : (
          <Badge tone="azul">{datos.length} gerencias</Badge>
        )
      }
    >
      {!datos.length ? (
        <p className="text-xs text-slate-400 py-8 text-center">Sin consumo para los filtros aplicados.</p>
      ) : (
        <>
          <div style={{ height: Math.max(200, datos.length * 30 + 30) }}>
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
                            <span className="flex-1">Costo de clic</span>
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
                                {fDelta(d?.pctVol, 1)}
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
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-1 pt-2 border-t border-slate-100 text-[10px] text-slate-500 num">
            <span>
              {soloPropia ? (
                <>
                  Comparativa completa. Solo podés abrir el detalle de{' '}
                  <strong className="text-slate-700">{nombreGerencia(propia)}</strong>.
                </>
              ) : (
                'La gerencia sale del padrón, cruzando quién imprimió con su Division.'
              )}
              {residual > 0 && (
                <>
                  {' '}
                  Las barras ámbar (<strong className="text-amber-700">{fInt(residual)}</strong> págs) no tienen gerencia asignable.
                </>
              )}
            </span>
            <span>
              Total del periodo: <strong className="text-slate-700">{fInt(total)}</strong> págs
            </span>
          </div>
        </>
      )}
    </Card>
  )
}
