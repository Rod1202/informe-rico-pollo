import React from 'react'
import { Card, Tabla, Badge } from './ui.jsx'
import { fInt, fMoney, fDelta, titulo } from '../lib/format.js'

// Flecha de variacion. Subir el consumo es malo en este informe, por eso el
// rojo apunta hacia arriba.
export function Var({ pct, alta, sinBase }) {
  if (sinBase) return <span className="text-[10px] text-slate-400 font-medium">sin mes previo</span>
  if (alta) return <Badge tone="azul">nuevo</Badge>
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return <span className="text-slate-300">—</span>
  const sube = pct > 0.00005
  const baja = pct < -0.00005
  const tono = sube ? 'text-rose-600' : baja ? 'text-emerald-600' : 'text-slate-500'
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${tono}`}>
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d={sube ? 'M5 15l7-7 7 7' : baja ? 'M19 9l-7 7-7-7' : 'M5 12h14'} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {fDelta(pct)}
    </span>
  )
}

// Tabla de variacion contra el periodo previo. Se usa una vez por dimension,
// asi que la dimension llega por props en vez de vivir en un estado interno.
export default function TablaVariacion({
  title,
  subtitle,
  right,
  className = '',
  filas,
  col,
  esSerie = false,
  catSerie,
  nombreClave = titulo,
  sinBase,
  onFila,
  filaActiva,
  maxAltura = '392px',
  totalPie
}) {
  return (
    <Card className={className} title={title} subtitle={subtitle} right={right}>
      <Tabla
        maxAltura={maxAltura}
        initialSort={{ key: 'volumetria', dir: 'desc' }}
        onFila={onFila}
        filaActiva={filaActiva}
        columnas={[
          {
            key: 'clave',
            label: col,
            render: (r) =>
              esSerie ? (
                <span className="block min-w-0">
                  <span className="font-mono text-[11px] font-semibold text-slate-800">{r.clave}</span>
                  <span className="block text-[10px] text-slate-400 truncate max-w-[170px]">
                    {titulo(catSerie?.get(r.clave)?.ubicacion ?? catSerie?.get(r.clave)?.area ?? '—')}
                  </span>
                </span>
              ) : (
                <span
                  className={`truncate max-w-[170px] inline-block align-bottom ${
                    r.residual ? 'font-semibold text-amber-700 italic' : 'font-semibold text-slate-800'
                  }`}
                >
                  {nombreClave(r.clave)}
                </span>
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
        filas={filas.map((r) => ({ ...r, __key: r.clave }))}
        pie={{
          clave: `TOTAL · ${filas.length}`,
          volumetria: fInt(filas.reduce((a, b) => a + b.volumetria, 0)),
          volPrev: sinBase ? '—' : fInt(filas.reduce((a, b) => a + b.volPrev, 0)),
          pctVol: sinBase ? '—' : fDelta(totalPie?.pctVol),
          facturacion: fMoney(filas.reduce((a, b) => a + b.facturacion, 0)),
          pctFact: sinBase ? '—' : fDelta(totalPie?.pctFact)
        }}
      />
    </Card>
  )
}
