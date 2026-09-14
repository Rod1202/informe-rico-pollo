import React, { useMemo, useState } from 'react'
import { C, ESTADO } from '../lib/palette.js'
import { fDelta, fInt } from '../lib/format.js'

export function Card({ title, subtitle, right, children, className = '', bodyClass = '' }) {
  return (
    <section className={`card p-5 flex flex-col ${className}`}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && <h3 className="card-t">{title}</h3>}
            {subtitle && <p className="card-s mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={`flex-1 min-h-0 ${bodyClass}`}>{children}</div>
    </section>
  )
}

export function Badge({ children, tone = 'neutro', className = '' }) {
  const tones = {
    neutro: 'bg-slate-100 text-slate-600 border-slate-200',
    azul: 'bg-mt-blueSoft text-mt-blue border-blue-100',
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    aviso: 'bg-amber-50 text-amber-700 border-amber-200',
    grave: 'bg-rose-50 text-rose-700 border-rose-200',
    negro: 'bg-slate-900 text-white border-slate-900'
  }
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function Delta({ value, suffix = 'MoM', invertir = false, decimales = 1 }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="text-[10px] font-medium text-slate-400">sin mes previo</span>
  }
  const positivo = value >= 0
  const bueno = invertir ? !positivo : positivo
  const color = Math.abs(value) < 0.0005 ? 'text-slate-500' : bueno ? 'text-emerald-600' : 'text-rose-600'
  return (
    <span className={`text-[10px] font-semibold ${color} inline-flex items-center gap-0.5`}>
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d={positivo ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {fDelta(value, decimales)} {suffix}
    </span>
  )
}

export function Kpi({ icon, label, value, foot, destacado = false }) {
  return (
    <div
      className={`rounded-2xl p-3.5 flex flex-col items-center justify-center text-center transition-shadow ${
        destacado
          ? 'bg-gradient-to-tr from-mt-ink to-mt-graphite text-white shadow-lg shadow-slate-900/25'
          : 'bg-white border border-slate-200/80 shadow-card hover:shadow-md'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
          destacado ? 'bg-white/15 text-white' : 'bg-mt-blueSoft text-mt-blue border border-blue-100'
        }`}
      >
        {icon}
      </div>
      <span className={`text-[9px] font-bold tracking-wider uppercase ${destacado ? 'text-white/80' : 'text-slate-400'}`}>{label}</span>
      <p className={`text-base font-bold mt-0.5 num ${destacado ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      <span className={`mt-0.5 ${destacado ? 'text-[10px] text-white/80 font-medium' : ''}`}>{foot}</span>
    </div>
  )
}

export function Ring({ value, label, color = C.blue, size = 52, texto }) {
  const pct = Math.max(0, Math.min(1, value || 0))
  const r = 16
  const circ = 100
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 40 40" className="transform -rotate-90" style={{ width: size, height: size }}>
          <circle cx="20" cy="20" r={r} fill="none" stroke="#eef2f7" strokeWidth="3.5" />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - pct * circ}
          />
        </svg>
        <span className="absolute text-[11px] font-bold text-slate-800 num">{texto ?? `${Math.round(pct * 100)}%`}</span>
      </div>
      <span className="text-[9px] text-slate-500 font-semibold mt-1 text-center leading-tight">{label}</span>
    </div>
  )
}

export function Barra({ label, right, value, color = C.blue, cap = 1 }) {
  const w = Math.max(0, Math.min(1, (value || 0) / cap))
  return (
    <div>
      <div className="flex justify-between items-baseline gap-3 text-xs mb-1.5 flex-wrap">
        <span className="font-bold text-slate-800 tracking-wide uppercase text-[10px]">{label}</span>
        <span className="text-[11px] text-slate-600 font-semibold num text-right">{right}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-2.5 rounded-full transition-all" style={{ width: `${w * 100}%`, background: color }} />
      </div>
    </div>
  )
}

export function Leyenda({ items, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: it.color }} />
          {it.label}
          {it.value !== undefined && <span className="text-slate-400 font-medium num">{it.value}</span>}
        </span>
      ))}
    </div>
  )
}

export function TooltipBox({ active, payload, label, formato = fInt, titulo }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-800 mb-1">{titulo ? titulo(label, payload) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color || p.fill }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-semibold text-slate-900 num">{formato(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function Tabla({ columnas, filas, initialSort, maxAltura = '100%', vacio = 'Sin datos para los filtros aplicados.', pie, onFila, filaActiva }) {
  const [sort, setSort] = useState(initialSort ?? { key: columnas[0].key, dir: 'desc' })

  const ordenadas = useMemo(() => {
    const col = columnas.find((c) => c.key === sort.key)
    if (!col) return filas
    const val = (r) => (col.sortValue ? col.sortValue(r) : r[col.key])
    return [...filas].sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      if (typeof va === 'number' && typeof vb === 'number') return sort.dir === 'asc' ? va - vb : vb - va
      return sort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [filas, sort, columnas])

  if (!filas.length) return <p className="text-xs text-slate-400 py-6 text-center">{vacio}</p>

  return (
    <div className="overflow-auto rounded-xl border border-slate-100" style={{ maxHeight: maxAltura }}>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur z-10">
          <tr>
            {columnas.map((c) => (
              <th
                key={c.key}
                className={`th cursor-pointer select-none hover:text-mt-blue ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))}
                title={c.titulo}
              >
                {c.label}
                {sort.key === c.key && <span className="text-mt-blue ml-1">{sort.dir === 'desc' ? '▾' : '▴'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((r, i) => (
            <tr
              key={r.__key ?? i}
              onClick={onFila ? () => onFila(r) : undefined}
              className={`border-t border-slate-100 hover:bg-mt-blueTint/70 ${onFila ? 'cursor-pointer' : ''} ${
                filaActiva !== undefined && filaActiva === r.__key ? 'bg-mt-blueTint ring-1 ring-inset ring-mt-blue/25' : ''
              }`}
            >
              {columnas.map((c) => (
                <td key={c.key} className={`td ${c.align === 'right' ? 'text-right num' : ''} ${c.className ?? ''}`}>
                  {c.render ? c.render(r, i) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {pie && (
          <tfoot className="sticky bottom-0 bg-slate-50/95 backdrop-blur border-t-2 border-slate-200">
            <tr>
              {columnas.map((c) => (
                <td key={c.key} className={`td font-bold text-slate-900 ${c.align === 'right' ? 'text-right num' : ''}`}>
                  {pie[c.key] ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export function Nota({ tono = 'azul', titulo, children, icono }) {
  const tonos = {
    azul: 'border-blue-200 bg-mt-blueTint text-slate-600',
    ok: 'border-emerald-200 bg-emerald-50/50 text-slate-600',
    aviso: 'border-amber-200 bg-amber-50/50 text-slate-600',
    grave: 'border-rose-200 bg-rose-50/50 text-slate-600',
    neutro: 'border-slate-200 bg-slate-50 text-slate-600'
  }
  const titulos = { azul: 'text-mt-blue', ok: 'text-emerald-700', aviso: 'text-amber-700', grave: 'text-rose-700', neutro: 'text-slate-700' }
  return (
    <div className={`border border-dashed rounded-xl p-3 text-[11px] leading-snug ${tonos[tono]}`}>
      {titulo && (
        <span className={`font-bold block mb-0.5 ${titulos[tono]}`}>
          {icono} {titulo}
        </span>
      )}
      {children}
    </div>
  )
}

export function Semaforo({ estado, children }) {
  const map = {
    ok: { c: ESTADO.ok, i: 'M9 12.75L11.25 15 15 9.75', t: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    aviso: { c: ESTADO.aviso, i: 'M12 9v3.75m0 3.75h.008', t: 'text-amber-700 bg-amber-50 border-amber-200' },
    grave: { c: ESTADO.grave, i: 'M12 9v3.75M12 17.25h.007', t: 'text-rose-700 bg-rose-50 border-rose-200' }
  }
  const s = map[estado] ?? map.ok
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${s.t}`}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d={s.i} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </span>
  )
}

export function Vacio({ children = 'Sin datos para los filtros aplicados.' }) {
  return <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-10">{children}</div>
}

export function Fuente({ tono = 'sds', titulo, descripcion, etiqueta }) {
  const tonos = {
    sds: {
      barra: 'bg-mt-blue',
      caja: 'border-blue-200/70 bg-mt-blueTint',
      texto: 'text-mt-blue',
      chip: 'bg-white text-mt-blue border-blue-200',
      icono: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 20.25z'
    },
    ndd: {
      barra: 'bg-amber-500',
      caja: 'border-amber-200/80 bg-amber-50/60',
      texto: 'text-amber-700',
      chip: 'bg-white text-amber-700 border-amber-200',
      icono: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'
    }
  }
  const t = tonos[tono] ?? tonos.sds
  return (
    <div className={`flex items-center gap-3 rounded-2xl border ${t.caja} pl-0 pr-4 py-2.5 overflow-hidden`}>
      <span className={`w-1.5 self-stretch shrink-0 ${t.barra}`} />
      <span className={`w-8 h-8 rounded-full bg-white border ${t.caja} flex items-center justify-center shrink-0 ${t.texto}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d={t.icono} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${t.texto} leading-tight`}>{titulo}</p>
        <p className="text-[11px] text-slate-500 leading-snug">{descripcion}</p>
      </div>
      {etiqueta && (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shrink-0 ${t.chip}`}>
          {etiqueta}
        </span>
      )}
    </div>
  )
}
