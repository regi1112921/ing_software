import { Check, X } from 'lucide-react'
import type { Adopcion } from '@/api/tipos'
import { formatearFecha } from '@/shared/utils/formato'

interface Etapa {
  nombre: string
  fecha: string | null
  tipo: 'hecha' | 'rechazo' | 'pendiente'
}

// Etapas del proceso. Solo se muestran con fecha las que se alcanzaron (HU-11).
function etapas(a: Adopcion): Etapa[] {
  const lista: Etapa[] = [{ nombre: 'Solicitud', fecha: a.fecha_solicitud, tipo: 'hecha' }]
  if (a.estado === 'rechazada') {
    if (a.fecha_aprobacion) lista.push({ nombre: 'Aprobación', fecha: a.fecha_aprobacion, tipo: 'hecha' })
    lista.push({ nombre: 'Rechazo', fecha: a.fecha_rechazo, tipo: 'rechazo' })
    return lista
  }
  lista.push({ nombre: 'Aprobación', fecha: a.fecha_aprobacion, tipo: a.fecha_aprobacion ? 'hecha' : 'pendiente' })
  lista.push({ nombre: 'Entrega (adopción)', fecha: a.fecha_adopcion, tipo: a.fecha_adopcion ? 'hecha' : 'pendiente' })
  return lista
}

export default function LineaTiempoAdopcion({ adopcion }: { adopcion: Adopcion }) {
  return (
    <ol className="relative">
      {etapas(adopcion).map((etapa, i, todas) => (
        <li key={etapa.nombre} className="flex gap-3 pb-5 last:pb-0 relative">
          {i < todas.length - 1 && <span aria-hidden="true" className="absolute left-[11px] top-6 bottom-0 w-px bg-warm-200" />}
          <span
            className={`size-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
              etapa.tipo === 'hecha'
                ? 'bg-forest-600 border-forest-600 text-white'
                : etapa.tipo === 'rechazo'
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-warm-300'
            }`}
          >
            {etapa.tipo === 'hecha' && <Check size={13} strokeWidth={3} />}
            {etapa.tipo === 'rechazo' && <X size={13} strokeWidth={3} />}
          </span>
          <div className="pt-0.5">
            <p className={`text-sm font-semibold ${etapa.tipo === 'pendiente' ? 'text-gray-400' : 'text-gray-900'}`}>{etapa.nombre}</p>
            <p className="text-xs text-gray-400">{etapa.tipo === 'pendiente' ? 'Pendiente' : formatearFecha(etapa.fecha)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
