import React, { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts'
import { Card, Tabla, Badge, Leyenda, TooltipBox, Ring, Semaforo } from '../components/ui.jsx'
import { C, CAT, RAMPA, ESTADO, rampaColor } from '../lib/palette.js'
import { agrupar, medidas, filtrar } from '../lib/measures.js'
import { fInt, fMoney, fPct, fCompact, titulo } from '../lib/format.js'

export default function Volumetria({ ctx }) {
  const { rows, m, mensual, tarifas, contador, filtros, totalContexto, esAcumulado } = ctx

  const porSede = useMemo(() => agrupar(rows, 'sede', tarifas, totalContexto), [rows, tarifas, totalContexto])
  const porArea = useMemo(() => agrupar(rows, 'area', tarifas, totalContexto), [rows, tarifas, totalContexto])
  const porModelo = useMemo(() => agrupar(rows, 'modelo', tarifas, totalContexto), [rows, tarifas, totalContexto])

  const equipos = useMemo(() => {
    const g = agrupar(rows, 'serie', tarifas, totalContexto).map((s) => {
      const r0 = s.rows[0]
      return {
        __key: s.clave,
        serie: s.clave,
        sede: r0.sede,
        area: r0.area,
        modelo: r0.modelo,
        estado: r0.estado,
        bn: s.volBN,
        color: s.volColor,
        total: s.volumetria,
        base: s.cargoFijo,
        facturacion: s.facturacion,
        participacion: s.pctParticipacionVol,
        activo: s.volumetria > 0
      }
    })
    return g
  }, [rows, tarifas, totalContexto])

  const mensualBNColor = mensual.serie
    .filter((s) => s.tiene)
    .map((s) => ({ label: s.label, bn: s.volBN, color: s.volColor }))

  const topAreas = porArea.slice(0, 12).map((a) => ({ ...a, nombre: titulo(a.clave) }))
  const maxArea = topAreas[0]?.volumetria || 1

  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { l: 'Volumetría total', v: fInt(m.volumetria), s: 'páginas del contexto' },
          { l: 'Volumen B/N', v: fInt(m.volBN), s: `${fPct(m.pctVolBN)} del total` },
          { l: 'Volumen color', v: fInt(m.volColor), s: `${fPct(m.pctVolColor)} del total` },
          { l: 'Páginas por equipo', v: fInt(m.volPorEquipo), s: `sobre ${m.equiposActivos} activos` },
          { l: 'Equipos activos', v: `${m.equiposActivos}/${m.equiposTotales}`, s: fPct(m.pctEquiposActivos) },
          { l: 'Sin actividad', v: String(m.equiposSinActividad), s: `${fMoney(m.cargoFijoSinActividad)} de base ociosa` }
        ].map((k) => (
          <div key={k.l} className="card p-3.5">
            <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">{k.l}</p>
            <p className="text-lg font-bold text-slate-900 num mt-1">{k.v}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.s}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-5" title="Volumetría por sede" subtitle="Participación sobre el total visible">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porSede.map((s) => ({ nombre: titulo(s.clave), bn: s.volBN, color: s.volColor }))} margin={{ top: 16, right: 8, left: -6, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
                <Bar dataKey="bn" name="B/N" stackId="v" fill={CAT[0]} maxBarSize={56} />
                <Bar dataKey="color" name="Color" stackId="v" fill={CAT[1]} radius={[4, 4, 0, 0]} maxBarSize={56}>
                  <LabelList
                    position="top"
                    valueAccessor={(e) => e.payload.bn + e.payload.color}
                    formatter={fInt}
                    style={{ fontSize: 10, fill: C.text, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Leyenda className="mt-2 justify-center" items={[{ label: 'Monocromo', color: CAT[0] }, { label: 'Color', color: CAT[1] }]} />
        </Card>

        <Card className="lg:col-span-7" title="Volumetría mensual por tipo de página" subtitle="Monocromo y color, mes a mes">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mensualBNColor} margin={{ top: 16, right: 8, left: -6, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
                <Bar dataKey="bn" name="Monocromo" fill={CAT[0]} radius={[4, 4, 0, 0]} maxBarSize={44}>
                  <LabelList dataKey="bn" position="top" formatter={fCompact} style={{ fontSize: 9, fill: C.textMuted, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="color" name="Color" fill={CAT[1]} radius={[4, 4, 0, 0]} maxBarSize={44}>
                  <LabelList dataKey="color" position="top" formatter={fCompact} style={{ fontSize: 9, fill: C.textMuted, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Leyenda className="mt-2 justify-center" items={[{ label: 'Monocromo', color: CAT[0] }, { label: 'Color', color: CAT[1] }]} />
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-5" title="Top áreas por volumen" subtitle="Intensidad proporcional al volumen (rampa azul)">
          <div className="space-y-1.5">
            {topAreas.map((a) => (
              <div key={a.clave} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-[11px] text-slate-600 truncate" title={a.nombre}>
                  {a.nombre}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div
                    className="h-3.5 rounded-full"
                    style={{ width: `${(a.volumetria / maxArea) * 100}%`, background: rampaColor(a.volumetria / maxArea) }}
                  />
                </div>
                <span className="w-16 text-right text-[11px] font-semibold text-slate-700 num">{fInt(a.volumetria)}</span>
                <span className="w-12 text-right text-[10px] text-slate-400 num">{fPct(a.pctParticipacionVol, 0)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-7" title="Volumetría por modelo de equipo" subtitle="Detecta sobredimensionamiento del parque">
          <Tabla
            maxAltura="330px"
            initialSort={{ key: 'volumetria', dir: 'desc' }}
            columnas={[
              { key: 'clave', label: 'Modelo', render: (r) => <span className="font-medium text-slate-800">{r.clave}</span> },
              { key: 'equiposTotales', label: 'Equipos', align: 'right' },
              { key: 'equiposSinActividad', label: 'Sin uso', align: 'right', render: (r) => (r.equiposSinActividad ? <span className="text-amber-600 font-semibold">{r.equiposSinActividad}</span> : '0') },
              { key: 'volBN', label: 'B/N', align: 'right', render: (r) => fInt(r.volBN) },
              { key: 'volColor', label: 'Color', align: 'right', render: (r) => fInt(r.volColor) },
              { key: 'volumetria', label: 'Total págs', align: 'right', render: (r) => <strong>{fInt(r.volumetria)}</strong> },
              { key: 'pctParticipacionVol', label: '% part.', align: 'right', render: (r) => fPct(r.pctParticipacionVol) },
              { key: 'volPorEquipo', label: 'Págs/eq.', align: 'right', render: (r) => fInt(r.volPorEquipo) }
            ]}
            filas={porModelo.map((r) => ({ ...r, __key: r.clave }))}
            pie={{
              clave: 'TOTAL',
              equiposTotales: m.equiposTotales,
              equiposSinActividad: m.equiposSinActividad,
              volBN: fInt(m.volBN),
              volColor: fInt(m.volColor),
              volumetria: fInt(m.volumetria),
              pctParticipacionVol: fPct(m.volumetria / (totalContexto.volumetria || 1)),
              volPorEquipo: fInt(m.volPorEquipo)
            }}
          />
        </Card>
      </section>

      <Card
        title={`Detalle por equipo (${equipos.length} series)`}
        subtitle="Una fila por impresora del contexto seleccionado"
      >
        <Tabla
          maxAltura="460px"
          initialSort={{ key: 'total', dir: 'desc' }}
          columnas={[
            { key: 'serie', label: 'Serie', render: (r) => <span className="font-mono text-[11px] font-semibold text-slate-800">{r.serie}</span> },
            { key: 'sede', label: 'Sede', render: (r) => titulo(r.sede) },
            { key: 'area', label: 'Área', render: (r) => <span className="truncate max-w-[180px] inline-block align-bottom">{titulo(r.area)}</span> },
            { key: 'modelo', label: 'Modelo', render: (r) => <span className="text-slate-500 truncate max-w-[230px] inline-block align-bottom">{r.modelo}</span> },
            { key: 'estado', label: 'Estado', render: (r) => <Badge tone={r.estado === 'BACKUP' ? 'neutro' : 'azul'}>{r.estado}</Badge> },
            { key: 'bn', label: 'B/N', align: 'right', render: (r) => fInt(r.bn) },
            { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
            { key: 'total', label: 'Total págs', align: 'right', render: (r) => <strong>{fInt(r.total)}</strong> },
            { key: 'participacion', label: '% part.', align: 'right', render: (r) => fPct(r.participacion, 2) },
            { key: 'base', label: 'Cargo fijo', align: 'right', render: (r) => fMoney(r.base) },
            { key: 'facturacion', label: 'Facturado', align: 'right', render: (r) => fMoney(r.facturacion) },
            {
              key: 'activo',
              label: 'Actividad',
              render: (r) => (r.activo ? <Semaforo estado="ok">Activo</Semaforo> : <Semaforo estado="aviso">Sin uso</Semaforo>)
            }
          ]}
          filas={equipos}
        />
      </Card>
    </>
  )
}
