import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  etiqueta: string
  valor: number
  icono: ComponentType<{ size?: number; className?: string }>
  claseTarjeta: string
  claseIcono: string
  // Al hacer clic abre el listado de perros (filtrado si corresponde).
  a: string
}

export default function TarjetaIndicador({ etiqueta, valor, icono: Icono, claseTarjeta, claseIcono, a }: Props) {
  return (
    <Link
      to={a}
      className={`group rounded-xl border p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 ${claseTarjeta}`}
    >
      <div className="flex items-start justify-between mb-4 gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-snug">{etiqueta}</p>
        <Icono size={16} className={claseIcono} />
      </div>
      <p className="text-3xl font-bold text-gray-900">{valor}</p>
    </Link>
  )
}
