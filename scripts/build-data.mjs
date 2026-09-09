import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIR_SDS = path.join(ROOT, 'utils', 'sds')
const DIR_NDD = path.join(ROOT, 'utils', 'ndd')
const OUT = path.join(ROOT, 'src', 'data', 'dataset.json')

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const TARIFAS = {
  bn: 0.0072,
  color: 0.05886,
  colorA3: 0.19,
  serieA3: 'BRCST7Q0HB'
}

const log = (...a) => console.log('  ', ...a)

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const listFiles = (dir, exts) => {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith('~$') && !f.startsWith('.'))
    .filter((f) => exts.includes(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => path.join(dir, f))
}

const pick = (row, ...names) => {
  const map = new Map(Object.keys(row).map((k) => [norm(k), k]))
  for (const n of names) {
    const k = map.get(norm(n))
    if (k !== undefined) return row[k]
  }
  return undefined
}

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const txt = (v) => String(v ?? '').trim()

const periodoLabel = (y, m) => `${MESES[m]}-${y}`
const periodoKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`

function parsePeriodoExcel(v) {
  let d = null
  if (v instanceof Date) d = v
  else if (typeof v === 'number') {
    const p = XLSX.SSF.parse_date_code(v)
    if (p) d = new Date(Date.UTC(p.y, p.m - 1, p.d))
  } else if (typeof v === 'string' && v.trim()) {
    const s = v.trim()
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
    else if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/))) d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]))
  }
  if (!d || Number.isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  return { key: periodoKey(y, m), label: periodoLabel(y, m), y, m }
}

function parseFechaNDD(s) {
  const m = String(s ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  const dd = +m[1]
  const mm = +m[2] - 1
  const yy = +m[3]
  if (mm < 0 || mm > 11) return null
  return {
    key: periodoKey(yy, mm),
    label: periodoLabel(yy, mm),
    fecha: `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
    y: yy,
    m: mm,
    d: dd
  }
}

function leerSDS() {
  const files = listFiles(DIR_SDS, ['.xlsx', '.xlsm', '.xls'])
  if (!files.length) throw new Error(`No se encontro ningun Excel en ${DIR_SDS}`)

  const rows = []
  const periodos = new Map()

  for (const file of files) {
    const wb = XLSX.read(fs.readFileSync(file), { cellDates: true })
    for (const sheetName of wb.SheetNames) {
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null })
      if (!raw.length) continue

      if (pick(raw[0], 'Serie') === undefined || pick(raw[0], 'Periodo') === undefined) continue

      for (const r of raw) {
        const per = parsePeriodoExcel(pick(r, 'Periodo'))
        const serie = txt(pick(r, 'Serie'))
        if (!per || !serie) continue

        const pagBN = Math.round(num(pick(r, 'Páginas B/N', 'Paginas B/N')))
        const pagColor = Math.round(num(pick(r, 'Páginas Color', 'Paginas Color')))

        rows.push({
          periodo: per.key,
          periodoLabel: per.label,
          sede: txt(pick(r, 'Sede')) || 'SIN SEDE',
          area: txt(pick(r, 'Área', 'Area')) || 'SIN ÁREA',
          modelo: txt(pick(r, 'Nombre del equipo')).replace(/\s+/g, ' '),
          serie,
          estado: (txt(pick(r, 'Estado')) || 'PRODUCCION').toUpperCase(),
          base: num(pick(r, 'Base')),
          inicioBN: Math.round(num(pick(r, 'Inicio B/N'))),
          finBN: Math.round(num(pick(r, 'Fin B/N'))),
          pagBN,
          inicioColor: Math.round(num(pick(r, 'Inicio Color'))),
          finColor: Math.round(num(pick(r, 'Fin Color'))),
          pagColor,
          precioBN: num(pick(r, 'Precio B/N')),
          precioColor: num(pick(r, 'Precio Color'))
        })
        periodos.set(per.key, per.label)
      }
    }
  }

  if (!rows.length) throw new Error('El Excel de SDS no contiene filas de contador validas.')
  return { rows, periodos, files: files.map((f) => path.basename(f)) }
}

function leerNDD() {
  const files = listFiles(DIR_NDD, ['.csv', '.txt', '.xlsx', '.xls'])

  const acc = {
    porPeriodo: new Map(),
    porSerie: new Map(),
    porImpresora: new Map(),
    porUsuario: new Map(),
    porSerieUsuario: new Map(),
    porTrabajo: new Map(),
    porDia: new Map(),
    porDuplex: new Map(),
    porModo: new Map(),
    porTipo: new Map(),
    porPapel: new Map()
  }
  const vistos = new Set()
  let leidas = 0
  let duplicadas = 0
  let sinFecha = 0
  const detalleArchivos = []

  const bump = (map, key, extra) => {
    let o = map.get(key)
    if (!o) {
      o = { mono: 0, color: 0, jobs: 0, ...extra }
      map.set(key, o)
    }
    return o
  }

  const registrar = (rec) => {
    const { periodo, periodoLabel: pl, fecha, serie, impresora, modelo, usuario, nombre, duplex, tipo, papel, titulo, mono, color } = rec
    const total = mono + color

    const p = bump(acc.porPeriodo, periodo, { periodo, periodoLabel: pl, minFecha: fecha, maxFecha: fecha, series: new Set(), usuarios: new Set() })
    p.mono += mono; p.color += color; p.jobs += 1
    if (fecha < p.minFecha) p.minFecha = fecha
    if (fecha > p.maxFecha) p.maxFecha = fecha
    p.series.add(serie); p.usuarios.add(usuario)

    const s = bump(acc.porSerie, `${serie}||${periodo}`, { serie, periodo, periodoLabel: pl, impresora, modelo })
    s.mono += mono; s.color += color; s.jobs += 1

    const i = bump(acc.porImpresora, `${impresora}||${periodo}`, { impresora, periodo, periodoLabel: pl, serie, modelo })
    i.mono += mono; i.color += color; i.jobs += 1

    const u = bump(acc.porUsuario, `${usuario}||${periodo}`, { usuario, nombre, periodo, periodoLabel: pl })
    u.mono += mono; u.color += color; u.jobs += 1

    const su = bump(acc.porSerieUsuario, `${serie}||${usuario}||${periodo}`, { serie, usuario, nombre, periodo, periodoLabel: pl })
    su.mono += mono; su.color += color; su.jobs += 1

    if (total > 0) {
      const tr = bump(acc.porTrabajo, `${serie}||${usuario}||${titulo}||${periodo}`, { serie, usuario, titulo, periodo })
      tr.mono += mono; tr.color += color; tr.jobs += 1
    }

    const d = bump(acc.porDia, fecha, { fecha, periodo, periodoLabel: pl })
    d.mono += mono; d.color += color; d.jobs += 1

    const dx = bump(acc.porDuplex, `${duplex}||${periodo}`, { duplex, periodo, periodoLabel: pl })
    dx.mono += mono; dx.color += color; dx.jobs += 1

    const modo = color > 0 ? 'Color' : 'Monocromo'
    const md = bump(acc.porModo, `${modo}||${periodo}`, { modo, periodo, periodoLabel: pl })
    md.mono += mono; md.color += color; md.jobs += 1

    const tp = bump(acc.porTipo, `${tipo}||${periodo}`, { tipo, periodo, periodoLabel: pl })
    tp.mono += mono; tp.color += color; tp.jobs += 1

    const pa = bump(acc.porPapel, `${papel}||${periodo}`, { papel, periodo, periodoLabel: pl })
    pa.mono += mono; pa.color += color; pa.jobs += 1

    if (total === 0) return
  }

  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    let antes = leidas
    let dupAntes = duplicadas

    if (ext === '.csv' || ext === '.txt') {
      const contenido = fs.readFileSync(file, 'latin1')
      const lineas = contenido.split(/\r?\n/)
      const head = lineas[0].split(';').map((h) => norm(h))
      const idx = (name) => head.indexOf(norm(name))
      const iSerie = idx('Numero_de_Serie')
      const iImp = idx('Nombre_de_Impresora')
      const iModelo = idx('Modelo')
      const iUser = idx('Logon_Nombre')
      const iNombre = idx('Nombre_Completo')
      const iDuplex = idx('Duplex')
      const iTipo = idx('Tipo_de_Trabajo_de_Impresion')
      const iPapel = idx('Papel')
      const iTitulo = idx('Titulo')
      const iMono = idx('Paginas_Mono')
      const iColor = idx('Paginas_Color')
      const iFecha = idx('Fecha_de_Impresion')

      if (iMono < 0 || iColor < 0 || iFecha < 0) {
        console.warn(`   ! ${path.basename(file)} no tiene las columnas esperadas de NDD, se omite.`)
        continue
      }

      for (let li = 1; li < lineas.length; li++) {
        const linea = lineas[li]
        if (!linea) continue
        if (vistos.has(linea)) { duplicadas++; continue }
        vistos.add(linea)
        const c = linea.split(';')
        const f = parseFechaNDD(c[iFecha])
        if (!f) { sinFecha++; continue }
        leidas++
        registrar({
          periodo: f.key,
          periodoLabel: f.label,
          fecha: f.fecha,
          serie: (c[iSerie] || '-').trim() || '-',
          impresora: (c[iImp] || '-').trim() || '-',
          modelo: (c[iModelo] || '-').trim() || '-',
          usuario: (c[iUser] || '-').trim() || '-',
          nombre: (c[iNombre] || '-').trim() || '-',
          duplex: (c[iDuplex] || '-').trim() || '-',
          tipo: (c[iTipo] || '-').trim() || '-',
          papel: (c[iPapel] || '-').trim() || '-',
          titulo: (iTitulo >= 0 ? (c[iTitulo] || '') : '').trim() || 'Sin título',
          mono: num(c[iMono]),
          color: num(c[iColor])
        })
      }
    } else {
      const wb = XLSX.read(fs.readFileSync(file), { cellDates: true })
      for (const sheetName of wb.SheetNames) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null })
        for (const r of raw) {
          const f = parseFechaNDD(pick(r, 'Fecha_de_Impresion'))
          if (!f) { sinFecha++; continue }
          const clave = JSON.stringify(r)
          if (vistos.has(clave)) { duplicadas++; continue }
          vistos.add(clave)
          leidas++
          registrar({
            periodo: f.key,
            periodoLabel: f.label,
            fecha: f.fecha,
            serie: txt(pick(r, 'Numero_de_Serie')) || '-',
            impresora: txt(pick(r, 'Nombre_de_Impresora')) || '-',
            modelo: txt(pick(r, 'Modelo')) || '-',
            usuario: txt(pick(r, 'Logon_Nombre')) || '-',
            nombre: txt(pick(r, 'Nombre_Completo')) || '-',
            duplex: txt(pick(r, 'Duplex')) || '-',
            tipo: txt(pick(r, 'Tipo_de_Trabajo_de_Impresion')) || '-',
            papel: txt(pick(r, 'Papel')) || '-',
            titulo: txt(pick(r, 'Titulo')) || 'Sin título',
            mono: num(pick(r, 'Paginas_Mono')),
            color: num(pick(r, 'Paginas_Color'))
          })
        }
      }
    }

    detalleArchivos.push({
      archivo: path.basename(file),
      registros: leidas - antes,
      duplicados: duplicadas - dupAntes
    })
    log(`NDD · ${path.basename(file)} → ${leidas - antes} trabajos (${duplicadas - dupAntes} duplicados omitidos)`)
  }

  const arr = (map, extra = (o) => o) => [...map.values()].map(extra)

  const TOPE = 15
  const recortarTrabajos = (filas) => {
    const g = new Map()
    for (const t of filas) {
      const k = `${t.serie}||${t.usuario}||${t.periodo}`
      if (!g.has(k)) g.set(k, [])
      g.get(k).push(t)
    }
    const out = []
    for (const grupo of g.values()) {
      grupo.sort((a, b) => b.mono + b.color - (a.mono + a.color))
      out.push(...grupo.slice(0, TOPE))
      const resto = grupo.slice(TOPE)
      if (resto.length) {
        const r = resto.reduce(
          (a, b) => ({ mono: a.mono + b.mono, color: a.color + b.color, jobs: a.jobs + b.jobs }),
          { mono: 0, color: 0, jobs: 0 }
        )
        out.push({ serie: resto[0].serie, usuario: resto[0].usuario, periodo: resto[0].periodo, titulo: `Otros ${resto.length} trabajos`, otros: true, ...r })
      }
    }
    return out
  }

  const trabajos = recortarTrabajos(arr(acc.porTrabajo, (o) => ({ ...o, total: o.mono + o.color })))

  return {
    files: files.map((f) => path.basename(f)),
    detalleArchivos,
    stats: { trabajos: leidas, duplicados: duplicadas, sinFecha },
    porPeriodo: arr(acc.porPeriodo, (o) => ({
      periodo: o.periodo, periodoLabel: o.periodoLabel, mono: o.mono, color: o.color,
      total: o.mono + o.color, jobs: o.jobs, minFecha: o.minFecha, maxFecha: o.maxFecha,
      series: o.series.size, usuarios: o.usuarios.size
    })).sort((a, b) => a.periodo.localeCompare(b.periodo)),
    porSerie: arr(acc.porSerie, (o) => ({ ...o, total: o.mono + o.color })),
    porImpresora: arr(acc.porImpresora, (o) => ({ ...o, total: o.mono + o.color })),
    porUsuario: arr(acc.porUsuario, (o) => ({ ...o, total: o.mono + o.color })),
    porSerieUsuario: arr(acc.porSerieUsuario, (o) => ({ ...o, total: o.mono + o.color })),
    porTrabajo: trabajos,
    porDia: arr(acc.porDia, (o) => ({ ...o, total: o.mono + o.color })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    porDuplex: arr(acc.porDuplex, (o) => ({ ...o, total: o.mono + o.color })),
    porModo: arr(acc.porModo, (o) => ({ ...o, total: o.mono + o.color })),
    porTipo: arr(acc.porTipo, (o) => ({ ...o, total: o.mono + o.color })),
    porPapel: arr(acc.porPapel, (o) => ({ ...o, total: o.mono + o.color }))
  }
}

console.log('\n▸ Generando dataset del Informe Rico Pollo\n')

const sds = leerSDS()
log(`SDS · ${sds.files.join(', ')} → ${sds.rows.length} filas de contador`)

const ndd = leerNDD()

const periodosMap = new Map(sds.periodos)
for (const p of ndd.porPeriodo) if (!periodosMap.has(p.periodo)) periodosMap.set(p.periodo, p.periodoLabel)

const periodos = [...periodosMap.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([key, label]) => {
    const [y, m] = key.split('-').map(Number)
    const nd = ndd.porPeriodo.find((p) => p.periodo === key) || null
    const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const cubiertos = nd ? new Set(ndd.porDia.filter((d) => d.periodo === key).map((d) => d.fecha)).size : 0
    return {
      key,
      label,
      corto: label,
      largo: `${MESES_LARGOS[m - 1]} ${y}`,
      anio: y,
      mes: m,
      enSDS: sds.periodos.has(key),
      enNDD: !!nd,
      nddMinFecha: nd?.minFecha ?? null,
      nddMaxFecha: nd?.maxFecha ?? null,
      nddDiasConDatos: cubiertos,
      nddDiasMes: diasMes,
      nddParcial: !!nd && (nd.minFecha.slice(8) !== '01' || cubiertos < diasMes - 6)
    }
  })

const costosModelo = [...sds.rows.reduce((m, r) => {
  const o = m.get(r.modelo) || { modelo: r.modelo, baseMax: 0, series: new Set(), filas: 0 }
  o.baseMax = Math.max(o.baseMax, r.base)
  o.series.add(r.serie)
  o.filas++
  m.set(r.modelo, o)
  return m
}, new Map()).values()]
  .map((o) => ({ modelo: o.modelo, base: o.baseMax, equipos: o.series.size, filas: o.filas }))
  .sort((a, b) => b.base - a.base)

const seriesSDS = new Set(sds.rows.map((r) => r.serie))
const seriesNDD = new Set(ndd.porSerie.map((r) => r.serie).filter((s) => s && s !== '-'))
const catalogoSDS = new Map()
for (const r of sds.rows) if (!catalogoSDS.has(r.serie)) catalogoSDS.set(r.serie, { serie: r.serie, sede: r.sede, area: r.area, modelo: r.modelo, estado: r.estado })
const catalogoNDD = new Map()
for (const r of ndd.porSerie) if (!catalogoNDD.has(r.serie)) catalogoNDD.set(r.serie, { serie: r.serie, impresora: r.impresora, modelo: r.modelo })

const cruce = {
  soloSDS: [...seriesSDS].filter((s) => !seriesNDD.has(s)).sort().map((s) => catalogoSDS.get(s)),
  soloNDD: [...seriesNDD].filter((s) => !seriesSDS.has(s)).sort().map((s) => ({
    ...catalogoNDD.get(s),
    total: ndd.porSerie.filter((r) => r.serie === s).reduce((a, b) => a + b.total, 0)
  })),
  enAmbos: [...seriesSDS].filter((s) => seriesNDD.has(s)).length
}

const dataset = {
  meta: {
    cliente: 'Rico Pollo S.A.C.',
    proveedor: 'Misión Tecnológica',
    generado: new Date().toISOString(),
    fechaCorte: periodos.length ? periodos[periodos.length - 1].largo : '',
    origenSDS: sds.files,
    origenNDD: ndd.files,
    detalleNDD: ndd.detalleArchivos,
    statsNDD: ndd.stats,
    filasContador: sds.rows.length,
    equipos: seriesSDS.size,
    sedes: [...new Set(sds.rows.map((r) => r.sede))].sort(),
    areas: [...new Set(sds.rows.map((r) => r.area))].sort(),
    modelos: [...new Set(sds.rows.map((r) => r.modelo))].sort()
  },
  tarifas: TARIFAS,
  periodos,
  costosModelo,
  catalogoSeries: [...catalogoSDS.values()],
  contador: sds.rows,
  ndd: {
    porPeriodo: ndd.porPeriodo,
    porSerie: ndd.porSerie,
    porImpresora: ndd.porImpresora,
    porUsuario: ndd.porUsuario,
    porSerieUsuario: ndd.porSerieUsuario,
    porTrabajo: ndd.porTrabajo,
    porDia: ndd.porDia,
    porDuplex: ndd.porDuplex,
    porModo: ndd.porModo,
    porTipo: ndd.porTipo,
    porPapel: ndd.porPapel,
    cruceSeries: cruce
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(dataset), 'utf8')

console.log('')
log(`Periodos      : ${periodos.map((p) => p.label).join(' · ')}`)
log(`Equipos (serie): ${seriesSDS.size}  ·  filas contador: ${sds.rows.length}`)
log(`NDD           : ${ndd.stats.trabajos} trabajos · ${ndd.stats.duplicados} duplicados omitidos`)
log(`Cruce series  : ${cruce.enAmbos} en ambos · ${cruce.soloSDS.length} solo SDS · ${cruce.soloNDD.length} solo NDD`)
log(`Detalle NDD   : ${ndd.porSerieUsuario.length} combos usuario×equipo · ${ndd.porTrabajo.length} filas de trabajos`)
log(`Salida        : ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
console.log('\n✓ dataset.json generado\n')
