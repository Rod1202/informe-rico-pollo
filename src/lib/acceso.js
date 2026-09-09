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

const leerPin = (valor) => {
  const v = String(valor ?? '').trim()
  return /^\d{4}$/.test(v) ? v : null
}

const PIN_KPI = leerPin(import.meta.env.VITE_PIN_KPI)
const PIN_GENERAL = leerPin(import.meta.env.VITE_PIN_GENERAL)

const PINES = new Map()
if (PIN_KPI) PINES.set(PIN_KPI, 'kpi')
if (PIN_GENERAL) PINES.set(PIN_GENERAL, 'general')

export const configurado = PINES.size > 0

if (import.meta.env.DEV) {
  if (!PIN_GENERAL) console.warn('[acceso] Falta VITE_PIN_GENERAL (4 dígitos) en el archivo .env')
  if (!PIN_KPI) console.warn('[acceso] Falta VITE_PIN_KPI (4 dígitos) en el archivo .env')
  if (PIN_GENERAL && PIN_KPI && PIN_GENERAL === PIN_KPI) {
    console.warn('[acceso] VITE_PIN_GENERAL y VITE_PIN_KPI son iguales: se aplicará el acceso general')
  }
}

export const verificarPin = (pin) => ROLES[PINES.get(String(pin).trim())] ?? null

export const CLAVE_SESION = 'rico-pollo:rol'
