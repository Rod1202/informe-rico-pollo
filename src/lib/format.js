const nfInt = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf3 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const nfTarifa = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 5 })

export const fInt = (v) => nfInt.format(Math.round(v || 0))
export const fMoney = (v) => `$${nf2.format(v || 0)}`
export const fMoney3 = (v) => `$${nf3.format(v || 0)}`
export const fTarifa = (v) => `$${nfTarifa.format(v || 0)}`
export const fPct = (v, d = 1) => `${(d === 0 ? nfInt : nf1).format((v || 0) * 100)}%`
export const fPct2 = (v) => `${nf2.format((v || 0) * 100)}%`
export const fDelta = (v, d = 1) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const s = v > 0 ? '+' : ''
  return `${s}${(d === 0 ? nfInt : nf1).format(v * 100)}%`
}
export const fSigned = (v, fmt = fInt) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))}`
export const fCompact = (v) => {
  const n = Math.abs(v || 0)
  if (n >= 1e6) return `${nf1.format(v / 1e6)}M`
  if (n >= 1e3) return `${nf1.format(v / 1e3)}k`
  return nfInt.format(v || 0)
}
export const fFecha = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
export const titulo = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/(^|\s|\()\p{L}/gu, (c) => c.toUpperCase())
