export const ROLES = {
  general: {
    id: 'general',
    etiqueta: 'Acceso general',
    vistas: ['resumen', 'volumetria', 'facturacion', 'auditoria', 'kpi'],
    inicio: 'resumen'
  },
  kpi: {
    id: 'kpi',
    etiqueta: 'Gerencia · KPI',
    vistas: ['kpi'],
    inicio: 'kpi'
  }
}

// Cada gerencia entra con su propio PIN, ve solo el tablero de Gerencia y solo
// el consumo de los usuarios que el padron (USUARIOS_GERENCIAS.xlsx) le asigna.
// `division` tiene que coincidir con la columna Division del padron.
const GERENCIAS = [
  { id: 'g-comercial', env: 'VITE_PIN_GER_COMERCIAL', division: 'GERENCIA CORP. COMERCIAL', etiqueta: 'Corp. Comercial' },
  { id: 'g-finanzas', env: 'VITE_PIN_GER_FINANZAS', division: 'GERENCIA CORP. FINANZAS', etiqueta: 'Corp. Finanzas' },
  { id: 'g-gestion-humana', env: 'VITE_PIN_GER_GESTION_HUMANA', division: 'GERENCIA CORP. GESTIÓN HUMANA', etiqueta: 'Corp. Gestión Humana' },
  { id: 'g-marketing', env: 'VITE_PIN_GER_MARKETING', division: 'GERENCIA CORP. MARKETING', etiqueta: 'Corp. Marketing' },
  { id: 'g-ti', env: 'VITE_PIN_GER_TI', division: 'GERENCIA CORP. TECNOLOG. DE LA INFORMACIÓN', etiqueta: 'Corp. Tecnología de la Información' },
  { id: 'g-calidad', env: 'VITE_PIN_GER_CALIDAD', division: 'GERENCIA DE ASEGURAMIENTO DE LA CALIDAD', etiqueta: 'Aseguramiento de la Calidad' },
  { id: 'g-logistica', env: 'VITE_PIN_GER_LOGISTICA', division: 'GERENCIA DE DIVISIÓN LOGÍSTICA', etiqueta: 'División Logística' },
  { id: 'g-planta-ab', env: 'VITE_PIN_GER_PLANTA_AB', division: 'GERENCIA DE PLANTA AB', etiqueta: 'Planta AB' },
  { id: 'g-general', env: 'VITE_PIN_GER_GENERAL', division: 'GERENCIA GENERAL', etiqueta: 'Gerencia General' },
  { id: 'g-retail', env: 'VITE_PIN_GER_RETAIL', division: 'GERENCIA NEG. RETAIL', etiqueta: 'Neg. Retail' },
  { id: 'g-avicola', env: 'VITE_PIN_GER_AVICOLA', division: 'GERENCIA PRODUCCIÓN AVÍCOLA', etiqueta: 'Producción Avícola' },
  { id: 'g-porcina', env: 'VITE_PIN_GER_PORCINA', division: 'GERENCIA PRODUCCIÓN PORCINA', etiqueta: 'Producción Porcina' },
  { id: 'g-agroindustriales', env: 'VITE_PIN_GER_AGROINDUSTRIALES', division: 'NEGOCIOS AGROINDUSTRIALES', etiqueta: 'Negocios Agroindustriales' },
  { id: 'g-oficina-ejecutiva', env: 'VITE_PIN_GER_OFICINA_EJECUTIVA', division: 'OFICINA EJECUTIVA', etiqueta: 'Oficina Ejecutiva' },
  { id: 'g-legal', env: 'VITE_PIN_GER_LEGAL', division: 'LEGAL', etiqueta: 'Legal' },
  {
    id: 'g-capacidades',
    env: 'VITE_PIN_GER_CAPACIDADES',
    division: 'GERENCIA DE DIVISIÓN DE CAPACIDADES INDUSTRIALES',
    etiqueta: 'División de Capacidades Industriales'
  }
]

for (const g of GERENCIAS) {
  ROLES[g.id] = {
    id: g.id,
    etiqueta: `Gerencia · ${g.etiqueta}`,
    vistas: ['kpi'],
    inicio: 'kpi',
    gerencia: g.division
  }
}

const leerPin = (valor) => {
  const v = String(valor ?? '').trim()
  return /^\d{4}$/.test(v) ? v : null
}

const ENV = import.meta.env
const PIN_KPI = leerPin(ENV.VITE_PIN_KPI)
const PIN_GENERAL = leerPin(ENV.VITE_PIN_GENERAL)

const PINES = new Map()
const duplicados = []

// El primero que reclama un PIN se lo queda; los choques se avisan en vez de
// resolverse en silencio, porque dejarian una gerencia sin acceso.
const registrar = (pin, rolId) => {
  if (!pin) return
  if (PINES.has(pin)) {
    duplicados.push({ pin, tomado: PINES.get(pin), rechazado: rolId })
    return
  }
  PINES.set(pin, rolId)
}

registrar(PIN_GENERAL, 'general')
registrar(PIN_KPI, 'kpi')
for (const g of GERENCIAS) registrar(leerPin(ENV[g.env]), g.id)

export const configurado = PINES.size > 0

export const gerenciasConfiguradas = GERENCIAS.filter((g) => leerPin(ENV[g.env])).map((g) => g.division)

if (import.meta.env.DEV) {
  if (!PIN_GENERAL) console.warn('[acceso] Falta VITE_PIN_GENERAL (4 dígitos) en el archivo .env')
  if (!PIN_KPI) console.warn('[acceso] Falta VITE_PIN_KPI (4 dígitos) en el archivo .env')
  const sinPin = GERENCIAS.filter((g) => !leerPin(ENV[g.env]))
  if (sinPin.length) {
    console.warn(`[acceso] ${sinPin.length} gerencia(s) sin PIN: ${sinPin.map((g) => g.env).join(', ')}`)
  }
  for (const d of duplicados) {
    console.warn(`[acceso] PIN ${d.pin} repetido: lo usa "${d.tomado}", se ignora para "${d.rechazado}"`)
  }
}

export const verificarPin = (pin) => ROLES[PINES.get(String(pin).trim())] ?? null

export const CLAVE_SESION = 'rico-pollo:rol'
