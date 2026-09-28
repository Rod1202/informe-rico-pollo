import { FUERA_CONTRATO, costoClic, filtrar } from './measures.js'

// Clave del pseudo-usuario que absorbe el volumen SDS de las impresoras que no
// tienen ningun registro en NDD. Existe para que el total atribuido cuadre
// exactamente contra la factura en vez de quedar corto y en silencio.
export const SIN_AUDITORIA = '__sin_auditoria__'
export const NOMBRE_SIN_AUDITORIA = 'Sin auditoria NDD'

// Reparte un entero `objetivo` entre `pesos` de forma proporcional usando mayor
// residuo: los decimales que sobran se entregan a las fracciones mas altas, asi
// la suma del reparto es exactamente `objetivo` y no queda descuadre.
export function repartir(pesos, objetivo) {
  const n = pesos.length
  if (!n || objetivo <= 0) return new Array(n).fill(0)
  const total = pesos.reduce((a, b) => a + b, 0)
  if (!total) return new Array(n).fill(0)

  const crudo = pesos.map((p) => (p / total) * objetivo)
  const piso = crudo.map(Math.floor)
  const orden = crudo
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || pesos[b.i] - pesos[a.i])

  let resto = objetivo - piso.reduce((a, b) => a + b, 0)
  for (let k = 0; resto > 0; k++, resto--) piso[orden[k % n].i] += 1
  return piso
}

// Modo con el que se resolvio cada impresora, para poder auditarlo en pantalla.
export const MODO = {
  directo: 'directo',
  patronColor: 'patron-color',
  patronMono: 'patron-mono',
  sinAuditoria: 'sin-auditoria',
  bajaCobertura: 'baja-cobertura'
}

// Cuanto del contador tiene que ver NDD para que valga la pena extrapolar. Por
// debajo de esto el factor se dispara (PAB San Jose llega a 24.5x sobre el 4%
// que NDD alcanza a registrar) y el reparto deja de ser una medicion para
// volverse una invencion: ese volumen se declara sin auditoria.
export const COBERTURA_MINIMA = 0.5

const clave = (serie, periodo) => `${serie}|${periodo}`

// Nucleo: toma el volumen SDS como 100% y lo reparte entre los usuarios que NDD
// identifico en esa misma impresora, respetando la proporcion en que ellos
// consumieron. B/N y color se resuelven por separado porque sus factores casi
// nunca coinciden.
export function prorratear({ contador, porSerieUsuario, catalogoSeries, periodosSel, tarifas, filtros = {}, periodos = [] }) {
  const cat = new Map(catalogoSeries.map((c) => [c.serie, c]))
  const enPeriodo = (k) => !periodosSel || periodosSel.includes(k)

  // Cuanta cobertura cabe esperar en cada mes. Junio solo captura desde el
  // 18/06, asi que ahi una impresora al 40% esta completa, no rota: el umbral
  // se mide contra lo que el mes podia registrar, no contra el mes entero.
  const esperada = new Map(
    periodos.map((p) => [p.key, p.nddParcial && p.nddDiasMes ? p.nddDiasConDatos / p.nddDiasMes : 1])
  )
  const umbral = (periodo) => COBERTURA_MINIMA * (esperada.get(periodo) ?? 1)

  // 1. Base facturable: es el numero que manda.
  const base = new Map()
  for (const r of filtrar(contador, { ...filtros, periodo: 'TODOS' })) {
    if (!enPeriodo(r.periodo)) continue
    const k = clave(r.serie, r.periodo)
    const o = base.get(k) ?? { serie: r.serie, periodo: r.periodo, bn: 0, color: 0 }
    o.bn += r.pagBN
    o.color += r.pagColor
    base.set(k, o)
  }

  // 2. Patron de consumo que aporta NDD para esa misma impresora y periodo.
  const patron = new Map()
  for (const r of porSerieUsuario) {
    if (!enPeriodo(r.periodo)) continue
    const k = clave(r.serie, r.periodo)
    let p = patron.get(k)
    if (!p) {
      p = { serie: r.serie, periodo: r.periodo, mono: 0, color: 0, jobs: 0, usuarios: new Map() }
      patron.set(k, p)
    }
    p.mono += r.mono
    p.color += r.color
    p.jobs += r.jobs

    let u = p.usuarios.get(r.usuario)
    if (!u) {
      u = { usuario: r.usuario, nombre: r.nombre, mono: 0, color: 0, jobs: 0 }
      p.usuarios.set(r.usuario, u)
    }
    u.mono += r.mono
    u.color += r.color
    u.jobs += r.jobs
    if (u.nombre === '-' && r.nombre !== '-') u.nombre = r.nombre
  }

  // 3. Reparto impresora por impresora.
  const asignado = []
  const series = []
  const factores = new Map()

  for (const [k, b] of base) {
    const p = patron.get(k)
    const sdsTotal = b.bn + b.color
    const info = cat.get(b.serie)
    const nddTotal = p ? p.mono + p.color : 0
    const cobertura = sdsTotal > 0 ? nddTotal / sdsTotal : null
    const sinPatron = !p || nddTotal === 0
    // Lo que NDD vio es tan poco que extrapolarlo seria inventar el reparto.
    const minimo = umbral(b.periodo)
    const bajaCobertura = !sinPatron && sdsTotal > 0 && cobertura < minimo

    if (sinPatron || bajaCobertura) {
      // El volumen existe y se factura, pero no hay a quien atribuirselo con
      // fundamento. Se muestra como tal en vez de repartirlo a ciegas.
      if (sdsTotal > 0) {
        asignado.push({
          serie: b.serie,
          periodo: b.periodo,
          usuario: SIN_AUDITORIA,
          nombre: NOMBRE_SIN_AUDITORIA,
          bn: b.bn,
          color: b.color,
          jobs: 0,
          sinAuditoria: true
        })
        series.push({
          serie: b.serie,
          periodo: b.periodo,
          area: info?.area ?? FUERA_CONTRATO,
          modo: sinPatron ? MODO.sinAuditoria : MODO.bajaCobertura,
          sdsBN: b.bn,
          sdsColor: b.color,
          sdsTotal,
          nddMono: p?.mono ?? 0,
          nddColor: p?.color ?? 0,
          nddTotal,
          cobertura,
          umbral: minimo,
          factorBN: null,
          factorColor: null,
          usuarios: p ? p.usuarios.size : 0
        })
      }
      continue
    }

    const us = [...p.usuarios.values()]
    // Si NDD no registro monocromo pero el contador si lo facturo, se reparte
    // con la huella que dejo el color (y viceversa): es el unico patron de uso
    // disponible para esa impresora.
    const usaColorParaBN = p.mono === 0 && b.bn > 0
    const usaMonoParaColor = p.color === 0 && b.color > 0
    const pesoBN = usaColorParaBN ? us.map((u) => u.color) : us.map((u) => u.mono)
    const pesoColor = usaMonoParaColor ? us.map((u) => u.mono) : us.map((u) => u.color)

    const repBN = repartir(pesoBN, b.bn)
    const repColor = repartir(pesoColor, b.color)

    us.forEach((u, i) => {
      const bn = repBN[i]
      const color = repColor[i]
      if (!bn && !color && !u.jobs) return
      asignado.push({
        serie: b.serie,
        periodo: b.periodo,
        usuario: u.usuario,
        nombre: u.nombre,
        bn,
        color,
        jobs: u.jobs,
        sinAuditoria: false
      })
      // Guardado para poder repartir despues los trabajos del mismo usuario.
      factores.set(`${k}|${u.usuario}`, {
        bn,
        color,
        nddMono: u.mono,
        nddColor: u.color,
        usaColorParaBN,
        usaMonoParaColor
      })
    })

    series.push({
      serie: b.serie,
      periodo: b.periodo,
      area: info?.area ?? FUERA_CONTRATO,
      modo: usaColorParaBN ? MODO.patronColor : usaMonoParaColor ? MODO.patronMono : MODO.directo,
      sdsBN: b.bn,
      sdsColor: b.color,
      sdsTotal,
      nddMono: p.mono,
      nddColor: p.color,
      nddTotal,
      cobertura,
      umbral: minimo,
      factorBN: p.mono ? b.bn / p.mono : null,
      factorColor: p.color ? b.color / p.color : null,
      usuarios: us.length
    })
  }

  // 4. Impresoras que NDD ve pero que no estan en el contrato: no hay base SDS
  // contra la cual prorratear, asi que van aparte y con su volumen NDD crudo.
  const fuera = new Map()
  const filtroAbierto =
    (!filtros.sede || filtros.sede === 'TODAS') &&
    (!filtros.area || filtros.area === 'TODAS') &&
    (!filtros.estado || filtros.estado === 'TODOS')

  if (filtroAbierto) {
    for (const r of porSerieUsuario) {
      if (!enPeriodo(r.periodo) || cat.has(r.serie)) continue
      let s = fuera.get(r.serie)
      if (!s) {
        s = { serie: r.serie, mono: 0, color: 0, jobs: 0, costo: 0, usuarios: new Map() }
        fuera.set(r.serie, s)
      }
      s.mono += r.mono
      s.color += r.color
      s.jobs += r.jobs
      s.costo += costoClic(r.mono, r.color, r.serie, tarifas)

      let u = s.usuarios.get(r.usuario)
      if (!u) {
        u = { usuario: r.usuario, nombre: r.nombre, mono: 0, color: 0, jobs: 0 }
        s.usuarios.set(r.usuario, u)
      }
      u.mono += r.mono
      u.color += r.color
      u.jobs += r.jobs
      if (u.nombre === '-' && r.nombre !== '-') u.nombre = r.nombre
    }
  }

  const fueraContrato = [...fuera.values()]
    .map((s) => ({
      ...s,
      total: s.mono + s.color,
      __key: s.serie,
      usuarios: [...s.usuarios.values()]
        .map((u) => ({ ...u, total: u.mono + u.color, __key: u.usuario }))
        .sort((a, b) => b.total - a.total)
    }))
    .sort((a, b) => b.total - a.total)

  return { asignado, series, factores, fueraContrato, cat }
}

// Agrega el reparto por area, con el detalle de usuarios de cada una. Misma
// forma que devolvia nddPorArea para no romper a quien ya la consume.
export function agruparPorArea(resultado, tarifas) {
  const { asignado, cat, series } = resultado
  const areas = new Map()

  // Detalle de por que una impresora quedo sin atribuir, para poder explicarlo
  // en pantalla en vez de mostrar un numero huerfano.
  const motivos = new Map()
  for (const s of series) {
    if (s.modo !== MODO.sinAuditoria && s.modo !== MODO.bajaCobertura) continue
    if (!motivos.has(s.area)) motivos.set(s.area, [])
    motivos.get(s.area).push(s)
  }

  for (const a of asignado) {
    const info = cat.get(a.serie)
    const nombreArea = info?.area ?? FUERA_CONTRATO
    let g = areas.get(nombreArea)
    if (!g) {
      g = {
        area: nombreArea,
        sedes: new Set(),
        equipos: new Set(),
        mono: 0,
        color: 0,
        total: 0,
        jobs: 0,
        costo: 0,
        sinAuditoria: 0,
        enContrato: !!info,
        usuarios: new Map()
      }
      areas.set(nombreArea, g)
    }
    const costo = costoClic(a.bn, a.color, a.serie, tarifas)
    g.mono += a.bn
    g.color += a.color
    g.total += a.bn + a.color
    g.jobs += a.jobs
    g.costo += costo
    g.equipos.add(a.serie)
    if (a.sinAuditoria) g.sinAuditoria += a.bn + a.color
    if (info?.sede) g.sedes.add(info.sede)

    let u = g.usuarios.get(a.usuario)
    if (!u) {
      u = {
        usuario: a.usuario,
        nombre: a.nombre,
        mono: 0,
        color: 0,
        total: 0,
        jobs: 0,
        costo: 0,
        sinAuditoria: a.sinAuditoria,
        equipos: new Set()
      }
      g.usuarios.set(a.usuario, u)
    }
    u.mono += a.bn
    u.color += a.color
    u.total += a.bn + a.color
    u.jobs += a.jobs
    u.costo += costo
    u.equipos.add(a.serie)
    if (u.nombre === '-' && a.nombre !== '-') u.nombre = a.nombre
  }

  return [...areas.values()]
    .map((g) => ({
      ...g,
      sedes: [...g.sedes],
      equipos: g.equipos.size,
      motivosSinAuditoria: motivos.get(g.area) ?? [],
      usuarios: [...g.usuarios.values()]
        .map((u) => ({ ...u, equipos: u.equipos.size, __key: u.usuario }))
        .sort((x, y) => y.total - x.total)
    }))
    .sort((x, y) => y.total - x.total)
}

// Ranking global de usuarios sobre el mismo reparto, para el top general.
export function agruparPorUsuario(resultado, tarifas) {
  const { asignado, cat } = resultado
  const g = new Map()

  for (const a of asignado) {
    const info = cat.get(a.serie)
    const nombreArea = info?.area ?? FUERA_CONTRATO
    let u = g.get(a.usuario)
    if (!u) {
      u = {
        usuario: a.usuario,
        nombre: a.nombre,
        mono: 0,
        color: 0,
        total: 0,
        jobs: 0,
        costo: 0,
        sinAuditoria: a.sinAuditoria,
        areas: new Set(),
        equipos: new Set()
      }
      g.set(a.usuario, u)
    }
    u.mono += a.bn
    u.color += a.color
    u.total += a.bn + a.color
    u.jobs += a.jobs
    u.costo += costoClic(a.bn, a.color, a.serie, tarifas)
    u.areas.add(nombreArea)
    u.equipos.add(a.serie)
    if (u.nombre === '-' && a.nombre !== '-') u.nombre = a.nombre
  }

  return [...g.values()]
    .map((u) => ({ ...u, areas: [...u.areas], equipos: u.equipos.size, __key: u.usuario }))
    .sort((a, b) => b.total - a.total)
}

// Trabajos de un usuario dentro de un area, repartidos dentro del total que ya
// se le asigno a ese usuario en cada impresora.
export function trabajosProrrateados(resultado, porTrabajo, area, usuario, periodosSel, tarifas) {
  const { factores, cat } = resultado
  if (!usuario || usuario === SIN_AUDITORIA) return []

  // Agrupa los trabajos crudos por impresora+periodo, que es la unidad donde
  // vive el factor.
  const grupos = new Map()
  for (const t of porTrabajo) {
    if (t.usuario !== usuario) continue
    if (periodosSel && !periodosSel.includes(t.periodo)) continue
    if ((cat.get(t.serie)?.area ?? FUERA_CONTRATO) !== area) continue
    const k = clave(t.serie, t.periodo)
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k).push(t)
  }

  const acc = new Map()
  for (const [k, ts] of grupos) {
    const f = factores.get(`${k}|${usuario}`)
    if (!f) continue
    const serie = ts[0].serie
    const pesoBN = f.usaColorParaBN ? ts.map((t) => t.color) : ts.map((t) => t.mono)
    const pesoColor = f.usaMonoParaColor ? ts.map((t) => t.mono) : ts.map((t) => t.color)
    const repBN = repartir(pesoBN, f.bn)
    const repColor = repartir(pesoColor, f.color)

    ts.forEach((t, i) => {
      let o = acc.get(t.titulo)
      if (!o) {
        o = { titulo: t.titulo, mono: 0, color: 0, total: 0, jobs: 0, costo: 0, otros: !!t.otros, equipos: new Set() }
        acc.set(t.titulo, o)
      }
      o.mono += repBN[i]
      o.color += repColor[i]
      o.total += repBN[i] + repColor[i]
      o.jobs += t.jobs
      o.costo += costoClic(repBN[i], repColor[i], serie, tarifas)
      o.equipos.add(t.serie)
    })
  }

  return [...acc.values()]
    .map((o) => ({ ...o, equipos: o.equipos.size, __key: o.titulo }))
    .sort((a, b) => b.total - a.total)
}
