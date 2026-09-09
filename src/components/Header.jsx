import React from 'react'
import { VISTAS } from './Sidebar.jsx'

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px]">
      <span className="text-slate-400 font-semibold hidden xl:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-full pl-3 pr-7 py-1.5 focus:ring-2 focus:ring-mt-blue/20 focus:border-mt-blue focus:outline-none max-w-[170px] truncate"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function Header({ meta, periodos, filtros, setFiltros, vista }) {
  const set = (k) => (v) => setFiltros((f) => ({ ...f, [k]: v }))
  const vistaActual = VISTAS.find((v) => v.id === vista)

  return (
    <header className="bg-white border-b border-slate-200/80 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-mt-blueSoft text-mt-blue text-[11px] font-bold tracking-wide uppercase border border-blue-100 whitespace-nowrap">
              Informe Rico Pollo
            </span>
            <span className="text-xs font-semibold text-slate-800 hidden md:inline truncate">{vistaActual?.label}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium truncate">
            {meta.equipos} equipos · {meta.sedes.length} sedes · {meta.areas.length} áreas · corte {meta.fechaCorte}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Select
          label="Sede"
          value={filtros.sede}
          onChange={set('sede')}
          options={[{ value: 'TODAS', label: 'Todas las sedes' }, ...meta.sedes.map((s) => ({ value: s, label: s }))]}
        />
        <Select
          label="Estado"
          value={filtros.estado}
          onChange={set('estado')}
          options={[
            { value: 'TODOS', label: 'Producción + Backup' },
            { value: 'PRODUCCION', label: 'Solo producción' },
            { value: 'BACKUP', label: 'Solo backup' }
          ]}
        />

        <div className="flex items-center bg-slate-100/90 rounded-full p-1 border border-slate-200 text-[11px]">
          <button
            type="button"
            onClick={() => set('periodo')('TODOS')}
            className={`px-2.5 py-1 rounded-full transition-colors ${
              filtros.periodo === 'TODOS' ? 'bg-white text-mt-blue font-bold border border-slate-200/60 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Acumulado
          </button>
          {periodos.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => set('periodo')(p.key)}
              className={`px-2.5 py-1 rounded-full transition-colors capitalize ${
                filtros.periodo === p.key ? 'bg-white text-mt-blue font-bold border border-slate-200/60 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

      </div>
    </header>
  )
}
