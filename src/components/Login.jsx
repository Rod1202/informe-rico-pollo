import React, { useEffect, useRef, useState } from 'react'


const LARGO = 4

export default function Login({ onAcceso, verificar, configurado = true }) {
  const [digitos, setDigitos] = useState(Array(LARGO).fill(''))
  const [error, setError] = useState('')
  const [sacude, setSacude] = useState(false)
  const refs = useRef([])
  const envio = useRef(null)

  useEffect(() => { refs.current[0]?.focus() }, [])

  const pin = digitos.join('')
  const completo = pin.length === LARGO

  const escribir = (i, valor) => {
    const limpio = String(valor).replace(/\D/g, '')
    if (!limpio) return
    setError('')
    const next = [...digitos]
    
    for (let k = 0; k < limpio.length && i + k < LARGO; k++) next[i + k] = limpio[k]
    setDigitos(next)
    const destino = Math.min(i + limpio.length, LARGO - 1)
    refs.current[destino]?.focus()
    refs.current[destino]?.select()
  }

  const tecla = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      setError('')
      const next = [...digitos]
      if (next[i]) next[i] = ''
      else if (i > 0) { next[i - 1] = ''; refs.current[i - 1]?.focus() }
      setDigitos(next)
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < LARGO - 1) refs.current[i + 1]?.focus()
    else if (e.key === 'Enter') validar()
  }

  const validar = () => {
    clearTimeout(envio.current)
    if (!configurado) {
      setError('Falta configurar los PIN de acceso en las variables de entorno.')
      return
    }
    if (!completo) {
      setError('Ingrese los 4 dígitos.')
      return
    }
    const rol = verificar(pin)
    if (rol) {
      onAcceso(rol)
      return
    }
    setError('PIN incorrecto. Verifique e intente de nuevo.')
    setSacude(true)
    setDigitos(Array(LARGO).fill(''))
    setTimeout(() => { setSacude(false); refs.current[0]?.focus() }, 420)
  }

  
  useEffect(() => {
    if (pin.length !== LARGO) return
    envio.current = setTimeout(validar, 180)
    return () => clearTimeout(envio.current)
    
  }, [pin])

  return (
    <div className="min-h-full w-full flex items-center justify-center p-6">
      <div
        className={`w-full max-w-[415px] bg-white rounded-[28px] shadow-[0_18px_50px_-12px_rgba(148,163,184,0.35)] px-10 py-9 text-center ${
          sacude ? 'animate-sacudir' : ''
        }`}
      >
        <img src="/img/logo.png" alt="Misión Tecnológica" className="h-14 w-auto mx-auto object-contain" draggable={false} />

        <p className="text-[13px] font-semibold text-slate-700 mt-7">Ingrese su PIN de acceso</p>

        {!configurado && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 leading-snug">
            No hay PIN configurados. Defina <strong className="font-mono">VITE_PIN_GENERAL</strong> y{' '}
            <strong className="font-mono">VITE_PIN_KPI</strong> en las variables de entorno y vuelva a compilar.
          </p>
        )}

        <div
          className="flex justify-center gap-4 mt-5"
          onPaste={(e) => { e.preventDefault(); escribir(0, e.clipboardData.getData('text')) }}
        >
          {digitos.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              onChange={(e) => escribir(i, e.target.value)}
              onKeyDown={(e) => tecla(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={LARGO}
              aria-label={`Dígito ${i + 1} de ${LARGO}`}
              className={`w-[52px] h-[62px] rounded-xl border text-center text-xl font-bold text-slate-800 num bg-white outline-none transition-colors ${
                error ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-mt-blue'
              } focus:ring-4 focus:ring-mt-blue/10`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={validar}
          className="w-full mt-6 rounded-full bg-mt-blue text-white font-bold text-[15px] py-3.5 shadow-blue hover:bg-mt-blueDark active:scale-[0.99] transition"
        >
          Validar
        </button>

        <p className={`text-[11px] mt-3 min-h-[16px] ${error ? 'text-rose-600 font-semibold' : 'text-transparent'}`} role="alert">
          {error || '·'}
        </p>

        <p className="text-[11px] font-semibold text-slate-500 mt-1">Power by Rodrigo Carbonel</p>
      </div>
    </div>
  )
}
