import type { ReactNode } from 'react'

export default function DatoInfo({ etiqueta, valor, className }: { etiqueta: string; valor: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-0.5">{etiqueta}</p>
      <div className="text-sm font-semibold text-gray-900 break-words">{valor || '—'}</div>
    </div>
  )
}
