import React from 'react'

const LOGO_SRC = '/img/logoMT.png'

export function Isotipo({ size = 34, onInicio }) {
  const img = (
    <img
      src={LOGO_SRC}
      alt="Misión Tecnológica"

      style={{ maxHeight: size }}
      className="w-auto max-w-full object-contain select-none"
      draggable={false}
    />
  )

  if (!onInicio) return img

  return (
    <button
      type="button"
      onClick={onInicio}
      title="Volver al inicio de la vista"
      aria-label="Volver al inicio de la vista"
      className="w-full h-full flex items-center justify-center rounded-lg transition hover:bg-slate-50 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-mt-blue/40"
    >
      {img}
    </button>
  )
}
