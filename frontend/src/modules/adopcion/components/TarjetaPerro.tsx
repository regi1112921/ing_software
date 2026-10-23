import { Link } from 'react-router-dom'
import type { Perro } from '@/api/tipos'
import FotoPerro from '@/shared/components/FotoPerro'
import InsigniaEstado from '@/shared/components/InsigniaEstado'
import { NOMBRE_SEXO, formatearEdad } from '@/shared/utils/formato'

export default function TarjetaPerro({ perro }: { perro: Perro }) {
  return (
    <Link
      to={`/perros/${perro.id}`}
      className="group bg-white rounded-xl border border-warm-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500"
    >
      <div className="relative h-44 overflow-hidden">
        <FotoPerro
          url={perro.foto_url}
          nombre={perro.nombre}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
          tamanoIcono={36}
        />
        <div className="absolute top-3 right-3">
          <InsigniaEstado tipo="perro" estado={perro.estado} nombre={perro.estado_nombre} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg leading-tight">{perro.nombre}</h3>
        <p className="text-gray-500 text-sm mb-3">{perro.raza}</p>
        <dl className="grid grid-cols-3 gap-1 bg-warm-50 rounded-lg p-2.5 text-center">
          <div>
            <dt className="text-xs text-gray-400 mb-0.5">Sexo</dt>
            <dd className="text-xs font-bold text-gray-700">{NOMBRE_SEXO[perro.sexo]}</dd>
          </div>
          <div className="border-x border-warm-200">
            <dt className="text-xs text-gray-400 mb-0.5">Edad</dt>
            <dd className="text-xs font-bold text-gray-700">{formatearEdad(perro.edad_meses, perro.fecha_nacimiento_estimada)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-0.5">Tamaño</dt>
            <dd className="text-xs font-bold text-gray-700">{perro.tamano_nombre}</dd>
          </div>
        </dl>
      </div>
    </Link>
  )
}
