import React, { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts'
import { Card, Tabla, Badge, Leyenda, TooltipBox, Nota } from './ui.jsx'
import { C } from '../lib/palette.js'
import { FUERA_CONTRATO } from '../lib/measures.js'
import { SIN_AUDITORIA, MODO } from '../lib/prorrateo.js'
import { fInt, fMoney, fTarifa, fPct, fCompact, titulo } from '../lib/format.js'


const POR_PAGINA = 8


const corto = (s, max = 16) => {
  const t = titulo(s)
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

const esSinAuditoria = (u) => u?.usuario === SIN_AUDITORIA


// Recibe el reparto ya calculado (`areas`) y una funcion para pedir los
// trabajos de un usuario. El area activa puede manejarse desde afuera pasando
// `area` + `onArea`; si no, el panel la maneja por su cuenta.
export default function PanelAreas({
  areas,
  onUsuario = null,
  tarifas,
  area: areaProp = null,
  onArea = null,
  mostrarRanking = true
}) {
  const controlado = typeof onArea === 'function'
  const [areaInterna, setAreaInterna] = useState(null)
  const [usuarioSel, setUsuarioSel] = useState(null)

  const areaClave = controlado ? areaProp : areaInterna
  const elegirArea = (a) => (controlado ? onArea(a) : setAreaInterna(a))

  const areaActiva = useMemo(() => areas.find((a) => a.area === areaClave) ?? areas[0] ?? null, [areas, areaClave])

  // Cambiar de area invalida el usuario que estaba abierto.
  useEffect(() => setUsuarioSel(null), [areaActiva?.area])

  const [pagina, setPagina] = useState(0)
  const paginas = Math.max(1, Math.ceil(areas.length / POR_PAGINA))
  const pagSegura = Math.min(pagina, paginas - 1)
  const desde = pagSegura * POR_PAGINA
  const paginaAreas = useMemo(
    () => areas.slice(desde, desde + POR_PAGINA).map((a) => ({ ...a, corto: corto(a.area) })),
    [areas, desde]
  )

  const usuarios = areaActiva?.usuarios ?? []

  const usuarioActivo = useMemo(
    () => usuarios.find((u) => u.usuario === usuarioSel) ?? usuarios[0] ?? null,
    [usuarios, usuarioSel]
  )

  const totalAreas = areas.reduce((a, b) => a + b.total, 0)
  const nombreUsuario = (u) => (esSinAuditoria(u) ? 'Sin auditoria NDD' : u?.nombre && u.nombre !== '-' ? u.nombre : u?.usuario ?? '—')
  const iniciales = (u) => {
    if (esSinAuditoria(u)) return '?'
    const partes = nombreUsuario(u).split(/[\s._-]+/).filter(Boolean)
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
  }

  return (
    <>
    {mostrarRanking && (
    <Card
      title={`Reparto por area (${areas.length} areas)`}
      subtitle="Volumen facturado del contador SDS atribuido a cada area. Clic en una barra para abrir su detalle."
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
        <p className="text-xs text-slate-400 py-8 text-center">Sin consumo para los filtros aplicados.</p>
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
                  if (clave) elegirArea(clave)
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
                <Bar dataKey="total" name="Páginas facturadas" maxBarSize={72}>
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
              Total facturado del periodo: <strong className="text-slate-700">{fInt(totalAreas)}</strong> págs
            </span>
          </div>
        </>
      )}
    </Card>
    )}


    <Card
      title="Consumo por área, usuario y trabajo"
      subtitle="Reparto del volumen facturado entre los usuarios que NDD identificó en las impresoras de esa área"
      right={areaActiva ? <Badge tone="azul">{titulo(areaActiva.area)}</Badge> : null}
    >
      {!areaActiva ? (
        <p className="text-xs text-slate-400 py-8 text-center">Sin consumo para los filtros aplicados.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { l: 'Páginas del área', v: fInt(areaActiva.total), s: `${fPct(totalAreas ? areaActiva.total / totalAreas : 0)} del total facturado` },
              { l: 'Monocromo / color', v: `${fInt(areaActiva.mono)} / ${fInt(areaActiva.color)}`, s: `${fPct(areaActiva.total ? areaActiva.color / areaActiva.total : 0)} en color` },
              { l: 'Usuarios atribuidos', v: fInt(areaActiva.usuarios.filter((u) => !esSinAuditoria(u)).length), s: `${areaActiva.equipos} equipo(s)` },
              { l: 'Trabajos enviados', v: fInt(areaActiva.jobs), s: areaActiva.jobs ? `${fInt(areaActiva.total / areaActiva.jobs)} págs por trabajo` : 'sin registro NDD' },
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

          {areaActiva.sinAuditoria > 0 && (
            <div className="mb-3 flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 shrink-0 mt-px" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4.5m0 3.5h.01" strokeLinecap="round" />
              </svg>
              <div className="min-w-0">
                <p>
                  <strong>{fInt(areaActiva.sinAuditoria)} páginas sin auditoría</strong> en esta área. El contador SDS las facturó, pero no
                  hay base suficiente en NDD para saber quién las imprimió, así que se muestran en una fila propia en vez de repartirse a
                  ciegas: el total del área sigue cuadrando con la factura.
                </p>
                {areaActiva.motivosSinAuditoria.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {areaActiva.motivosSinAuditoria.map((s) => (
                      <li key={`${s.serie}-${s.periodo}`} className="num text-[10px] text-amber-700">
                        <span className="font-mono font-semibold">{s.serie}</span>
                        {' · '}
                        {s.modo === MODO.bajaCobertura ? (
                          <>
                            NDD solo cubre {fPct(s.cobertura)} de sus {fInt(s.sdsTotal)} págs (
                            {fInt(s.nddTotal)} registradas): extrapolarlo multiplicaría por{' '}
                            {(s.sdsTotal / s.nddTotal).toFixed(1)}x
                          </>
                        ) : (
                          <>NDD no registró ningún trabajo en sus {fInt(s.sdsTotal)} págs facturadas</>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Usuarios de {titulo(areaActiva.area)} · clic en una fila para abrir el detalle de sus trabajos
              </p>
              <Tabla
                maxAltura="420px"
                initialSort={{ key: 'total', dir: 'desc' }}
                onFila={(r) => {
                  setUsuarioSel(r.usuario)
                  if (onUsuario && !esSinAuditoria(r)) onUsuario(r)
                }}
                filaActiva={usuarioActivo?.usuario}
                vacio="Ningún usuario coincide con la búsqueda."
                columnas={[
                  {
                    key: 'nombre',
                    label: 'Usuario',
                    render: (r) => {
                      const sel = r.usuario === usuarioActivo?.usuario
                      const sinAud = esSinAuditoria(r)
                      return (
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`w-1 h-7 rounded-full shrink-0 ${sel ? 'bg-mt-blue' : 'bg-transparent'}`} />
                          <span className="block min-w-0">
                            <span
                              className={`truncate max-w-[160px] inline-block align-bottom ${
                                sinAud ? 'font-semibold text-amber-700 italic' : sel ? 'font-bold text-mt-blue' : 'font-semibold text-slate-800'
                              }`}
                            >
                              {nombreUsuario(r)}
                            </span>
                            {sinAud ? (
                              <span className="block text-[10px] text-amber-600">impresora sin registro NDD</span>
                            ) : (
                              r.nombre !== '-' &&
                              r.nombre !== r.usuario && (
                                <span className="block text-[10px] text-slate-400 truncate max-w-[160px]">{r.usuario}</span>
                              )
                            )}
                          </span>
                        </span>
                      )
                    }
                  },
                  { key: 'jobs', label: 'Trab.', align: 'right', render: (r) => (esSinAuditoria(r) ? '—' : fInt(r.jobs)) },
                  { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
                  { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
                  { key: 'total', label: 'Págs', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.total)}</strong> },
                  { key: 'costo', label: 'Costo', align: 'right', render: (r) => <span className="font-semibold text-mt-blue">{fMoney(r.costo)}</span> }
                ]}
                filas={usuarios}
                pie={{
                  nombre: `TOTAL · ${usuarios.length} filas`,
                  jobs: fInt(usuarios.reduce((a, b) => a + b.jobs, 0)),
                  mono: fInt(usuarios.reduce((a, b) => a + b.mono, 0)),
                  color: fInt(usuarios.reduce((a, b) => a + b.color, 0)),
                  total: fInt(usuarios.reduce((a, b) => a + b.total, 0)),
                  costo: fMoney(usuarios.reduce((a, b) => a + b.costo, 0))
                }}
              />
            </div>

          <div className="grid grid-cols-1 gap-3 mt-3">
            <Nota tono="azul" titulo="Cómo se reparte este consumo" icono="▸">
              El <strong>100% es el contador SDS</strong>, que es lo que se factura. NDD solo aporta la proporción en que cada usuario usó
              esa impresora, y esa proporción se aplica al volumen del contador. B/N y color se reparten por separado. Tarifas:{' '}
              <strong className="num">{fTarifa(tarifas.bn)}</strong> B/N y <strong className="num">{fTarifa(tarifas.color)}</strong> color;
              la <strong>{tarifas.nombreA3}</strong> factura su color a{' '}
              <strong className="num">{fTarifa(tarifas.colorA3)}</strong>.
              {areaActiva.area === FUERA_CONTRATO ? ' Estas series imprimen pero no están en el contrato.' : ''}
            </Nota>
          </div>
        </>
      )}
    </Card>
    </>
  )
}
