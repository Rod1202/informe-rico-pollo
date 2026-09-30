import { costoClic } from './measures.js'
import { SIN_AUDITORIA } from './prorrateo.js'

// Los dos baldes que no corresponden a ninguna gerencia real. Se muestran
// aparte para que el grafico siga sumando exactamente la factura en vez de
// quedarse corto sin explicar por que.
export const SIN_AUDITORIA_BUCKET = '__sin_auditoria__'
export const FUERA_PADRON = '__fuera_padron__'

export const ES_RESIDUAL = (clave) => clave === SIN_AUDITORIA_BUCKET || clave === FUERA_PADRON

export const ETIQUETA_RESIDUAL = {
  [SIN_AUDITORIA_BUCKET]: 'Sin auditoría NDD',
  [FUERA_PADRON]: 'Fuera del padrón'
}

const div = (a, b) => (b ? a / b : 0)

// Campos del padron: g = gerencia (Division), a = area, d = departamento.
const CAMPO = { gerencia: 'g', area: 'a', dpto: 'd' }

// A que balde cae una fila del reparto segun el campo pedido. Una fila sin
// auditoria no tiene persona; una persona fuera del padron no tiene gerencia.
export function balde(fila, padron, campo = 'gerencia') {
  if (fila.sinAuditoria || fila.usuario === SIN_AUDITORIA) return SIN_AUDITORIA_BUCKET
  const persona = padron[String(fila.usuario).toLowerCase()]
  if (!persona) return FUERA_PADRON
  return persona[CAMPO[campo] ?? 'g'] ?? FUERA_PADRON
}

// Agrupa el reparto por la jerarquia de la persona que imprimio, comparando
// contra el periodo previo. Misma forma que devuelve `comparar()`, para que
// los rankings existentes la consuman sin cambios.
export function agruparPersonas(asignadoActual, asignadoPrevio, padron, campo, tarifas) {
  const juntar = (filas) => {
    const g = new Map()
    for (const a of filas) {
      const clave = balde(a, padron, campo)
      const o = g.get(clave) ?? {
        clave, volumetria: 0, volBN: 0, volColor: 0, facturacion: 0,
        usuarios: new Set(), equipos: new Set()
      }
      o.volBN += a.bn
      o.volColor += a.color
      o.volumetria += a.bn + a.color
      o.facturacion += costoClic(a.bn, a.color, a.serie, tarifas)
      o.equipos.add(a.serie)
      if (!ES_RESIDUAL(clave) || clave === FUERA_PADRON) o.usuarios.add(a.usuario)
      g.set(clave, o)
    }
    return g
  }

  const act = juntar(asignadoActual)
  const pre = juntar(asignadoPrevio)

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
        residual: ES_RESIDUAL(clave),
        volumetria: vol,
        volBN: a?.volBN ?? 0,
        volColor: a?.volColor ?? 0,
        facturacion: fact,
        clicVariable: fact,
        cargoFijo: 0,
        usuarios: a ? a.usuarios.size : 0,
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
    // Las gerencias reales primero por volumen; los residuales siempre al final.
    .sort((x, y) => (x.residual === y.residual ? y.volumetria - x.volumetria : x.residual ? 1 : -1))
}

// Detalle de un nivel de la jerarquia: las areas (o departamentos) de la gente,
// con sus usuarios adentro. Reemplaza a agruparPorArea cuando el eje es la
// persona y no el equipo.
export function agruparAreasPersonas(asignado, padron, tarifas, { gerencia = null, campo = 'area' } = {}) {
  const areas = new Map()

  for (const a of asignado) {
    if (gerencia && balde(a, padron, 'gerencia') !== gerencia) continue
    const clave = balde(a, padron, campo)
    let g = areas.get(clave)
    if (!g) {
      g = {
        area: clave,
        residual: ES_RESIDUAL(clave),
        gerencias: new Set(),
        equipos: new Set(),
        ubicaciones: new Set(),
        mono: 0, color: 0, total: 0, jobs: 0, costo: 0, sinAuditoria: 0,
        motivosSinAuditoria: [],
        usuarios: new Map()
      }
      areas.set(clave, g)
    }
    const costo = costoClic(a.bn, a.color, a.serie, tarifas)
    g.mono += a.bn
    g.color += a.color
    g.total += a.bn + a.color
    g.jobs += a.jobs
    g.costo += costo
    g.equipos.add(a.serie)
    g.gerencias.add(balde(a, padron, 'gerencia'))
    if (a.sinAuditoria) g.sinAuditoria += a.bn + a.color

    const persona = padron[String(a.usuario).toLowerCase()]
    let u = g.usuarios.get(a.usuario)
    if (!u) {
      u = {
        usuario: a.usuario,
        nombre: persona?.n ?? a.nombre,
        mono: 0, color: 0, total: 0, jobs: 0, costo: 0,
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
  }

  return [...areas.values()]
    .map((g) => ({
      ...g,
      sedes: [],
      gerencias: [...g.gerencias],
      ubicaciones: [...g.ubicaciones],
      equipos: g.equipos.size,
      usuarios: [...g.usuarios.values()]
        .map((u) => ({ ...u, equipos: u.equipos.size, __key: u.usuario }))
        .sort((x, y) => y.total - x.total)
    }))
    .sort((x, y) => (x.residual === y.residual ? y.total - x.total : x.residual ? 1 : -1))
}

// Ranking global de personas, con el nombre que trae el padron.
export function usuariosDePersonas(asignado, padron, tarifas, { gerencia = null } = {}) {
  const g = new Map()
  for (const a of asignado) {
    if (gerencia && balde(a, padron, 'gerencia') !== gerencia) continue
    const persona = padron[String(a.usuario).toLowerCase()]
    let u = g.get(a.usuario)
    if (!u) {
      u = {
        usuario: a.usuario,
        nombre: persona?.n ?? a.nombre,
        mono: 0, color: 0, total: 0, jobs: 0, costo: 0,
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
    u.areas.add(balde(a, padron, 'area'))
    u.equipos.add(a.serie)
  }
  return [...g.values()]
    .map((u) => ({ ...u, areas: [...u.areas], equipos: u.equipos.size, __key: u.usuario }))
    .sort((a, b) => b.total - a.total)
}

// Usuarios de una gerencia segun el padron (para los PIN de acceso).
export function usuariosDeDivision(padron, gerencia) {
  const out = new Set()
  for (const [usuario, p] of Object.entries(padron ?? {})) {
    if (p?.g === gerencia) out.add(String(usuario).toLowerCase())
  }
  return out
}
