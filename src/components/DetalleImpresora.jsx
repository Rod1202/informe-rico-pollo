import React, { useMemo, useState } from 'react'
import { Card, Tabla, Badge, Buscador, normaliza } from './ui.jsx'
import { agruparPersonas, usuariosDePersonas, balde, ES_RESIDUAL } from '../lib/organizacion.js'
import { nombreGerencia } from './GerenciasBarra.jsx'
import { fInt, fMoney, fPct, titulo } from '../lib/format.js'

const nombreDe = (u) => (u?.nombre && u.nombre !== '-' ? u.nombre : u?.usuario ?? '—')

// Quien imprime en una impresora concreta: primero las gerencias que la usan,
// y dentro de la elegida sus usuarios.
export default function DetalleImpresora({ serie, info, asignado, padron, tarifas, onUsuario, onCerrar }) {
  const [gerSel, setGerSel] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const deEstaSerie = useMemo(() => asignado.filter((a) => a.serie === serie), [asignado, serie])

  const gerencias = useMemo(
    () => agruparPersonas(deEstaSerie, [], padron, 'gerencia', tarifas).filter((g) => g.volumetria > 0),
    [deEstaSerie, padron, tarifas]
  )

  const gerenciaActiva = gerSel && gerencias.some((g) => g.clave === gerSel) ? gerSel : null

  const usuarios = useMemo(() => {
    const base = usuariosDePersonas(deEstaSerie, padron, tarifas, { gerencia: gerenciaActiva })
    const q = normaliza(busqueda)
    if (!q) return base
    return base.filter((u) => normaliza(nombreDe(u)).includes(q) || normaliza(u.usuario).includes(q))
  }, [deEstaSerie, padron, tarifas, gerenciaActiva, busqueda])

  const total = gerencias.reduce((a, b) => a + b.volumetria, 0)
  const costo = gerencias.reduce((a, b) => a + b.facturacion, 0)

  return (
    <Card
      title={`Quién imprime en ${serie}`}
      subtitle={
        info
          ? `${titulo(info.ubicacion ?? info.area ?? '—')} · ${info.modelo ?? ''} · ${titulo(info.sede ?? '—')}. Clic en una gerencia para ver solo sus usuarios.`
          : 'Impresora fuera del catálogo del contrato.'
      }
      right={
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Badge tone="azul">{fInt(total)} págs · {fMoney(costo)}</Badge>
          <button
            type="button"
            onClick={onCerrar}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-mt-blue/30 bg-mt-blueTint text-mt-blue hover:bg-mt-blue hover:text-white transition-colors"
          >
            cerrar ✕
          </button>
        </div>
      }
    >
      {!gerencias.length ? (
        <p className="text-xs text-slate-400 py-8 text-center">
          Esta impresora factura volumen pero NDD no registró quién imprimió, así que no hay a quién atribuirlo.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Gerencias que imprimen acá ({gerencias.length})
            </p>
            <Tabla
              maxAltura="330px"
              initialSort={{ key: 'volumetria', dir: 'desc' }}
              onFila={(r) => setGerSel((p) => (p === r.clave ? null : r.clave))}
              filaActiva={gerenciaActiva}
              columnas={[
                {
                  key: 'clave',
                  label: 'Gerencia',
                  render: (r) => (
                    <span
                      className={`truncate max-w-[200px] inline-block align-bottom ${
                        r.clave === gerenciaActiva ? 'font-bold text-mt-blue' : r.residual ? 'text-amber-700 italic' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {nombreGerencia(r.clave)}
                    </span>
                  )
                },
                { key: 'usuarios', label: 'Usuarios', align: 'right', render: (r) => fInt(r.usuarios) },
                { key: 'volumetria', label: 'Págs', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.volumetria)}</strong> },
                { key: 'pct', label: '% de la impresora', align: 'right', sortValue: (r) => r.volumetria, render: (r) => fPct(total ? r.volumetria / total : 0) },
                { key: 'facturacion', label: 'Costo', align: 'right', render: (r) => <span className="font-semibold text-mt-blue">{fMoney(r.facturacion)}</span> }
              ]}
              filas={gerencias.map((g) => ({ ...g, __key: g.clave }))}
              pie={{
                clave: `TOTAL · ${gerencias.length}`,
                usuarios: fInt(gerencias.reduce((a, b) => a + b.usuarios, 0)),
                volumetria: fInt(total),
                pct: '100.00%',
                facturacion: fMoney(costo)
              }}
            />
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {gerenciaActiva ? `Usuarios de ${nombreGerencia(gerenciaActiva)}` : 'Todos los usuarios de esta impresora'}
                {' · clic en una fila para ver sus trabajos'}
              </p>
              <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar usuario…" ancho="w-full sm:w-44" />
            </div>
            <Tabla
              maxAltura="330px"
              initialSort={{ key: 'total', dir: 'desc' }}
              onFila={(r) => (onUsuario && !ES_RESIDUAL(balde(r, padron, 'gerencia')) ? onUsuario(r) : null)}
              vacio={busqueda ? `Ningún usuario coincide con «${busqueda}».` : 'Sin usuarios para esta selección.'}
              columnas={[
                {
                  key: 'nombre',
                  label: 'Usuario',
                  render: (r) => (
                    <span className="block min-w-0">
                      <span className="font-semibold text-slate-800 truncate max-w-[200px] inline-block align-bottom">{nombreDe(r)}</span>
                      <span className="block text-[10px] text-slate-400 truncate max-w-[200px]">
                        {nombreGerencia(padron[String(r.usuario).toLowerCase()]?.g ?? '—')}
                      </span>
                    </span>
                  )
                },
                { key: 'jobs', label: 'Trab.', align: 'right', render: (r) => fInt(r.jobs) },
                { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
                { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
                { key: 'total', label: 'Págs', align: 'right', render: (r) => <strong className="text-slate-900">{fInt(r.total)}</strong> },
                { key: 'pct', label: '% de la impresora', align: 'right', sortValue: (r) => r.total, render: (r) => fPct(total ? r.total / total : 0) },
                { key: 'costo', label: 'Costo', align: 'right', render: (r) => <span className="font-semibold text-mt-blue">{fMoney(r.costo)}</span> }
              ]}
              filas={usuarios}
              pie={{
                nombre: `TOTAL · ${usuarios.length} usuarios`,
                jobs: fInt(usuarios.reduce((a, b) => a + b.jobs, 0)),
                mono: fInt(usuarios.reduce((a, b) => a + b.mono, 0)),
                color: fInt(usuarios.reduce((a, b) => a + b.color, 0)),
                total: fInt(usuarios.reduce((a, b) => a + b.total, 0)),
                pct: fPct(total ? usuarios.reduce((a, b) => a + b.total, 0) / total : 0),
                costo: fMoney(usuarios.reduce((a, b) => a + b.costo, 0))
              }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
