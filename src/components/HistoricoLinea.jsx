import React, { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, LabelList } from 'recharts'
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
      { key: 'volumetria', label: 'Total', color: CAT[1], grosor: 2.6 },
      { key: 'volBN', label: 'Monocromo (B/N)', color: CAT[0], grosor: 1.9 },
      { key: 'volColor', label: 'Color', color: CAT[2], grosor: 1.9 }
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
      { key: 'facturacion', label: 'Total facturado', color: CAT[1], grosor: 2.6 },
      { key: 'clicBN', label: 'Clic B/N', color: CAT[0], grosor: 1.9 },
      { key: 'clicColor', label: 'Clic color', color: CAT[2], grosor: 1.9 }
    ]
  }
}

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
  const cfg = EJES[eje]

  const datos = mensual.serie
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

  const clavePrincipal = cfg.series[0].key
  const activo = esAcumulado ? null : datos.find((d) => d.periodo === periodoActivo)
  const ultimo = datos[datos.length - 1] ?? null
  const previo = datos.length > 1 ? datos[datos.length - 2] : null
  const varUltimo =
    ultimo && previo && previo[clavePrincipal]
      ? (ultimo[clavePrincipal] - previo[clavePrincipal]) / previo[clavePrincipal]
      : null

  return (
    <Card
      title={title}
      subtitle={
        subtitle ??
        `Histórico mes a mes del contrato, en ${cfg.unidad}. El punto marcado es el periodo seleccionado en el encabezado.`
      }
      right={
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone="azul">{etiqueta ?? `${datos.length} meses`}</Badge>
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
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datos} margin={{ top: 30, right: 18, left: -6, bottom: 4 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: C.axis }}
                  tickFormatter={cfg.eje}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  cursor={{ stroke: C.gray, strokeDasharray: '3 3' }}
                  content={
                    <TooltipBox
                      formato={cfg.formato}
                      pie={(d) => (
                        <>
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
                {activo && <ReferenceLine x={activo.label} stroke={C.blue} strokeDasharray="4 4" strokeOpacity={0.55} />}
                {cfg.series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={s.grosor}
                    dot={{ r: 3, fill: '#fff', stroke: s.color, strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  >
                    {/* El parque va sobre la linea del total, no sobre cada serie. */}
                    {i === 0 && (
                      <LabelList
                        dataKey="equipos"
                        position="top"
                        offset={12}
                        formatter={(v) => `${v} eq.`}
                        style={{ fontSize: 9, fill: C.axis, fontWeight: 700 }}
                      />
                    )}
                  </Line>
                ))}
                {activo && (
                  <ReferenceDot
                    x={activo.label}
                    y={activo[clavePrincipal]}
                    r={6}
                    fill={C.blue}
                    stroke="#fff"
                    strokeWidth={2}
                    isFront
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-1 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-3 flex-wrap">
              <Leyenda items={cfg.series.map((s) => ({ label: s.label, color: s.color }))} />
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
