import React from 'react'
import { Card } from './ui.jsx'

import { fInt, fDelta, fSigned } from '../lib/format.js'

// Flecha de variacion del valor. Subir consumo es malo en este informe, por eso
// el rojo va hacia arriba.
function VarValor({ pct, nuevo, sinBase }) {
  if (sinBase) return <span className="text-[10px] text-slate-400">sin mes previo</span>
  if (nuevo) return <span className="text-[10px] font-bold text-mt-blue">nuevo</span>
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return <span className="text-[10px] text-slate-300">—</span>
  const sube = pct > 0.0005
  const baja = pct < -0.0005
  return (
    <span className={`text-[10px] font-bold ${sube ? 'text-rose-600' : baja ? 'text-emerald-600' : 'text-slate-400'}`}>
      {sube ? '▲' : baja ? '▼' : '='} {fDelta(pct, 1)}
    </span>
  )
}

// Cuantos puestos gano o perdio en el ranking respecto del mes anterior.
function VarPuesto({ pos, posPrev, sinBase }) {
  if (sinBase || posPrev === null || posPrev === undefined) {
    return <span className="text-[9px] text-slate-300 num">—</span>
  }
  const dif = posPrev - pos
  if (dif === 0) return <span className="text-[9px] text-slate-400 num">= se mantiene</span>
  const sube = dif > 0
  return (
    <span className={`text-[9px] font-bold num ${sube ? 'text-rose-500' : 'text-emerald-600'}`}>
      {sube ? '▲' : '▼'} {Math.abs(dif)} puesto{Math.abs(dif) === 1 ? '' : 's'} · era #{posPrev}
    </span>
  )
}

export default function TopRanking({
  title,
  subtitle,
  right,
  filas,
  formato = fInt,
  sinBase = false,
  onClic = null,
  activo = null,
  vacio = 'Sin datos para los filtros aplicados.',
  className = ''
}) {
  const tope = filas.reduce((a, b) => Math.max(a, b.valor), 0) || 1

  return (
    <Card className={className} title={title} subtitle={subtitle} right={right}>
      {!filas.length ? (
        <p className="text-xs text-slate-400 py-8 text-center">{vacio}</p>
      ) : (
        <ul className="space-y-1.5">
          {filas.map((f) => {
            const sel = activo !== null && activo === f.id
            const clicable = typeof onClic === 'function'
            return (
              <li key={f.id}>
                <button
                  type="button"
                  disabled={!clicable}
                  onClick={clicable ? () => onClic(f.id) : undefined}
                  className={`w-full text-left relative overflow-hidden rounded-xl border px-3 py-2 transition-colors ${
                    sel ? 'border-mt-blue/45 bg-mt-blueTint' : 'border-slate-200 bg-white'
                  } ${clicable ? 'hover:border-mt-blue/40 cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Barra de fondo proporcional al primero del ranking. */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-mt-blue/[0.07] pointer-events-none"
                    style={{ width: `${Math.max(2, (f.valor / tope) * 100)}%` }}
                  />
                  <span className="relative flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 shrink-0 rounded-lg text-[11px] font-bold flex items-center justify-center num ${
                        f.pos === 1 ? 'bg-mt-blue text-white' : sel ? 'bg-white text-mt-blue border border-mt-blue/30' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {f.pos}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[12px] leading-tight truncate ${
                          sel ? 'font-bold text-mt-blue' : 'font-semibold text-slate-800'
                        }`}
                        title={f.etiqueta}
                      >
                        {f.etiqueta}
                      </span>
                      <span className="block leading-tight mt-0.5">
                        <VarPuesto pos={f.pos} posPrev={f.posPrev} sinBase={sinBase} />
                      </span>
                    </span>

                    <span className="text-right shrink-0">
                      <span className="block text-[12px] font-bold text-slate-900 num leading-tight">{formato(f.valor)}</span>
                      <span className="block leading-tight mt-0.5">
                        <VarValor pct={f.pct} nuevo={f.nuevo} sinBase={sinBase} />
                        {!sinBase && !f.nuevo && Number.isFinite(f.dif) && f.dif !== 0 && (
                          <span className="text-[9px] text-slate-400 num ml-1">({fSigned(f.dif, formato)})</span>
                        )}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// Convierte una lista con valor actual y valor previo en filas listas para el
// componente, calculando la posicion en cada periodo.
export function armarTop(items, { id, etiqueta, valor, valorPrev }, limite = 5) {
  const conValor = items.filter((x) => valor(x) > 0)

  const posActual = new Map(
    [...conValor].sort((a, b) => valor(b) - valor(a)).map((x, i) => [id(x), i + 1])
  )
  const posPrevia = new Map(
    items
      .filter((x) => valorPrev(x) > 0)
      .sort((a, b) => valorPrev(b) - valorPrev(a))
      .map((x, i) => [id(x), i + 1])
  )

  return [...conValor]
    .sort((a, b) => valor(b) - valor(a))
    .slice(0, limite)
    .map((x) => {
      const v = valor(x)
      const vPrev = valorPrev(x)
      return {
        id: id(x),
        etiqueta: etiqueta(x),
        valor: v,
        valorPrev: vPrev,
        dif: v - vPrev,
        pct: vPrev ? (v - vPrev) / vPrev : null,
        nuevo: !vPrev,
        pos: posActual.get(id(x)) ?? 0,
        posPrev: posPrevia.get(id(x)) ?? null
      }
    })
}
