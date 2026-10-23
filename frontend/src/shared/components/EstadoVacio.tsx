import type { ComponentType, ReactNode } from 'react'

interface Props {
  icono: ComponentType<{ size?: number; className?: string }>
  titulo: string
  descripcion?: string
  accion?: ReactNode
}

export default function EstadoVacio({ icono: Icono, titulo, descripcion, accion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="size-14 rounded-full bg-warm-100 flex items-center justify-center mb-3">
        <Icono size={26} className="text-warm-300" />
      </div>
      <p className="font-semibold text-gray-600">{titulo}</p>
      {descripcion && <p className="text-sm text-gray-400 mt-1 max-w-sm">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}
