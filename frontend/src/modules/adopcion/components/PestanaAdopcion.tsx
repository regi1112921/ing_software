import { Link } from 'react-router-dom'
import { ChevronRight, Heart } from 'lucide-react'
import type { PerroDetalle } from '@/api/tipos'
import DatoInfo from '@/shared/components/DatoInfo'
import EstadoVacio from '@/shared/components/EstadoVacio'
import InsigniaEstado from '@/shared/components/InsigniaEstado'
import { BOTON_PRIMARIO, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'

// Pestaña "Adopción" de la ficha del perro (HU-07).
export default function PestanaAdopcion({ perro }: { perro: PerroDetalle }) {
  const adopcion = perro.adopcion_vigente

  if (adopcion) {
    return (
      <div className={`${TARJETA} p-5 sm:p-6`}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <h3 className="font-bold text-gray-900">Proceso de adopción</h3>
          <InsigniaEstado tipo="adopcion" estado={adopcion.estado} nombre={adopcion.estado_nombre} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <DatoInfo etiqueta="Adoptante" valor={adopcion.adoptante.nombre_completo} />
          <DatoInfo etiqueta="Teléfono" valor={adopcion.adoptante.telefono} />
          <DatoInfo etiqueta="Fecha de solicitud" valor={formatearFecha(adopcion.fecha_solicitud)} />
          <DatoInfo etiqueta="Dirección" valor={adopcion.adoptante.direccion} />
        </div>
        <Link to={`/adopciones/${adopcion.id}`} className="inline-flex items-center gap-1 text-forest-600 hover:text-forest-700 text-sm font-bold">
          Ver detalle completo <ChevronRight size={14} />
        </Link>
      </div>
    )
  }

  if (perro.estado !== 'disponible') {
    return (
      <div className={TARJETA}>
        <EstadoVacio
          icono={Heart}
          titulo="Sin proceso de adopción"
          descripcion={
            perro.estado === 'en_tratamiento'
              ? 'El perro está en tratamiento médico. Cuando esté disponible podrá iniciar un proceso de adopción.'
              : 'El perro no está disponible para adopción.'
          }
        />
      </div>
    )
  }

  return (
    <div className={`${TARJETA} p-8 text-center`}>
      <div className="size-14 rounded-full bg-forest-50 flex items-center justify-center mx-auto mb-4">
        <Heart size={24} className="text-forest-500" />
      </div>
      <p className="font-bold text-gray-900 mb-1">{perro.nombre} está disponible para adopción</p>
      <p className="text-sm text-gray-400 mb-6">Puedes iniciar un proceso registrando los datos del adoptante.</p>
      <Link to={`/adopciones/nueva?perro=${perro.id}`} className={BOTON_PRIMARIO}>
        Iniciar proceso de adopción
      </Link>
    </div>
  )
}
