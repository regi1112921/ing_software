import { Link } from 'react-router-dom'
import { CheckCircle, ChevronRight } from 'lucide-react'
import type { PerrosEnTratamiento } from '@/api/tipos'
import EstadoVacio from '@/shared/components/EstadoVacio'
import FotoPerro from '@/shared/components/FotoPerro'
import { ENLACE_ACCION, TARJETA } from '@/shared/utils/estilos'
import { NOMBRE_SEXO, formatearFecha } from '@/shared/utils/formato'

// HU-14 · Perros que requieren atención (del ingreso más antiguo al más reciente)
export default function TablaTratamiento({ datos }: { datos: PerrosEnTratamiento }) {
  return (
    <section aria-labelledby="titulo-tratamiento">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 id="titulo-tratamiento" className="font-bold text-gray-800">
          Perros que requieren atención
        </h2>
        {datos.total > 0 && (
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full whitespace-nowrap">
            {datos.total} en tratamiento
          </span>
        )}
      </div>
      <div className={`${TARJETA} overflow-hidden`}>
        {datos.total === 0 ? (
          <EstadoVacio icono={CheckCircle} titulo="Sin perros en tratamiento" descripcion="Todos los animales están en buen estado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50">
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Perro
                  </th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Raza
                  </th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Ingreso
                  </th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {datos.perros.map((perro) => (
                  <tr key={perro.id} className="hover:bg-warm-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <FotoPerro url={perro.foto_url} nombre={perro.nombre} className="size-9 rounded-full flex-shrink-0" tamanoIcono={15} />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{perro.nombre}</p>
                          <p className="text-xs text-gray-400">{NOMBRE_SEXO[perro.sexo]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{perro.raza}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{formatearFecha(perro.fecha_ingreso)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to={`/perros/${perro.id}`} className={ENLACE_ACCION}>
                        Ver <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
