import React, { useEffect, useMemo, useRef } from 'react'
import { Tabla, Buscador, normaliza } from './ui.jsx'
import { fInt, fMoney, fPct, titulo } from '../lib/format.js'

const nombreDe = (u) => (u?.nombre && u.nombre !== '-' ? u.nombre : u?.usuario ?? '—')

const iniciales = (u) => {
  const partes = nombreDe(u).split(/[\s._-]+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Detalle de los trabajos de un usuario. Vive fuera de las tarjetas para poder
// abrirse desde cualquier lista de usuarios sin duplicar la tabla.
export default function ModalTrabajos({ usuario, trabajos, alcance = '', onCerrar, busqueda, onBusqueda }) {
  const cajaRef = useRef(null)

  // Esc cierra, y mientras esta abierto el fondo no scrollea.
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', alTeclear)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cajaRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflow
    }
  }, [onCerrar])

  const filtrados = useMemo(() => {
    const q = normaliza(busqueda)
    if (!q) return trabajos
    return trabajos.filter((t) => normaliza(t.titulo).includes(q))
  }, [trabajos, busqueda])

  const totalPags = trabajos.reduce((a, b) => a + b.total, 0)
  const totalCosto = trabajos.reduce((a, b) => a + b.costo, 0)
  const totalJobs = trabajos.reduce((a, b) => a + b.jobs, 0)
  const filtrando = filtrados.length !== trabajos.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        ref={cajaRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Trabajos de ${nombreDe(usuario)}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[88vh] flex flex-col outline-none"
      >
        {/* Cabecera con el usuario y sus totales */}
        <div className="flex items-start gap-3 p-4 border-b border-slate-100">
          <span className="w-11 h-11 rounded-full bg-gradient-to-tr from-mt-blue to-mt-blueDeep text-white text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm">
            {iniciales(usuario)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-mt-blue leading-tight">Detalle de impresiones</p>
            <p className="text-[15px] font-bold text-slate-900 leading-tight truncate">{nombreDe(usuario)}</p>
            <p className="text-[11px] text-slate-500 leading-tight truncate">
              {usuario?.usuario}
              {alcance ? ` · ${alcance}` : ''}
              {usuario?.areas?.length ? ` · ${usuario.areas.map(titulo).join(' · ')}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-lg font-bold text-mt-blue num leading-none">{fMoney(totalCosto)}</p>
            <p className="text-[10px] text-slate-500 num mt-1">
              {fInt(totalPags)} págs · {fInt(totalJobs)} trabajos
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar"
            className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-mt-blue hover:border-mt-blue/40 flex items-center justify-center shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Trabajos', v: fInt(totalJobs) },
              { l: 'B/N / Color', v: `${fInt(trabajos.reduce((a, b) => a + b.mono, 0))} / ${fInt(trabajos.reduce((a, b) => a + b.color, 0))}` },
              { l: 'Títulos', v: fInt(trabajos.length) }
            ].map((k) => (
              <div key={k.l} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{k.l}</p>
                <p className="text-[12px] font-bold text-slate-900 num">{k.v}</p>
              </div>
            ))}
          </div>
          <Buscador valor={busqueda} onCambio={onBusqueda} placeholder="Buscar trabajo…" />
        </div>

        <div className="p-4 overflow-auto">
          {!trabajos.length ? (
            <p className="text-xs text-slate-400 py-10 text-center">
              Este usuario no tiene trabajos con detalle en NDD para el periodo seleccionado.
            </p>
          ) : (
            <Tabla
              maxAltura="52vh"
              initialSort={{ key: 'total', dir: 'desc' }}
              vacio={`Ningún trabajo coincide con «${busqueda}».`}
              columnas={[
                {
                  key: 'titulo',
                  label: 'Nombre del trabajo',
                  render: (r) => (
                    <span className="block min-w-0">
                      <span
                        title={r.titulo}
                        className={`truncate max-w-[340px] inline-block align-bottom ${r.otros ? 'text-slate-400 italic' : 'text-slate-700'}`}
                      >
                        {r.titulo}
                      </span>
                      {r.ubicaciones?.length > 0 && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[340px]">
                          {r.ubicaciones.map(titulo).join(' · ')}
                        </span>
                      )}
                    </span>
                  )
                },
                { key: 'jobs', label: 'Veces', align: 'right', render: (r) => fInt(r.jobs) },
                { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
                { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
                { key: 'total', label: 'Págs', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.total)}</strong> },
                {
                  key: 'pct',
                  label: '% del usuario',
                  align: 'right',
                  sortValue: (r) => r.total,
                  render: (r) => fPct(totalPags ? r.total / totalPags : 0)
                },
                { key: 'costo', label: 'Costo', align: 'right', render: (r) => <span className="font-semibold text-mt-blue">{fMoney(r.costo)}</span> }
              ]}
              filas={filtrados}
              pie={{
                titulo: filtrando ? `FILTRADO · ${filtrados.length} de ${trabajos.length}` : `TOTAL · ${trabajos.length} títulos`,
                jobs: fInt(filtrados.reduce((a, b) => a + b.jobs, 0)),
                mono: fInt(filtrados.reduce((a, b) => a + b.mono, 0)),
                color: fInt(filtrados.reduce((a, b) => a + b.color, 0)),
                total: fInt(filtrados.reduce((a, b) => a + b.total, 0)),
                pct: fPct(totalPags ? filtrados.reduce((a, b) => a + b.total, 0) / totalPags : 0),
                costo: fMoney(filtrados.reduce((a, b) => a + b.costo, 0))
              }}
            />
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 text-[10px] text-slate-500">
          Las páginas son el reparto del contador SDS sobre los trabajos que NDD registró para este usuario, así que suman
          exactamente lo que se le atribuye en el ranking.
        </div>
      </div>
    </div>
  )
}
