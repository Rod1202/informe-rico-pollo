import React from 'react'
import { Isotipo } from './Marca.jsx'

const ICONOS = {
  resumen: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  volumetria: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
  auditoria: 'M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3',
  kpi: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  salir: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9'
}

export const VISTAS = [
  { id: 'kpi', label: 'Tablero KPI · Gerencia', icono: ICONOS.kpi },
  { id: 'resumen', label: 'Resumen ejecutivo', icono: ICONOS.resumen },
  { id: 'volumetria', label: 'Volumetría y parque', icono: ICONOS.volumetria },
  { id: 'facturacion', label: 'Facturación y costos', icono: null, texto: '$' },
  { id: 'auditoria', label: 'Auditoría SDS vs NDD', icono: ICONOS.auditoria }
]

export default function Sidebar({ vista, setVista, meta, rol, onSalir, onInicio }) {
  const permitidas = VISTAS.filter((v) => !rol || rol.vistas.includes(v.id))

  return (
    <aside className="w-20 bg-white border-r border-slate-200/80 flex flex-col items-center py-5 shrink-0 z-30 justify-between select-none">
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-16 h-11 flex items-center justify-center">
          <Isotipo size={34} onInicio={onInicio} />
        </div>
        <nav className="w-full flex flex-col items-center gap-1 mt-1">
          {permitidas.map((v) => {
            const activo = vista === v.id
            return (
              <button
                key={v.id}
                type="button"
                title={v.label}
                onClick={() => setVista(v.id)}
                className={`group w-full h-12 flex items-center justify-center relative transition-colors ${
                  activo ? 'text-mt-blue bg-mt-blueTint' : 'text-slate-400 hover:text-mt-blue hover:bg-slate-50'
                }`}
              >
                {activo && <span className="absolute right-0 top-0 bottom-0 w-1.5 bg-mt-blue rounded-l" />}
                {v.texto ? (
                  <span
                    className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm ${
                      activo ? 'border-mt-blue/30' : 'border-slate-300'
                    }`}
                  >
                    {v.texto}
                  </span>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path d={v.icono} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="w-full flex flex-col items-center gap-2 pb-1 text-center">
        <span className="text-[9px] font-bold text-slate-300 tracking-widest">{meta.equipos}</span>
        <span className="text-[8px] text-slate-300 uppercase tracking-wider leading-none">equipos</span>
        {onSalir && (
          <button
            type="button"
            onClick={onSalir}
            title={`Salir (${rol?.etiqueta ?? ''})`}
            className="mt-2 w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
              <path d={ICONOS.salir} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  )
}
