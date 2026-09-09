import React, { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts'
import { Card, Tabla, Badge, Leyenda, TooltipBox, Nota } from './ui.jsx'
import { C } from '../lib/palette.js'
import { nddPorArea, nddTrabajos, FUERA_CONTRATO } from '../lib/measures.js'
import { fInt, fMoney, fTarifa, fPct, fCompact, fSigned, titulo } from '../lib/format.js'


const POR_PAGINA = 8


const corto = (s, max = 16) => {
  const t = titulo(s)
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}


export default function PanelAreas({ ndd, catalogoSeries, periodosSel, tarifas, filtros, brecha = null }) {
  const [area, setArea] = useState(null)
  const [usuarioSel, setUsuarioSel] = useState(null)

  const areas = useMemo(
    () => nddPorArea(ndd.porSerieUsuario, catalogoSeries, periodosSel, tarifas, filtros),
    [ndd.porSerieUsuario, catalogoSeries, periodosSel, tarifas, filtros]
  )

  
  const areaActiva = useMemo(() => areas.find((a) => a.area === area) ?? areas[0] ?? null, [areas, area])

  
  const [pagina, setPagina] = useState(0)
  const paginas = Math.max(1, Math.ceil(areas.length / POR_PAGINA))
  
  const pagSegura = Math.min(pagina, paginas - 1)
  const desde = pagSegura * POR_PAGINA
  const paginaAreas = useMemo(
    () => areas.slice(desde, desde + POR_PAGINA).map((a) => ({ ...a, corto: corto(a.area) })),
    [areas, desde]
  )

  const usuarios = useMemo(
    () => (areaActiva?.usuarios ?? []).map((u) => ({ ...u, __key: u.usuario })),
    [areaActiva]
  )

  const usuarioActivo = useMemo(
    () => usuarios.find((u) => u.usuario === usuarioSel) ?? usuarios[0] ?? null,
    [usuarios, usuarioSel]
  )

  const trabajos = useMemo(() => {
    if (!areaActiva || !usuarioActivo) return []
    return nddTrabajos(ndd.porTrabajo, catalogoSeries, areaActiva.area, usuarioActivo.usuario, periodosSel, tarifas).map((t) => ({
      ...t,
      __key: t.titulo
    }))
  }, [ndd.porTrabajo, catalogoSeries, areaActiva, usuarioActivo, periodosSel, tarifas])

  const totalAreas = areas.reduce((a, b) => a + b.total, 0)
  const nombreUsuario = (u) => (u?.nombre && u.nombre !== '-' ? u.nombre : u?.usuario ?? '—')
  const iniciales = (u) => {
    const partes = nombreUsuario(u).split(/[\s._-]+/).filter(Boolean)
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
  }

  return (
    <>
    
    <Card
      title={`Top áreas por consumo NDD (${areas.length} áreas)`}
      subtitle="Clic en una barra para filtrar el detalle de usuarios y trabajos"
      right={
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-500 num mr-1 hidden sm:inline">
            {areas.length ? `${desde + 1}–${Math.min(desde + POR_PAGINA, areas.length)} de ${areas.length}` : '—'}
          </span>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={pagSegura === 0}
            title="Áreas anteriores"
            className="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center hover:text-mt-blue hover:border-mt-blue/40 disabled:opacity-35 disabled:hover:text-slate-500 disabled:hover:border-slate-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-[10px] font-bold text-slate-600 num w-10 text-center">
            {pagSegura + 1}/{paginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(paginas - 1, p + 1))}
            disabled={pagSegura >= paginas - 1}
            title="Áreas siguientes"
            className="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center hover:text-mt-blue hover:border-mt-blue/40 disabled:opacity-35 disabled:hover:text-slate-500 disabled:hover:border-slate-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      }
    >
      {!areas.length ? (
        <p className="text-xs text-slate-400 py-8 text-center">Sin actividad NDD para los filtros aplicados.</p>
      ) : (
        <>
          <div className="h-[236px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={paginaAreas}
                margin={{ top: 20, right: 8, left: -6, bottom: 4 }}
                className="cursor-pointer"
                
                onClick={(estado) => {
                  const clave = estado?.activePayload?.[0]?.payload?.area
                  if (clave) {
                    setArea(clave)
                    setUsuarioSel(null)
                  }
                }}
              >
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis
                  dataKey="corto"
                  interval={0}
                  tick={{ fontSize: 10, fill: C.text, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  height={30}
                />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={52} />
                <Tooltip
                  content={<TooltipBox titulo={(l, p) => titulo(p?.[0]?.payload?.area ?? l)} />}
                  cursor={{ fill: 'rgba(0,102,255,0.06)' }}
                />
                <Bar dataKey="total" name="Páginas NDD" maxBarSize={72}>
                  {paginaAreas.map((a) => (
                    <Cell key={a.area} fill={a.area === areaActiva?.area ? C.blue : C.gray} radius={[4, 4, 0, 0]} />
                  ))}
                  <LabelList
                    dataKey="total"
                    position="top"
                    formatter={fInt}
                    style={{ fontSize: 10, fill: C.text, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap mt-1 pt-2 border-t border-slate-100">
            <Leyenda
              items={[
                { label: `Área seleccionada: ${titulo(areaActiva?.area ?? '—')}`, color: C.blue },
                { label: 'Resto del ranking', color: C.gray }
              ]}
            />
            <span className="text-[10px] text-slate-500 num">
              Total NDD del periodo: <strong className="text-slate-700">{fInt(totalAreas)}</strong> págs
            </span>
          </div>
        </>
      )}
    </Card>

    
    <Card
      title="Consumo por área, usuario y trabajo"
      subtitle="NDD registra el equipo solo por número de serie; el área se hereda del contador SDS cruzando esa misma serie"
      right={areaActiva ? <Badge tone="azul">{titulo(areaActiva.area)}</Badge> : null}
    >
      {!areaActiva ? (
        <p className="text-xs text-slate-400 py-8 text-center">Sin actividad NDD para los filtros aplicados.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { l: 'Páginas del área', v: fInt(areaActiva.total), s: `${fPct(totalAreas ? areaActiva.total / totalAreas : 0)} del total NDD` },
              { l: 'Monocromo / color', v: `${fInt(areaActiva.mono)} / ${fInt(areaActiva.color)}`, s: `${fPct(areaActiva.total ? areaActiva.color / areaActiva.total : 0)} en color` },
              { l: 'Usuarios activos', v: fInt(areaActiva.usuarios.length), s: `${areaActiva.equipos} equipo(s)` },
              { l: 'Trabajos enviados', v: fInt(areaActiva.jobs), s: `${fInt(areaActiva.jobs ? areaActiva.total / areaActiva.jobs : 0)} págs por trabajo` },
              { l: 'Costo de clic', v: fMoney(areaActiva.costo), s: 'tarifas de contrato', destacado: true }
            ].map((k) => (
              <div
                key={k.l}
                className={`rounded-xl border p-3 ${k.destacado ? 'border-mt-blue/25 bg-mt-blueTint' : 'border-slate-200 bg-slate-50'}`}
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{k.l}</p>
                <p className={`text-sm font-bold num mt-1 ${k.destacado ? 'text-mt-blue' : 'text-slate-900'}`}>{k.v}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 num">{k.s}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Usuarios de {titulo(areaActiva.area)} · clic en una fila para ver sus trabajos
              </p>
              <Tabla
                maxAltura="420px"
                initialSort={{ key: 'total', dir: 'desc' }}
                onFila={(r) => setUsuarioSel(r.usuario)}
                filaActiva={usuarioActivo?.usuario}
                vacio="Ningún usuario coincide con la búsqueda."
                columnas={[
                  {
                    key: 'nombre',
                    label: 'Usuario',
                    render: (r) => {
                      const sel = r.usuario === usuarioActivo?.usuario
                      return (
                        <span className="flex items-center gap-2 min-w-0">
                          
                          <span className={`w-1 h-7 rounded-full shrink-0 ${sel ? 'bg-mt-blue' : 'bg-transparent'}`} />
                          <span className="block min-w-0">
                            <span
                              className={`truncate max-w-[160px] inline-block align-bottom ${
                                sel ? 'font-bold text-mt-blue' : 'font-semibold text-slate-800'
                              }`}
                            >
                              {nombreUsuario(r)}
                            </span>
                            {r.nombre !== '-' && r.nombre !== r.usuario && (
                              <span className="block text-[10px] text-slate-400 truncate max-w-[160px]">{r.usuario}</span>
                            )}
                          </span>
                        </span>
                      )
                    }
                  },
                  { key: 'jobs', label: 'Trab.', align: 'right', render: (r) => fInt(r.jobs) },
                  { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
                  { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
                  { key: 'total', label: 'Págs', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.total)}</strong> },
                  { key: 'costo', label: 'Costo', align: 'right', render: (r) => <span className="font-semibold text-mt-blue">{fMoney(r.costo)}</span> }
                ]}
                filas={usuarios}
                pie={{
                  nombre: `TOTAL · ${usuarios.length} usuarios`,
                  jobs: fInt(usuarios.reduce((a, b) => a + b.jobs, 0)),
                  mono: fInt(usuarios.reduce((a, b) => a + b.mono, 0)),
                  color: fInt(usuarios.reduce((a, b) => a + b.color, 0)),
                  total: fInt(usuarios.reduce((a, b) => a + b.total, 0)),
                  costo: fMoney(usuarios.reduce((a, b) => a + b.costo, 0))
                }}
              />
            </div>

            <div className="lg:col-span-7">
              {usuarioActivo ? (
                <div className="mb-2 rounded-xl border border-mt-blue/25 bg-mt-blueTint px-3 py-2 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-mt-blue to-mt-blueDeep text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                    {iniciales(usuarioActivo)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-mt-blue leading-tight">Viendo los trabajos de</p>
                    <p className="text-[13px] font-bold text-slate-900 leading-tight truncate">{nombreUsuario(usuarioActivo)}</p>
                    <p className="text-[10px] text-slate-500 leading-tight truncate">
                      {usuarioActivo.usuario} · {titulo(areaActiva.area)} · {usuarioActivo.equipos} equipo(s)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-mt-blue num leading-none">{fMoney(usuarioActivo.costo)}</p>
                    <p className="text-[10px] text-slate-500 num mt-1">
                      {fInt(usuarioActivo.total)} págs · {fInt(usuarioActivo.jobs)} trabajos
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-500">
                  Selecciona un usuario de la tabla para ver el detalle de sus trabajos.
                </div>
              )}
              <Tabla
                maxAltura="420px"
                initialSort={{ key: 'total', dir: 'desc' }}
                vacio="Selecciona un usuario para ver el detalle de sus trabajos."
                columnas={[
                  {
                    key: 'titulo',
                    label: 'Nombre del trabajo',
                    render: (r) => (
                      <span
                        title={r.titulo}
                        className={`truncate max-w-[330px] inline-block align-bottom ${r.otros ? 'text-slate-400 italic' : 'text-slate-700'}`}
                      >
                        {r.titulo}
                      </span>
                    )
                  },
                  { key: 'jobs', label: 'Veces', align: 'right', render: (r) => fInt(r.jobs) },
                  { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
                  { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
                  { key: 'total', label: 'Págs', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.total)}</strong> },
                  { key: 'costo', label: 'Costo', align: 'right', render: (r) => <span className="font-semibold text-mt-blue">{fMoney(r.costo)}</span> }
                ]}
                filas={trabajos}
                pie={{
                  titulo: `TOTAL · ${trabajos.length} títulos`,
                  jobs: fInt(trabajos.reduce((a, b) => a + b.jobs, 0)),
                  mono: fInt(trabajos.reduce((a, b) => a + b.mono, 0)),
                  color: fInt(trabajos.reduce((a, b) => a + b.color, 0)),
                  total: fInt(trabajos.reduce((a, b) => a + b.total, 0)),
                  costo: fMoney(trabajos.reduce((a, b) => a + b.costo, 0))
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <Nota tono="azul" titulo="Cómo se valoriza este consumo" icono="▸">
              B/N a <strong className="num">{fTarifa(tarifas.bn)}</strong> y color a <strong className="num">{fTarifa(tarifas.color)}</strong> por
              página. La serie <strong className="font-mono">{tarifas.serieA3}</strong> es la única que factura su color a{' '}
              <strong className="num">{fTarifa(tarifas.colorA3)}</strong>; su monocromo va a la tarifa B/N normal.
              {areaActiva.area === FUERA_CONTRATO
                ? ' Estas series imprimen pero no están en el contrato, por eso no tienen área asignada.'
                : ''}
            </Nota>
            <Nota tono="aviso" titulo="Es costo de gestión, no la factura" icono="▸">
              Valorizado sobre las páginas que registra NDD
              {Number.isFinite(brecha) ? <>, que difieren del contador SDS en <strong className="num">{fSigned(brecha)}</strong> páginas</> : ''}.
              Sirve para atribuir el gasto a cada área y usuario; el importe que se cobra sale siempre del contador.
            </Nota>
          </div>
        </>
      )}
    </Card>
    </>
  )
}
