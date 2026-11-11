import { Link } from 'react-router-dom'
import type { PerroPublico } from '@/api'
import { NOMBRE_SEXO, formatearEdad } from '@/utilidades'
import FotoPerro from './FotoPerro'

export default function TarjetaPerro({ perro }: { perro: PerroPublico }) {
  return (
    <Link
      to={`/perros/${perro.id}`}
      className="group bg-white rounded-2xl border border-warm-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500"
    >
      <FotoPerro url={perro.foto_url} nombre={perro.nombre} className="w-full aspect-[4/3]" />
      <div className="p-4">
        <h2 className="font-serif text-2xl text-gray-900 group-hover:text-forest-700">{perro.nombre}</h2>
        <p className="text-sm text-gray-500 mb-3">{perro.raza}</p>
        <ul className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <li className="px-2.5 py-1 rounded-full bg-forest-50 text-forest-700">{NOMBRE_SEXO[perro.sexo]}</li>
          <li className="px-2.5 py-1 rounded-full bg-warm-100 text-gray-700">{perro.tamano_nombre}</li>
          <li className="px-2.5 py-1 rounded-full bg-warm-100 text-gray-700">
            {formatearEdad(perro.edad_meses, perro.fecha_nacimiento_estimada)}
          </li>
        </ul>
      </div>
    </Link>
  )
}
