const suma = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0)
const div = (a, b) => (b ? a / b : 0)

export function medidas(rows, tarifas) {
  const volBN = suma(rows, (r) => r.pagBN)
  const volColor = suma(rows, (r) => r.pagColor)
  const volumetria = volBN + volColor

  const cargoFijo = suma(rows, (r) => r.base)
  const clicBN = volBN * tarifas.bn

  const volColorA3 = suma(rows, (r) => (r.serie === tarifas.serieA3 ? r.pagColor : 0))
  const volColorStd = volColor - volColorA3
  const clicColorA3 = volColorA3 * tarifas.colorA3
  const clicColorStd = volColorStd * tarifas.color
  const clicColor = clicColorA3 + clicColorStd
  const clicVariable = clicBN + clicColor
  const facturacion = clicVariable + cargoFijo

  const porSerie = new Map()
  for (const r of rows) {
    const o = porSerie.get(r.serie) || { serie: r.serie, estado: r.estado, vol: 0, base: 0, difBN: 0, difColor: 0 }
    o.vol += r.pagBN + r.pagColor
    o.base += r.base
    o.difBN += r.finBN - r.inicioBN - r.pagBN
    o.difColor += r.finColor - r.inicioColor - r.pagColor
    porSerie.set(r.serie, o)
  }
  const series = [...porSerie.values()]

  // El parque de "producción" es el que se mide contra el contrato. Los equipos
  // en estado BACKUP no cuentan como sin actividad: no facturan cargo fijo y no
  // se espera que generen volumetría.
  const enBackup = (s) => s.estado === 'BACKUP'
  const produccion = series.filter((s) => !enBackup(s))
  const equiposBackup = series.filter(enBackup).length
  const cargoFijoBackup = series.filter(enBackup).reduce((a, s) => a + s.base, 0)

  const equiposTotales = produccion.length
  const equiposActivos = produccion.filter((s) => s.vol > 0).length
  const equiposSinActividad = equiposTotales - equiposActivos
  const cargoFijoSinActividad = produccion.filter((s) => s.vol === 0).reduce((a, s) => a + s.base, 0)

  const difContadorBN = suma(rows, (r) => r.finBN - r.inicioBN - r.pagBN)
  const difContadorColor = suma(rows, (r) => r.finColor - r.inicioColor - r.pagColor)
  const equiposInconsistencia = series.filter((s) => s.difBN !== 0 || s.difColor !== 0).length
  const clicOrigen = suma(rows, (r) => r.precioBN + r.precioColor)

  return {
    filas: rows.length,
    volBN,
    volColor,
    volumetria,
    pctVolBN: div(volBN, volumetria),
    pctVolColor: div(volColor, volumetria),
    cargoFijo,
    clicBN,
    clicColor,
    volColorA3,
    volColorStd,
    clicColorA3,
    clicColorStd,
    clicVariable,
    facturacion,
    pctFactBN: div(clicBN, clicVariable),
    pctFactColor: div(clicColor, clicVariable),
    pctCargoFijo: div(cargoFijo, facturacion),
    costoPagina: div(facturacion, volumetria),
    equiposTotales,
    equiposActivos,
    equiposSinActividad,
    cargoFijoSinActividad,
    equiposBackup,
    cargoFijoBackup,
    pctEquiposActivos: div(equiposActivos, equiposTotales),
    volPorEquipo: div(volumetria, equiposActivos),
    factPorEquipo: div(facturacion, equiposActivos),
    difContadorBN,
    difContadorColor,
    equiposInconsistencia,
    clicOrigen,
    difClicOrigen: clicVariable - clicOrigen,
    series
  }
}

export function filtrar(contador, f) {
  return contador.filter((r) => {
    if (f.periodo && f.periodo !== 'TODOS' && r.periodo !== f.periodo) return false
    if (f.sede && f.sede !== 'TODAS' && r.sede !== f.sede) return false
    if (f.area && f.area !== 'TODAS' && r.area !== f.area) return false
    if (f.estado && f.estado !== 'TODOS' && r.estado !== f.estado) return false
    return true
  })
}

export function agrupar(rows, campo, tarifas, totalRef = null) {
  const g = new Map()
  for (const r of rows) {
    const k = typeof campo === 'function' ? campo(r) : r[campo]
    if (!g.has(k)) g.set(k, [])
    g.get(k).push(r)
  }
  const base = totalRef ?? medidas(rows, tarifas)
  return [...g.entries()]
    .map(([clave, rs]) => {
      const m = medidas(rs, tarifas)
      return {
        clave,
        rows: rs,
        ...m,
        pctParticipacionVol: div(m.volumetria, base.volumetria),
        pctParticipacionFact: div(m.facturacion, base.facturacion)
      }
    })
    .sort((a, b) => b.volumetria - a.volumetria)
}

export function serieMensual(rows, periodos, tarifas) {
  const porPeriodo = periodos.map((p) => {
    const rs = rows.filter((r) => r.periodo === p.key)
    return { periodo: p.key, label: p.label, largo: p.largo, tiene: rs.length > 0, ...medidas(rs, tarifas) }
  })

  const conDatos = porPeriodo.filter((p) => p.tiene)
  const mesesEvaluados = conDatos.length
  const promedioVolumetria = div(conDatos.reduce((a, p) => a + p.volumetria, 0), mesesEvaluados)
  const promedioFacturacion = div(conDatos.reduce((a, p) => a + p.facturacion, 0), mesesEvaluados)

  const serie = porPeriodo.map((p, i) => {
    const prev = i > 0 ? porPeriodo[i - 1] : null
    const prevOk = prev && prev.tiene
    return {
      ...p,
      volumetriaMesAnterior: prevOk ? prev.volumetria : null,
      facturacionMesAnterior: prevOk ? prev.facturacion : null,
      difVolumetriaMoM: p.tiene && prevOk ? p.volumetria - prev.volumetria : null,
      difFacturacionMoM: p.tiene && prevOk ? p.facturacion - prev.facturacion : null,
      pctVarVolumetriaMoM: p.tiene && prevOk ? div(p.volumetria - prev.volumetria, prev.volumetria) : null,
      pctVarFacturacionMoM: p.tiene && prevOk ? div(p.facturacion - prev.facturacion, prev.facturacion) : null,
      pctVarVsPromVolumetria: p.tiene ? div(p.volumetria - promedioVolumetria, promedioVolumetria) : null,
      pctVarVsPromFacturacion: p.tiene ? div(p.facturacion - promedioFacturacion, promedioFacturacion) : null,
      promedioVolumetria,
      promedioFacturacion
    }
  })

  return { serie, mesesEvaluados, promedioVolumetria, promedioFacturacion }
}

export function ytd(rows, periodos, tarifas, hastaPeriodo) {
  const p = periodos.find((x) => x.key === hastaPeriodo) ?? periodos[periodos.length - 1]
  if (!p) return { volumetria: 0, facturacion: 0 }
  const rs = rows.filter((r) => {
    const [y, m] = r.periodo.split('-').map(Number)
    return y === p.anio && m <= p.mes
  })
  const m = medidas(rs, tarifas)
  return { volumetria: m.volumetria, facturacion: m.facturacion, hasta: p.label }
}

export function auditoriaNDD(contadorRows, nddPorSerie, periodosSel) {
  const enPeriodo = (k) => !periodosSel || periodosSel.includes(k)

  const sds = new Map()
  for (const r of contadorRows) {
    if (!enPeriodo(r.periodo)) continue
    const o = sds.get(r.serie) || { serie: r.serie, sede: r.sede, area: r.area, modelo: r.modelo, estado: r.estado, sdsBN: 0, sdsColor: 0 }
    o.sdsBN += r.pagBN
    o.sdsColor += r.pagColor
    sds.set(r.serie, o)
  }

  const ndd = new Map()
  for (const r of nddPorSerie) {
    if (!enPeriodo(r.periodo)) continue
    const o = ndd.get(r.serie) || { serie: r.serie, impresora: r.impresora, nddBN: 0, nddColor: 0, jobs: 0 }
    o.nddBN += r.mono
    o.nddColor += r.color
    o.jobs += r.jobs
    ndd.set(r.serie, o)
  }

  const claves = new Set([...sds.keys(), ...ndd.keys()].filter((s) => s && s !== '-'))
  const filas = [...claves].map((serie) => {
    const a = sds.get(serie)
    const b = ndd.get(serie)
    const sdsTotal = (a?.sdsBN ?? 0) + (a?.sdsColor ?? 0)
    const nddTotal = (b?.nddBN ?? 0) + (b?.nddColor ?? 0)
    return {
      serie,
      sede: a?.sede ?? '—',
      area: a?.area ?? '—',
      modelo: a?.modelo ?? b?.impresora ?? '—',
      estado: a?.estado ?? '—',
      impresora: b?.impresora ?? '—',
      enContrato: !!a,
      enNDD: !!b,
      sdsBN: a?.sdsBN ?? 0,
      sdsColor: a?.sdsColor ?? 0,
      sdsTotal,
      nddBN: b?.nddBN ?? 0,
      nddColor: b?.nddColor ?? 0,
      nddTotal,
      jobs: b?.jobs ?? 0,
      brecha: nddTotal - sdsTotal,
      pctBrecha: sdsTotal ? (nddTotal - sdsTotal) / sdsTotal : null
    }
  })

  const totales = filas.reduce(
    (a, f) => ({
      sdsBN: a.sdsBN + f.sdsBN,
      sdsColor: a.sdsColor + f.sdsColor,
      sdsTotal: a.sdsTotal + f.sdsTotal,
      nddBN: a.nddBN + f.nddBN,
      nddColor: a.nddColor + f.nddColor,
      nddTotal: a.nddTotal + f.nddTotal,
      jobs: a.jobs + f.jobs
    }),
    { sdsBN: 0, sdsColor: 0, sdsTotal: 0, nddBN: 0, nddColor: 0, nddTotal: 0, jobs: 0 }
  )
  totales.brecha = totales.nddTotal - totales.sdsTotal
  totales.pctBrecha = totales.sdsTotal ? totales.brecha / totales.sdsTotal : null

  return {
    filas: filas.sort((x, y) => Math.abs(y.brecha) - Math.abs(x.brecha)),
    totales,
    soloContrato: filas.filter((f) => f.enContrato && !f.enNDD),
    soloNDD: filas.filter((f) => !f.enContrato && f.enNDD),
    conciliadas: filas.filter((f) => f.enContrato && f.enNDD).length
  }
}

export const FUERA_CONTRATO = 'FUERA DE CONTRATO'

export const costoClic = (mono, color, serie, tarifas) =>
  mono * tarifas.bn + color * (serie === tarifas.serieA3 ? tarifas.colorA3 : tarifas.color)

export const catalogoPorSerie = (catalogoSeries) => new Map(catalogoSeries.map((c) => [c.serie, c]))

export function nddPorArea(porSerieUsuario, catalogoSeries, periodosSel, tarifas, filtros = {}) {
  const cat = catalogoPorSerie(catalogoSeries)
  const areas = new Map()

  for (const r of porSerieUsuario) {
    if (periodosSel && !periodosSel.includes(r.periodo)) continue
    const info = cat.get(r.serie)
    const area = info?.area ?? FUERA_CONTRATO

    if (filtros.sede && filtros.sede !== 'TODAS' && (info?.sede ?? null) !== filtros.sede) continue
    if (filtros.estado && filtros.estado !== 'TODOS' && (info?.estado ?? null) !== filtros.estado) continue

    let a = areas.get(area)
    if (!a) {
      a = { area, sedes: new Set(), equipos: new Set(), mono: 0, color: 0, total: 0, jobs: 0, costo: 0, enContrato: !!info, usuarios: new Map() }
      areas.set(area, a)
    }
    const costo = costoClic(r.mono, r.color, r.serie, tarifas)
    a.mono += r.mono; a.color += r.color; a.total += r.total; a.jobs += r.jobs; a.costo += costo
    a.equipos.add(r.serie)
    if (info?.sede) a.sedes.add(info.sede)

    let u = a.usuarios.get(r.usuario)
    if (!u) {
      u = { usuario: r.usuario, nombre: r.nombre, mono: 0, color: 0, total: 0, jobs: 0, costo: 0, equipos: new Set() }
      a.usuarios.set(r.usuario, u)
    }
    u.mono += r.mono; u.color += r.color; u.total += r.total; u.jobs += r.jobs; u.costo += costo
    u.equipos.add(r.serie)
    if (u.nombre === '-' && r.nombre !== '-') u.nombre = r.nombre
  }

  return [...areas.values()]
    .map((a) => ({
      ...a,
      sedes: [...a.sedes],
      equipos: a.equipos.size,
      usuarios: [...a.usuarios.values()].map((u) => ({ ...u, equipos: u.equipos.size })).sort((x, y) => y.total - x.total)
    }))
    .sort((x, y) => y.total - x.total)
}

export function nddTrabajos(porTrabajo, catalogoSeries, area, usuario, periodosSel, tarifas) {
  const cat = catalogoPorSerie(catalogoSeries)
  const g = new Map()

  for (const t of porTrabajo) {
    if (t.usuario !== usuario) continue
    if (periodosSel && !periodosSel.includes(t.periodo)) continue
    if ((cat.get(t.serie)?.area ?? FUERA_CONTRATO) !== area) continue

    let o = g.get(t.titulo)
    if (!o) {
      o = { titulo: t.titulo, mono: 0, color: 0, total: 0, jobs: 0, costo: 0, otros: !!t.otros, equipos: new Set() }
      g.set(t.titulo, o)
    }
    o.mono += t.mono; o.color += t.color; o.total += t.mono + t.color; o.jobs += t.jobs
    o.costo += costoClic(t.mono, t.color, t.serie, tarifas)
    o.equipos.add(t.serie)
  }

  return [...g.values()].map((o) => ({ ...o, equipos: o.equipos.size })).sort((a, b) => b.total - a.total)
}

export function nddAgrupar(cubo, campo, periodosSel) {
  const g = new Map()
  for (const r of cubo) {
    if (periodosSel && !periodosSel.includes(r.periodo)) continue
    const k = r[campo]
    const o = g.get(k) || { clave: k, mono: 0, color: 0, total: 0, jobs: 0, extra: r }
    o.mono += r.mono
    o.color += r.color
    o.total += r.total
    o.jobs += r.jobs
    g.set(k, o)
  }
  return [...g.values()].sort((a, b) => b.total - a.total)
}

export function comparar(rowsActual, rowsPrevio, campo, tarifas) {
  const a = new Map(agrupar(rowsActual, campo, tarifas).map((g) => [g.clave, g]))
  const b = new Map(agrupar(rowsPrevio, campo, tarifas).map((g) => [g.clave, g]))

  return [...new Set([...a.keys(), ...b.keys()])]
    .map((clave) => {
      const act = a.get(clave)
      const pre = b.get(clave)
      const vol = act?.volumetria ?? 0
      const volPrev = pre?.volumetria ?? 0
      const fact = act?.facturacion ?? 0
      const factPrev = pre?.facturacion ?? 0
      return {
        clave,
        ...(act ?? { volumetria: 0, volBN: 0, volColor: 0, facturacion: 0, clicVariable: 0, cargoFijo: 0, equiposTotales: 0, equiposActivos: 0 }),
        volumetria: vol,
        facturacion: fact,
        volPrev,
        factPrev,
        difVol: vol - volPrev,
        difFact: fact - factPrev,
        pctVol: volPrev ? (vol - volPrev) / volPrev : null,
        pctFact: factPrev ? (fact - factPrev) / factPrev : null,
        alta: !pre && !!act,
        baja: !!pre && (!act || vol === 0)
      }
    })
    .sort((x, y) => y.volumetria - x.volumetria)
}

export function periodoPrevio(periodos, periodoKey) {
  if (!periodoKey || periodoKey === 'TODOS') return null
  const i = periodos.findIndex((p) => p.key === periodoKey)
  return i > 0 ? periodos[i - 1] : null
}
