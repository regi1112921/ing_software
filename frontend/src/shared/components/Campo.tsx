import { cloneElement, isValidElement, useId, type ReactElement } from 'react'

interface Props {
  etiqueta: string
  obligatorio?: boolean
  error?: string
  ayuda?: string
  className?: string
  // Un único input/select/textarea: recibe id, aria-invalid y aria-describedby.
  children: ReactElement<Record<string, unknown>>
}

export default function Campo({ etiqueta, obligatorio, error, ayuda, className, children }: Props) {
  const id = useId()
  const idMensaje = `${id}-mensaje`
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || ayuda ? idMensaje : undefined,
      })
    : children

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
        {etiqueta}
        {obligatorio && <span className="text-red-500"> *</span>}
      </label>
      {control}
      {error ? (
        <p id={idMensaje} className="text-xs text-red-600 mt-1.5">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={idMensaje} className="text-xs text-gray-400 mt-1.5">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}
