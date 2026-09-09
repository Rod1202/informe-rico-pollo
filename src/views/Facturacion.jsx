import React, { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ComposedChart, Line, ReferenceLine } from 'recharts'
import { Card, Tabla, Leyenda, TooltipBox, Nota, Delta, Semaforo } from '../components/ui.jsx'
import { C, CAT } from '../lib/palette.js'
import { agrupar } from '../lib/measures.js'
import { fInt, fMoney, fMoney3, fPct, fCompact, titulo } from '../lib/format.js'

export default function Facturacion({ ctx }) {
  const { rows, m, mensual, actual, tarifas, totalContexto, costosModelo, esAcumulado, ytd } = ctx

  const porSede = useMemo(() => agrupar(rows, 'sede', tarifas, totalContexto), [rows, tarifas, totalContexto])
  const porArea = useMemo(() => agrupar(rows, 'area', tarifas, totalContexto), [rows, tarifas, totalContexto])
  const porModelo = useMemo(() => agrupar(rows, 'modelo', tarifas, totalContexto), [rows, tarifas, totalContexto])

  const meses = mensual.serie.filter((s) => s.tiene)
  const datos = meses.map((s) => ({
    label: s.label,
    clicBN: +s.clicBN.toFixed(2),
    clicColor: +s.clicColor.toFixed(2),
    fijo: +s.cargoFijo.toFixed(2),
    total: s.facturacion,
    costo: +s.costoPagina.toFixed(4)
  }))

  const areasFiltradas = useMemo(() => porArea.map((a) => ({ ...a, __key: a.clave })), [porArea])

  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { l: 'Facturación del periodo', v: fMoney(m.facturacion), s: esAcumulado ? `${mensual.mesesEvaluados} meses` : actual?.largo },
          { l: 'Clic B/N', v: fMoney(m.clicBN), s: `${fPct(m.pctFactBN)} del clic` },
          { l: 'Clic color', v: fMoney(m.clicColor), s: `${fPct(m.pctFactColor)} del clic` },
          { l: 'Cargo fijo', v: fMoney(m.cargoFijo), s: `${fPct(m.pctCargoFijo)} de la factura` },
          { l: 'Costo por página', v: fMoney3(m.costoPagina), s: 'incluye cargo fijo' },
          { l: 'Facturación por equipo', v: fMoney(m.factPorEquipo), s: `sobre ${m.equiposActivos} activos` }
        ].map((k) => (
          <div key={k.l} className="card p-3.5">
            <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">{k.l}</p>
            <p className="text-lg font-bold text-slate-900 num mt-1">{k.v}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 first-letter:uppercase">{k.s}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7" title="Estructura de la factura mes a mes" subtitle="Clic B/N, clic color y cargo fijo apilados">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 18, right: 10, left: -4, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} tickFormatter={(v) => `$${fCompact(v)}`} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<TooltipBox formato={fMoney} />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
                <Bar dataKey="clicBN" name="Clic B/N" stackId="f" fill={CAT[0]} maxBarSize={64} />
                <Bar dataKey="clicColor" name="Clic color" stackId="f" fill={CAT[2]} maxBarSize={64} />
                <Bar dataKey="fijo" name="Cargo fijo" stackId="f" fill={CAT[1]} radius={[4, 4, 0, 0]} maxBarSize={64}>
                  <LabelList
                    position="top"
                    valueAccessor={(e) => e.payload.total}
                    formatter={(v) => `$${fCompact(v)}`}
                    style={{ fontSize: 10, fill: C.text, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Leyenda
            className="mt-2 justify-center"
            items={[
              { label: 'Clic B/N', color: CAT[0], value: fMoney(m.clicBN) },
              { label: 'Clic color', color: CAT[2], value: fMoney(m.clicColor) },
              { label: 'Cargo fijo', color: CAT[1], value: fMoney(m.cargoFijo) }
            ]}
          />
        </Card>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <Card title="Costo por página" subtitle="Cuánto cuesta realmente cada hoja, con la base incluida">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={datos} margin={{ top: 26, right: 18, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: C.axis }} tickFormatter={(v) => `$${v.toFixed(3)}`} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<TooltipBox formato={fMoney3} />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="costo" name="Costo por página" stroke={C.blue} strokeWidth={2.5} dot={{ r: 4, fill: '#fff', stroke: C.blue, strokeWidth: 2.5 }}>
                    <LabelList dataKey="costo" position="top" offset={10} formatter={fMoney3} style={{ fontSize: 10, fill: C.text, fontWeight: 700 }} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Tarifas de contrato" subtitle="Tabla de parámetros — cambiarlas recalcula todo el informe">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { l: 'Clic B/N', v: tarifas.bn },
                { l: 'Clic color', v: tarifas.color },
                { l: 'Color A3', v: tarifas.colorA3 }
              ].map((t) => (
                <div key={t.l} className="rounded-xl border border-slate-200 bg-slate-50 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t.l}</p>
                  <p className="text-sm font-bold text-slate-900 num mt-1">${t.v.toFixed(5)}</p>
                </div>
              ))}
            </div>
            <Nota tono="azul" titulo="Regla A3" icono="▸">
              La serie <strong className="font-mono">{tarifas.serieA3}</strong> factura el clic color a{' '}
              <strong className="num">${tarifas.colorA3.toFixed(2)}</strong> (adicional A3). El resto del parque va a{' '}
              <strong className="num">${tarifas.color.toFixed(5)}</strong>. Validado contra el importe de origen:{' '}
              <strong className="num">{fMoney(m.difClicOrigen)}</strong> de diferencia.
            </Nota>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-6" title="Facturación por sede" subtitle="Participación y costo unitario de cada sede">
          <Tabla
            initialSort={{ key: 'facturacion', dir: 'desc' }}
            columnas={[
              { key: 'clave', label: 'Sede', render: (r) => <span className="font-semibold text-slate-800">{titulo(r.clave)}</span> },
              { key: 'equiposTotales', label: 'Equipos', align: 'right' },
              { key: 'volumetria', label: 'Páginas', align: 'right', render: (r) => fInt(r.volumetria) },
              { key: 'clicVariable', label: 'Clic', align: 'right', render: (r) => fMoney(r.clicVariable) },
              { key: 'cargoFijo', label: 'Cargo fijo', align: 'right', render: (r) => fMoney(r.cargoFijo) },
              { key: 'facturacion', label: 'Total', align: 'right', render: (r) => <strong>{fMoney(r.facturacion)}</strong> },
              { key: 'pctParticipacionFact', label: '% fact.', align: 'right', render: (r) => fPct(r.pctParticipacionFact, 0) },
              { key: 'costoPagina', label: '$/pág', align: 'right', render: (r) => (r.volumetria ? fMoney3(r.costoPagina) : '—') }
            ]}
            filas={porSede.map((r) => ({ ...r, __key: r.clave }))}
            pie={{
              clave: 'TOTAL',
              equiposTotales: m.equiposTotales,
              volumetria: fInt(m.volumetria),
              clicVariable: fMoney(m.clicVariable),
              cargoFijo: fMoney(m.cargoFijo),
              facturacion: fMoney(m.facturacion),
              pctParticipacionFact: fPct(m.facturacion / (totalContexto.facturacion || 1)),
              costoPagina: fMoney3(m.costoPagina)
            }}
          />
        </Card>

        <Card className="lg:col-span-6" title="Cargo fijo por modelo" subtitle="Base contratada y su peso en la factura">
          <Tabla
            maxAltura="330px"
            initialSort={{ key: 'cargoFijo', dir: 'desc' }}
            columnas={[
              { key: 'clave', label: 'Modelo', render: (r) => <span className="font-medium text-slate-800 truncate max-w-[210px] inline-block align-bottom" title={r.clave}>{r.clave}</span> },
              { key: 'equiposTotales', label: 'Equipos', align: 'right' },
              {
                key: 'baseUnit',
                label: 'Base unitaria',
                align: 'right',
                sortValue: (r) => costosModelo.find((c) => c.modelo === r.clave)?.base ?? 0,
                render: (r) => fMoney(costosModelo.find((c) => c.modelo === r.clave)?.base ?? 0)
              },
              { key: 'cargoFijo', label: 'Cargo fijo', align: 'right', render: (r) => fMoney(r.cargoFijo) },
              { key: 'facturacion', label: 'Total', align: 'right', render: (r) => <strong>{fMoney(r.facturacion)}</strong> },
              { key: 'pctCargoFijo', label: '% fijo', align: 'right', render: (r) => fPct(r.pctCargoFijo, 0) },
              { key: 'costoPagina', label: '$/pág', align: 'right', render: (r) => (r.volumetria ? fMoney3(r.costoPagina) : '—') }
            ]}
            filas={porModelo.map((r) => ({ ...r, __key: r.clave }))}
          />
        </Card>
      </section>

      <Card
        title={`Facturación por área (${areasFiltradas.length})`}
        subtitle="Ordenable · el buscador del encabezado filtra esta tabla"
      >
        <Tabla
          maxAltura="420px"
          initialSort={{ key: 'facturacion', dir: 'desc' }}
          columnas={[
            { key: 'clave', label: 'Área', render: (r) => <span className="font-semibold text-slate-800">{titulo(r.clave)}</span> },
            { key: 'equiposTotales', label: 'Equipos', align: 'right' },
            { key: 'volBN', label: 'B/N', align: 'right', render: (r) => fInt(r.volBN) },
            { key: 'volColor', label: 'Color', align: 'right', render: (r) => fInt(r.volColor) },
            { key: 'volumetria', label: 'Páginas', align: 'right', render: (r) => fInt(r.volumetria) },
            { key: 'pctParticipacionVol', label: '% vol', align: 'right', render: (r) => fPct(r.pctParticipacionVol) },
            { key: 'clicVariable', label: 'Clic', align: 'right', render: (r) => fMoney(r.clicVariable) },
            { key: 'cargoFijo', label: 'Cargo fijo', align: 'right', render: (r) => fMoney(r.cargoFijo) },
            { key: 'facturacion', label: 'Total', align: 'right', render: (r) => <strong>{fMoney(r.facturacion)}</strong> },
            { key: 'pctParticipacionFact', label: '% fact', align: 'right', render: (r) => fPct(r.pctParticipacionFact) },
            { key: 'costoPagina', label: '$/pág', align: 'right', render: (r) => (r.volumetria ? fMoney3(r.costoPagina) : '—') }
          ]}
          filas={areasFiltradas}
        />
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Nota tono={m.equiposSinActividad ? 'aviso' : 'ok'} titulo="Cargo fijo sin actividad" icono="▸">
          <strong className="num">{fMoney(m.cargoFijoSinActividad)}</strong> pagados por {m.equiposSinActividad} equipos que no imprimieron
          una sola página en el contexto seleccionado ({fPct(m.facturacion ? m.cargoFijoSinActividad / m.facturacion : 0)} de la factura).
        </Nota>
        <Nota tono="neutro" titulo="Variación mensual" icono="▸">
          {actual ? (
            <>
              Facturación <Delta value={actual.pctVarFacturacionMoM} /> · volumen <Delta value={actual.pctVarVolumetriaMoM} />. Contra el
              promedio del periodo: <strong className="num">{actual.pctVarVsPromFacturacion !== null ? fPct(actual.pctVarVsPromFacturacion) : '—'}</strong>.
            </>
          ) : (
            <>Vista acumulada de {mensual.mesesEvaluados} meses: promedio {fMoney(mensual.promedioFacturacion)}/mes.</>
          )}
        </Nota>
        <Nota tono="azul" titulo="Acumulado del año (YTD)" icono="▸">
          Hasta {ytd.hasta}: <strong className="num">{fInt(ytd.volumetria)}</strong> páginas y{' '}
          <strong className="num">{fMoney(ytd.facturacion)}</strong> facturados.
        </Nota>
      </section>
    </>
  )
}
