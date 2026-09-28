import React, { useCallback, useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, AreaChart, Area } from 'recharts'
import { Card, Tabla, Leyenda, TooltipBox, Nota, Semaforo, Ring } from '../components/ui.jsx'
import PanelAreas from '../components/PanelAreas.jsx'
import { C, CAT, ESTADO } from '../lib/palette.js'
import { nddAgrupar } from '../lib/measures.js'
import { trabajosProrrateados } from '../lib/prorrateo.js'
import { fInt, fMoney, fTarifa, fPct, fCompact, fFecha, fSigned, titulo } from '../lib/format.js'

export default function Auditoria({ ctx }) {
  const {
    m, auditoria, ndd, periodos, periodosSel, periodosInfo, meta, mensual, tarifas,
    atribucion, areasAtribuidas
  } = ctx

  const trabajosDe = useCallback(
    (area, usuario) => trabajosProrrateados(atribucion, ndd.porTrabajo, area, usuario, periodosSel, tarifas),
    [atribucion, ndd.porTrabajo, periodosSel, tarifas]
  )

  const comparativo = useMemo(
    () =>
      periodos
        .filter((p) => periodosSel.includes(p.key))
        .map((p) => {
          const sds = mensual.serie.find((s) => s.periodo === p.key)
          const nd = ndd.porPeriodo.find((x) => x.periodo === p.key)
          return {
            label: p.label,
            sds: sds?.volumetria ?? 0,
            ndd: nd?.total ?? 0,
            parcial: p.nddParcial
          }
        }),
    [periodos, periodosSel, mensual.serie, ndd.porPeriodo]
  )

  const filas = useMemo(() => auditoria.filas.map((f) => ({ ...f, __key: f.serie })), [auditoria.filas])

  const usuariosGlobal = useMemo(() => nddAgrupar(ndd.porUsuario, 'usuario', periodosSel).slice(0, 15), [ndd.porUsuario, periodosSel])
  const duplex = useMemo(() => nddAgrupar(ndd.porDuplex, 'duplex', periodosSel), [ndd.porDuplex, periodosSel])
  const modos = useMemo(() => nddAgrupar(ndd.porModo, 'modo', periodosSel), [ndd.porModo, periodosSel])
  const tipos = useMemo(() => nddAgrupar(ndd.porTipo, 'tipo', periodosSel), [ndd.porTipo, periodosSel])
  const papeles = useMemo(() => nddAgrupar(ndd.porPapel, 'papel', periodosSel).slice(0, 6), [ndd.porPapel, periodosSel])
  const diario = useMemo(() => ndd.porDia.filter((d) => periodosSel.includes(d.periodo)), [ndd.porDia, periodosSel])

  const totJobs = duplex.reduce((a, b) => a + b.jobs, 0) || 1
  const contadorOk = m.difContadorBN === 0 && m.difContadorColor === 0
  const clicOk = Math.abs(m.difClicOrigen) < 0.005


  return (
    <>
      
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card
          className="lg:col-span-7"
          title="Auditoría del contador (origen SDS)"
          subtitle="(Fin − Inicio) − Páginas debe dar cero en ambos contadores"
          right={<Semaforo estado={contadorOk && clicOk ? 'ok' : 'grave'}>{contadorOk && clicOk ? 'Conforme' : 'Con hallazgos'}</Semaforo>}
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { l: 'Dif. contador B/N', v: fInt(m.difContadorBN), ok: m.difContadorBN === 0 },
              { l: 'Dif. contador color', v: fInt(m.difContadorColor), ok: m.difContadorColor === 0 },
              { l: 'Equipos con descuadre', v: String(m.equiposInconsistencia), ok: m.equiposInconsistencia === 0 },
              { l: 'Clic variable calculado', v: fMoney(m.clicVariable), ok: true },
              { l: 'Dif. clic vs origen', v: fMoney(m.difClicOrigen), ok: clicOk }
            ].map((k) => (
              <div key={k.l} className={`rounded-xl border p-3 ${k.ok ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50'}`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{k.l}</p>
                <p className={`text-sm font-bold num mt-1 ${k.ok ? 'text-slate-900' : 'text-rose-700'}`}>{k.v}</p>
              </div>
            ))}
          </div>
          <Nota tono={clicOk ? 'ok' : 'grave'} titulo={clicOk ? 'Recálculo validado' : 'Recálculo con desviación'} icono="▸">
            El importe recalculado con las tarifas de contrato (incluida la regla A3 de $0.19 para la serie BRCST7Q0HB) coincide con el
            importe que trae el origen: diferencia de <strong className="num">{fMoney(m.difClicOrigen)}</strong> sobre{' '}
            <strong className="num">{fMoney(m.clicOrigen)}</strong>.
          </Nota>

          <div className="mt-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Control mes a mes</p>
            <Tabla
              initialSort={{ key: 'periodo', dir: 'asc' }}
              columnas={[
                { key: 'periodo', label: 'Mes', render: (r) => <span className="font-semibold text-slate-800">{r.label}</span> },
                { key: 'difContadorBN', label: 'Dif. B/N', align: 'right', render: (r) => fInt(r.difContadorBN) },
                { key: 'difContadorColor', label: 'Dif. color', align: 'right', render: (r) => fInt(r.difContadorColor) },
                { key: 'equiposInconsistencia', label: 'Descuadres', align: 'right' },
                { key: 'clicVariable', label: 'Clic calculado', align: 'right', render: (r) => fMoney(r.clicVariable) },
                { key: 'clicOrigen', label: 'Clic origen', align: 'right', render: (r) => fMoney(r.clicOrigen) },
                {
                  key: 'difClicOrigen',
                  label: 'Diferencia',
                  align: 'right',
                  render: (r) => (
                    <span className={Math.abs(r.difClicOrigen) < 0.005 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                      {fMoney(r.difClicOrigen)}
                    </span>
                  )
                }
              ]}
              filas={mensual.serie.filter((x) => x.tiene).map((x) => ({ ...x, __key: x.periodo }))}
            />
          </div>
        </Card>

        <Card className="lg:col-span-5" title="Conciliación de parque SDS ↔ NDD" subtitle="Series presentes en cada fuente">
          <div className="flex items-center justify-around py-2">
            <Ring
              value={meta.equipos ? auditoria.conciliadas / meta.equipos : 0}
              label="Series conciliadas"
              color={C.blue}
              size={64}
              texto={String(auditoria.conciliadas)}
            />
            <Ring
              value={meta.equipos ? auditoria.soloContrato.length / meta.equipos : 0}
              label="Solo en contrato"
              color={ESTADO.aviso}
              size={64}
              texto={String(auditoria.soloContrato.length)}
            />
            <Ring
              value={auditoria.filas.length ? auditoria.soloNDD.length / auditoria.filas.length : 0}
              label="Solo en NDD"
              color={CAT[1]}
              size={64}
              texto={String(auditoria.soloNDD.length)}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 mt-2">
            <Nota tono="aviso" titulo={`${auditoria.soloContrato.length} series facturadas sin registro NDD`} icono="▸">
              {auditoria.soloContrato.length
                ? auditoria.soloContrato.map((f) => `${f.serie} (${titulo(f.sede)} · ${titulo(f.area)})`).join(' · ')
                : 'Todas las series del contrato aparecen en NDD.'}
            </Nota>
            <Nota tono="neutro" titulo={`${auditoria.soloNDD.length} equipos con impresión fuera del contrato`} icono="▸">
              {auditoria.soloNDD.length
                ? auditoria.soloNDD.map((f) => `${f.serie} (${fInt(f.nddTotal)} págs)`).join(' · ')
                : 'No hay impresión registrada fuera del parque contratado.'}
            </Nota>
          </div>
        </Card>
      </section>

      
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card
          className="lg:col-span-6"
          title="Volumetría contador SDS vs auditoría NDD"
          subtitle="Misma unidad (páginas) en una sola escala"
          right={
            <Semaforo estado={Math.abs(auditoria.totales.pctBrecha ?? 0) < 0.05 ? 'ok' : 'aviso'}>
              Brecha {auditoria.totales.pctBrecha === null ? '—' : fPct(auditoria.totales.pctBrecha, 0)}
            </Semaforo>
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativo} margin={{ top: 18, right: 10, left: -4, bottom: 0 }} barGap={3}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(0,102,255,0.05)' }} />
                <Bar dataKey="sds" name="Contador SDS (facturado)" fill={CAT[0]} radius={[4, 4, 0, 0]} maxBarSize={46}>
                  <LabelList dataKey="sds" position="top" formatter={fCompact} style={{ fontSize: 9, fill: C.textMuted, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="ndd" name="Trabajos NDD" fill={CAT[1]} radius={[4, 4, 0, 0]} maxBarSize={46}>
                  <LabelList dataKey="ndd" position="top" formatter={fCompact} style={{ fontSize: 9, fill: C.textMuted, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Leyenda
            className="mt-2 justify-center"
            items={[
              { label: 'Contador SDS', color: CAT[0], value: fInt(auditoria.totales.sdsTotal) },
              { label: 'Auditoría NDD', color: CAT[1], value: fInt(auditoria.totales.nddTotal) }
            ]}
          />
          {periodosInfo.some((p) => p.nddParcial) && (
            <p className="text-[10px] text-amber-700 mt-1.5">
              ▸ Los meses con captura NDD parcial no son comparables contra el contador del mes completo.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-6" title="Actividad diaria registrada por NDD" subtitle="Páginas monocromas y color por día de impresión">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diario} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                <defs>
                  <linearGradient id="gMono" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: C.axis }} tickFormatter={(v) => v.slice(8)} minTickGap={16} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} tickFormatter={fCompact} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<TooltipBox titulo={(l) => fFecha(l)} />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="mono" name="Monocromo" stackId="d" stroke={C.blue} strokeWidth={2} fill="url(#gMono)" dot={false} />
                <Area type="monotone" dataKey="color" name="Color" stackId="d" stroke={C.ink} strokeWidth={1} fill={C.ink} fillOpacity={0.85} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Leyenda className="mt-2 justify-center" items={[{ label: 'Monocromo', color: C.blue }, { label: 'Color', color: C.ink }]} />
        </Card>
      </section>

      
      <Card
        title={`Conciliación por equipo (${filas.length} series)`}
        subtitle="Volumen facturado por contador frente al volumen registrado por NDD"
      >
        <Tabla
          maxAltura="460px"
          initialSort={{ key: 'brecha', dir: 'desc' }}
          columnas={[
            { key: 'serie', label: 'Serie', render: (r) => <span className="font-mono text-[11px] font-semibold text-slate-800">{r.serie}</span> },
            { key: 'sede', label: 'Sede', render: (r) => titulo(r.sede) },
            { key: 'area', label: 'Área', render: (r) => <span className="truncate max-w-[160px] inline-block align-bottom">{titulo(r.area)}</span> },
            { key: 'impresora', label: 'Nombre en NDD', render: (r) => <span className="text-slate-500 truncate max-w-[170px] inline-block align-bottom">{r.impresora}</span> },
            { key: 'sdsTotal', label: 'Págs SDS', align: 'right', render: (r) => fInt(r.sdsTotal) },
            { key: 'nddTotal', label: 'Págs NDD', align: 'right', render: (r) => fInt(r.nddTotal) },
            { key: 'jobs', label: 'Trabajos', align: 'right', render: (r) => fInt(r.jobs) },
            {
              key: 'brecha',
              label: 'Brecha',
              align: 'right',
              sortValue: (r) => Math.abs(r.brecha),
              render: (r) => <span className={r.brecha === 0 ? '' : r.brecha > 0 ? 'text-slate-900 font-semibold' : 'text-rose-600 font-semibold'}>{fSigned(r.brecha)}</span>
            },
            { key: 'pctBrecha', label: '% brecha', align: 'right', render: (r) => (r.pctBrecha === null ? '—' : fPct(r.pctBrecha, 0)) },
            {
              key: 'origen',
              label: 'Origen',
              sortValue: (r) => (r.enContrato ? (r.enNDD ? 0 : 1) : 2),
              render: (r) =>
                r.enContrato && r.enNDD ? (
                  <Semaforo estado="ok">Ambas fuentes</Semaforo>
                ) : r.enContrato ? (
                  <Semaforo estado="aviso">Solo contrato</Semaforo>
                ) : (
                  <Semaforo estado="grave">Solo NDD</Semaforo>
                )
            }
          ]}
          filas={filas}
          pie={{
            serie: 'TOTAL',
            sdsTotal: fInt(auditoria.totales.sdsTotal),
            nddTotal: fInt(auditoria.totales.nddTotal),
            jobs: fInt(auditoria.totales.jobs),
            brecha: fSigned(auditoria.totales.brecha),
            pctBrecha: auditoria.totales.pctBrecha === null ? '—' : fPct(auditoria.totales.pctBrecha, 0)
          }}
        />
      </Card>

      
      <PanelAreas
        areas={areasAtribuidas}
        trabajosDe={trabajosDe}
        tarifas={tarifas}
      />

      
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-5" title="Top usuarios por volumen NDD" subtitle="Quién imprime más dentro del dominio">
          <Tabla
            maxAltura="340px"
            initialSort={{ key: 'total', dir: 'desc' }}
            columnas={[
              { key: 'clave', label: 'Usuario', render: (r) => <span className="font-medium text-slate-800 truncate max-w-[200px] inline-block align-bottom">{r.extra?.nombre && r.extra.nombre !== '-' ? r.extra.nombre : r.clave}</span> },
              { key: 'jobs', label: 'Trabajos', align: 'right', render: (r) => fInt(r.jobs) },
              { key: 'mono', label: 'B/N', align: 'right', render: (r) => fInt(r.mono) },
              { key: 'color', label: 'Color', align: 'right', render: (r) => fInt(r.color) },
              { key: 'total', label: 'Total', align: 'right', render: (r) => <strong>{fInt(r.total)}</strong> }
            ]}
            filas={usuariosGlobal.map((u) => ({ ...u, __key: u.clave }))}
          />
        </Card>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card title="Simplex vs dúplex" subtitle="Oportunidad de ahorro de papel">
            <div className="space-y-2.5 pt-1">
              {duplex.map((d, i) => (
                <div key={d.clave}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-700">{d.clave}</span>
                    <span className="text-slate-500 num">
                      {fInt(d.jobs)} trabajos · {fPct(d.jobs / totJobs, 0)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full" style={{ width: `${(d.jobs / totJobs) * 100}%`, background: CAT[i % CAT.length] }} />
                  </div>
                </div>
              ))}
            </div>
            <Nota tono="azul" titulo="Lectura" icono="▸" >
              El {fPct((duplex.find((d) => /simplex/i.test(d.clave))?.jobs ?? 0) / totJobs, 0)} de los trabajos sale a una sola cara.
            </Nota>
          </Card>

          <Card title="Perfil de los trabajos" subtitle="Modo, tipo de trabajo y formato de papel">
            <div className="space-y-3 text-[11px]">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Modo de impresión</p>
                {modos.map((x) => (
                  <div key={x.clave} className="flex justify-between text-slate-600">
                    <span>{x.clave}</span>
                    <span className="num font-semibold">{fInt(x.total)} págs · {fInt(x.jobs)} trabajos</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipo de trabajo</p>
                {tipos.map((x) => (
                  <div key={x.clave} className="flex justify-between text-slate-600">
                    <span>{x.clave}</span>
                    <span className="num font-semibold">{fInt(x.total)} págs</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Formato de papel</p>
                {papeles.map((x) => (
                  <div key={x.clave} className="flex justify-between text-slate-600">
                    <span className="truncate max-w-[150px]">{x.clave}</span>
                    <span className="num font-semibold">{fInt(x.total)} págs</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Nota tono="neutro" titulo="Origen de los datos NDD" icono="▸">
          {meta.origenNDD.length} archivo(s) anexados · {fInt(meta.statsNDD.trabajos)} trabajos únicos ·{' '}
          {fInt(meta.statsNDD.duplicados)} registros duplicados descartados por solapamiento entre exportaciones.
        </Nota>
        <Nota tono="aviso" titulo="Por qué NDD supera al contador" icono="▸">
          NDD contabiliza páginas enviadas a la cola de impresión; el contador SDS registra páginas efectivamente impresas por el equipo.
          Trabajos cancelados, reimpresos o encolados en más de un dispositivo explican la brecha de{' '}
          <strong className="num">{fSigned(auditoria.totales.brecha)}</strong> páginas.
        </Nota>
        <Nota tono="ok" titulo="Base de la facturación" icono="▸">
          La factura se emite <strong>siempre</strong> sobre el contador SDS. NDD es control de gestión: identifica usuarios, áreas y
          equipos que originan el consumo.
        </Nota>
      </section>
    </>
  )
}
