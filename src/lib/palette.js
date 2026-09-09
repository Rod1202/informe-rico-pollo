export const CAT = ['#0066ff', '#111827', '#9db4d0', '#0b2b6b']

export const C = {
  blue: '#0066ff',
  blueDark: '#0047b3',
  blueDeep: '#0b2b6b',
  blueSoft: '#e8f0ff',
  ink: '#111827',
  graphite: '#1b1f27',
  gray: '#9db4d0',
  grid: '#e6ebf1',
  axis: '#94a3b8',
  text: '#334155',
  textMuted: '#64748b'
}

export const RAMPA = ['#e8f0ff', '#c7dcff', '#93bdff', '#4d94ff', '#0066ff', '#0047b3', '#0b2b6b']

export const ESTADO = {
  ok: '#059669',
  aviso: '#d97706',
  grave: '#e11d48',
  neutro: '#64748b'
}

export const rampaColor = (t, piso = 0.28) => {
  const v = piso + Math.max(0, Math.min(1, t || 0)) * (1 - piso)
  const i = Math.max(0, Math.min(RAMPA.length - 1, Math.round(v * (RAMPA.length - 1))))
  return RAMPA[i]
}
