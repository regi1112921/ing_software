import { AlertCircle, RotateCw } from 'lucide-react'

interface Props {
  mensaje: string
  onReintentar?: () => void
}

export default function MensajeError({ mensaje, onReintentar }: Props) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1">{mensaje}</p>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="inline-flex items-center gap-1.5 font-bold text-red-700 hover:text-red-800 whitespace-nowrap"
        >
          <RotateCw size={14} /> Reintentar
        </button>
      )}
    </div>
  )
}
