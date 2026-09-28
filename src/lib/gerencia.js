import { costoClic, FUERA_CONTRATO } from './measures.js'

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const div = (a, b) => (b ? a / b : 0)

// Usuarios del padron que pertenecen a una gerencia. La comparacion ignora
// tildes y mayusculas porque el Excel no es consistente entre archivos.
export function usuariosDeGerencia(padron, gerencia) {
  const objetivo = norm(gerencia)
  const out = new Set()
  for (const [usuario, division] of Object.entries(padron ?? {})) {
    if (norm(division) === objetivo) out.add(String(usuario).toLowerCase())
  }
  return out
}

// Deja en el reparto unicamente las filas de esos usuarios. El volumen sin
// auditoria y el de otras gerencias desaparece: una gerencia no tiene por que
// ver el consumo ajeno.
export function acotarAtribucion(atribucion, usuarios) {
  const asignado = atribucion.asignado.filter(
    (a) => !a.sinAuditoria && usuarios.has(String(a.usuario).toLowerCase())
  )
  const vivas = new Set(asignado.map((a) => `${a.serie}|${a.periodo}|${a.usuario}`))
  const factores = new Map([...atribucion.factores].filter(([k]) => vivas.has(k)))
  return { ...atribucion, asignado, factores, fueraContrato: [] }
}

// Medidas equivalentes a las de `medidas()` pero calculadas sobre el volumen
// atribuido, no sobre el contador completo. El cargo fijo no entra: es del
// equipo, no de la persona, y no se puede repartir por usuario.
export function medidasAtribuidas(asignado, tarifas, cat) {
  let volBN = 0
  let volColor = 0
  let volColorA3 = 0
  const series = new Set()
  const activas = new Set()
  const backup = new Set()

  for (const a of asignado) {
    volBN += a.bn
    volColor += a.color
    if (a.serie === tarifas.serieA3) volColorA3 += a.color
    series.add(a.serie)
    if (a.bn + a.color > 0) activas.add(a.serie)
    if (cat?.get(a.serie)?.estado === 'BACKUP') backup.add(a.serie)
  }

  const volumetria = volBN + volColor
  const volColorStd = volColor - volColorA3
  const clicBN = volBN * tarifas.bn
  const clicColorA3 = volColorA3 * tarifas.colorA3
  const clicColorStd = volColorStd * tarifas.color
  const clicColor = clicColorA3 + clicColorStd
  const clicVariable = clicBN + clicColor

  return {
    filas: asignado.length,
    volBN,
    volColor,
    volumetria,
    pctVolBN: div(volBN, volumetria),
    pctVolColor: div(volColor, volumetria),
    volColorA3,
    volColorStd,
    clicBN,
    clicColor,
    clicColorA3,
    clicColorStd,
    clicVariable,
    // Sin cargo fijo: la facturacion visible de una gerencia es su clic.
    cargoFijo: 0,
    facturacion: clicVariable,
    pctFactBN: div(clicBN, clicVariable),
    pctFactColor: div(clicColor, clicVariable),
    pctCargoFijo: 0,
    costoPagina: div(clicVariable, volumetria),
    equiposTotales: series.size,
    equiposActivos: activas.size,
    equiposSinActividad: series.size - activas.size,
    equiposBackup: backup.size,
    series: [...series].map((s) => ({ serie: s }))
  }
}

// Serie mensual con la misma forma que `serieMensual()`, para que el grafico
// historico y las comparativas funcionen sin cambios.
export function serieMensualAtribuida(asignado, periodos, tarifas, cat) {
  const porPeriodo = periodos.map((p) => {
    const rs = asignado.filter((a) => a.periodo === p.key)
    const m = medidasAtribuidas(rs, tarifas, cat)
    return { periodo: p.key, label: p.label, largo: p.largo, tiene: rs.length > 0, ...m }
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
      promedioVolumetria,
      promedioFacturacion
    }
  })

  return { serie, mesesEvaluados, promedioVolumetria, promedioFacturacion }
}

// Ranking por area (o sede) con comparacion contra el periodo previo, con la
// misma forma que devuelve `comparar()`.
export function compararAtribuido(asignadoActual, asignadoPrevio, campo, tarifas, cat) {
  const agrupar = (filas) => {
    const g = new Map()
    for (const a of filas) {
      const info = cat.get(a.serie)
      const clave =
        campo === 'serie' ? a.serie : campo === 'sede' ? (info?.sede ?? '—') : (info?.area ?? FUERA_CONTRATO)
      const o = g.get(clave) ?? { clave, volumetria: 0, volBN: 0, volColor: 0, facturacion: 0, equipos: new Set() }
      o.volBN += a.bn
      o.volColor += a.color
      o.volumetria += a.bn + a.color
      o.facturacion += costoClic(a.bn, a.color, a.serie, tarifas)
      o.equipos.add(a.serie)
      g.set(clave, o)
    }
    return g
  }

  const act = agrupar(asignadoActual)
  const pre = agrupar(asignadoPrevio)

  return [...new Set([...act.keys(), ...pre.keys()])]
    .map((clave) => {
      const a = act.get(clave)
      const p = pre.get(clave)
      const vol = a?.volumetria ?? 0
      const volPrev = p?.volumetria ?? 0
      const fact = a?.facturacion ?? 0
      const factPrev = p?.facturacion ?? 0
      return {
        clave,
        volumetria: vol,
        volBN: a?.volBN ?? 0,
        volColor: a?.volColor ?? 0,
        facturacion: fact,
        clicVariable: fact,
        cargoFijo: 0,
        equiposTotales: a ? a.equipos.size : 0,
        equiposActivos: a ? a.equipos.size : 0,
        volPrev,
        factPrev,
        difVol: vol - volPrev,
        difFact: fact - factPrev,
        pctVol: volPrev ? (vol - volPrev) / volPrev : null,
        pctFact: factPrev ? (fact - factPrev) / factPrev : null,
        alta: !p && !!a,
        baja: !!p && (!a || vol === 0)
      }
    })
    .sort((x, y) => y.volumetria - x.volumetria)
}
