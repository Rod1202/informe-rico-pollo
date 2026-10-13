import React, { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts'
import { Card, Badge, Leyenda, TooltipBox } from './ui.jsx'
import { C, CAT } from '../lib/palette.js'
import { fInt, fMoney, fCompact, fDelta } from '../lib/format.js'

// Los dos ejes del informe comparten forma: un total y su apertura en B/N y
// color. Se cambia entre ellos con la pestania, sin recargar el grafico.
const EJES = {
  volumen: {
    id: 'volumen',
    tab: 'Volumetría',
    titulo: 'Volumetría',
    unidad: 'páginas',
    formato: fInt,
    eje: fCompact,
    series: [
      { key: 'volumetria', label: 'Total', color: CAT[1] },
      { key: 'volBN', label: 'Monocromo (B/N)', color: CAT[0] },
      { key: 'volColor', label: 'Color', color: CAT[2] }
    ]
  },
  costo: {
    id: 'costo',
    tab: 'Facturación',
    titulo: 'Facturación',
    unidad: 'US$',
    formato: fMoney,
    eje: (v) => `$${fCompact(v)}`,
    series: [
      { key: 'facturacion', label: 'Total facturado', color: CAT[1] },
      { key: 'clicBN', label: 'Impresión B/N', color: CAT[0] },
      { key: 'clicColor', label: 'Impresión color', color: CAT[2] }
    ]
  }
}

// Ventana de tiempo que se muestra en el grafico. Cuenta meses desde el mas
// reciente hacia atras, asi que no rompe nada si todavia no hay esa cantidad
// de historia cargada.
const RANGOS = [
  { id: '3m', tab: '3 meses', meses: 3 },
  { id: '6m', tab: '6 meses', meses: 6 },
  { id: '12m', tab: '1 año', meses: 12 }
]

const IconApilado = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
    <rect x="3" y="2" width="10" height="5" rx="1" opacity="0.45" />
    <rect x="3" y="8" width="10" height="6" rx="1" />
  </svg>
)
const IconSeparado = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
    <rect x="2" y="6" width="5" height="8" rx="1" />
    <rect x="9" y="3" width="5" height="11" rx="1" opacity="0.6" />
  </svg>
)

export default function HistoricoLinea({
  mensual,
  periodoActivo,
  esAcumulado,
  title = 'Evolución del consumo',
  subtitle = null,
  etiqueta = null,
  vacio = 'Sin periodos con datos para los filtros aplicados.'
}) {
  const [eje, setEje] = useState('volumen')
  const [rango, setRango] = useState('12m')
  const [modo, setModo] = useState('apilado')
  const cfg = EJES[eje]
  const rangoCfg = RANGOS.find((r) => r.id === rango) ?? RANGOS[2]
  const [total, bn, color] = cfg.series
  const separado = modo === 'separado'

  const historico = mensual.serie
    .filter((s) => s.tiene)
    .map((s) => ({
      label: s.label,
      periodo: s.periodo,
      volumetria: s.volumetria,
      volBN: s.volBN,
      volColor: s.volColor,
      facturacion: +s.facturacion.toFixed(2),
      clicBN: +s.clicBN.toFixed(2),
      clicColor: +s.clicColor.toFixed(2),
      // Parque del mes: conteo de series distintas con contador en ese periodo.
      // Los BACKUP se informan aparte porque no facturan cargo fijo y no se
      // espera que impriman.
      equipos: s.series.length,
      equiposActivos: s.equiposActivos,
      equiposBackup: s.equiposBackup
    }))

  // El rango recorta desde el mes mas reciente hacia atras.
  const datos = historico.slice(-rangoCfg.meses)

  const clavePrincipal = total.key
  const activo = esAcumulado ? null : datos.find((d) => d.periodo === periodoActivo)
  const ultimo = datos[datos.length - 1] ?? null
  const previo = datos.length > 1 ? datos[datos.length - 2] : null
  const varUltimo =
    ultimo && previo && previo[clavePrincipal]
      ? (ultimo[clavePrincipal] - previo[clavePrincipal]) / previo[clavePrincipal]
      : null

  // El periodo activo queda a opacidad plena; el resto del historico baja un
  // poco para que resalte sin perderse de vista.
  const opacidad = (d) => (!activo || d.label === activo.label ? 1 : 0.42)

  const EtiquetaMes = ({ x, y, payload }) => {
    const esActivo = activo?.label === payload.value
    return (
      <text x={x} y={y} dy={14} textAnchor="middle" fontSize={11} fontWeight={esActivo ? 800 : 600} fill={esActivo ? C.blue : C.text}>
        {payload.value}
      </text>
    )
  }

  const EtiquetaFin = ({ x, y, width, index }) => {
    const d = datos[index]
    if (!d) return null
    return (
      <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.text}>
        {cfg.formato(d[clavePrincipal])}
        <tspan fill={C.axis} fontWeight={600} fontSize={9}>{` · ${d.equipos} eq.`}</tspan>
      </text>
    )
  }

  return (
    <Card
      title={title}
      subtitle={
        subtitle ??
        `Histórico mes a mes del contrato, en ${cfg.unidad}. La barra resaltada es el periodo seleccionado en el encabezado.`
      }
      right={
        <div className="flex items-center gap-2 flex-wrap justify-end max-w-full">
          <Badge tone="azul">{etiqueta ?? `${datos.length} ${datos.length === 1 ? 'mes' : 'meses'}`}</Badge>
          <div className="flex items-center bg-slate-100/90 rounded-full p-1 border border-slate-200 text-[11px]">
            {RANGOS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRango(r.id)}
                className={`px-3 py-1 rounded-full transition-colors ${
                  rango === r.id
                    ? 'bg-white text-mt-blue font-bold border border-slate-200/60 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r.tab}
              </button>
            ))}
          </div>
          <div className="flex items-center bg-slate-100/90 rounded-full p-1 border border-slate-200 text-[11px]">
            {Object.values(EJES).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setEje(o.id)}
                className={`px-3 py-1 rounded-full transition-colors ${
                  eje === o.id
                    ? 'bg-white text-mt-blue font-bold border border-slate-200/60 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {o.tab}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {!datos.length ? (
        <p className="text-xs text-slate-400 py-10 text-center">{vacio}</p>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 26, right: 10, left: -6, bottom: 4 }} barCategoryGap="30%" barGap={4}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={<EtiquetaMes />} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: C.axis }} tickFormatter={cfg.eje} axisLine={false} tickLine={false} width={54} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,102,255,0.05)' }}
                  content={
                    <TooltipBox
                      formato={cfg.formato}
                      pie={(d) => (
                        <>
                          <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <span className="flex-1">{total.label}</span>
                            <span className="font-semibold text-slate-800 num">{cfg.formato(d?.[clavePrincipal] ?? 0)}</span>
                          </p>
                          <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <span className="flex-1">Equipos en el parque</span>
                            <span className="font-semibold text-slate-800 num">{fInt(d?.equipos ?? 0)}</span>
                          </p>
                          <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <span className="flex-1">Con actividad</span>
                            <span className="font-semibold text-slate-800 num">{fInt(d?.equiposActivos ?? 0)}</span>
                          </p>
                          {d?.equiposBackup > 0 && (
                            <p className="flex items-center gap-2 text-slate-500 text-[11px]">
                              <span className="flex-1">En backup</span>
                              <span className="font-semibold text-slate-800 num">{fInt(d.equiposBackup)}</span>
                            </p>
                          )}
                        </>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey={bn.key}
                  name={bn.label}
                  stackId={separado ? undefined : 'hist'}
                  radius={separado ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={separado ? 30 : 64}
                >
                  {datos.map((d) => (
                    <Cell key={d.label} fill={bn.color} fillOpacity={opacidad(d)} />
                  ))}
                  {separado && (
                    <LabelList dataKey={bn.key} position="top" formatter={cfg.formato} style={{ fontSize: 9, fontWeight: 700, fill: C.text }} />
                  )}
                </Bar>
                <Bar
                  dataKey={color.key}
                  name={color.label}
                  stackId={separado ? undefined : 'hist'}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={separado ? 30 : 64}
                >
                  {datos.map((d) => (
                    <Cell key={d.label} fill={color.color} fillOpacity={opacidad(d)} />
                  ))}
                  {separado ? (
                    <LabelList dataKey={color.key} position="top" formatter={cfg.formato} style={{ fontSize: 9, fontWeight: 700, fill: C.text }} />
                  ) : (
                    <LabelList content={<EtiquetaFin />} />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-1 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-3 flex-wrap">
              <Leyenda items={[bn, color].map((s) => ({ label: s.label, color: s.color }))} />
              <div className="flex items-center bg-slate-100/90 rounded-full p-1 border border-slate-200">
                <button
                  type="button"
                  title="Barras apiladas"
                  onClick={() => setModo('apilado')}
                  className={`flex items-center justify-center w-7 h-6 rounded-full transition-colors ${
                    !separado ? 'bg-white text-mt-blue shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <IconApilado />
                </button>
                <button
                  type="button"
                  title="Barras separadas"
                  onClick={() => setModo('separado')}
                  className={`flex items-center justify-center w-7 h-6 rounded-full transition-colors ${
                    separado ? 'bg-white text-mt-blue shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <IconSeparado />
                </button>
              </div>
              <span className="text-[10px] text-slate-400">
                <strong className="text-slate-500">n eq.</strong> = equipos con contador ese mes
              </span>
            </span>
            <span className="text-[10px] text-slate-500 num">
              {ultimo ? (
                <>
                  Último mes ({ultimo.label}):{' '}
                  <strong className="text-slate-700">{cfg.formato(ultimo[clavePrincipal])}</strong>
                  {varUltimo !== null && (
                    <>
                      {' '}
                      <span className={varUltimo > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                        {fDelta(varUltimo, 1)}
                      </span>{' '}
                      vs {previo.label}
                    </>
                  )}
                </>
              ) : null}
            </span>
          </div>
        </>
      )}
    </Card>
  )
}
