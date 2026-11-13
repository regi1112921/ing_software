import { Link } from 'react-router-dom'
import { ClipboardCheck, FileText, Pencil, XCircle } from 'lucide-react'
import type { Cita } from '@/api/tipos'
import FotoPerro from '@/shared/components/FotoPerro'
import { ENLACE_ACCION } from '@/shared/utils/estilos'
import { ESTILO_ESTADO_CITA, ESTILO_TIPO_CITA, NOMBRE_ESTADO_CITA, NOMBRE_TIPO_CITA } from '../utils/citas'

interface Props {
  cita: Cita
  hoyTexto: string
  onCancelar: () => void
}

// HU-11 · Una cita dentro de un día de la agenda, con sus acciones según el estado.
export default function TarjetaCita({ cita, hoyTexto, onCancelar }: Props) {
  const cancelada = cita.estado === 'cancelada'
  return (
    <article className={`rounded-lg border border-warm-200 bg-white p-2.5 text-sm ${cancelada ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`font-bold text-gray-900 ${cancelada ? 'line-through' : ''}`}>{cita.hora}</span>
        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${ESTILO_TIPO_CITA[cita.tipo]}`}>
          {NOMBRE_TIPO_CITA[cita.tipo]}
        </span>
      </div>
      <Link to={`/perros/${cita.perro_id}?pestana=historial`} className="flex items-center gap-2 group">
        <FotoPerro url={cita.perro_foto_url} nombre={cita.perro_nombre} className="size-7 rounded-full flex-shrink-0" tamanoIcono={12} />
        <span className="font-semibold text-gray-900 group-hover:text-forest-700 truncate">{cita.perro_nombre}</span>
      </Link>
      <p className="text-xs text-gray-600 mt-1.5 line-clamp-2" title={cita.motivo}>
        {cita.motivo}
      </p>
      <p className="text-xs text-gray-400 mt-0.5 truncate">{cita.veterinario_nombre}</p>
      {cita.estado !== 'programada' && (
        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${ESTILO_ESTADO_CITA[cita.estado]}`}>
          {NOMBRE_ESTADO_CITA[cita.estado]}
        </span>
      )}
      {cancelada && cita.motivo_cancelacion && (
        <p className="text-xs text-gray-500 mt-1 italic line-clamp-2" title={cita.motivo_cancelacion}>
          {cita.motivo_cancelacion}
        </p>
      )}
      {cita.estado === 'programada' && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-warm-100">
          {cita.fecha <= hoyTexto && (
            <Link to={`/agenda/${cita.id}/atender`} className={ENLACE_ACCION}>
              <ClipboardCheck size={13} /> Atender
            </Link>
          )}
          <Link to={`/agenda/${cita.id}/editar`} className={ENLACE_ACCION}>
            <Pencil size={13} /> Editar
          </Link>
          <button type="button" onClick={onCancelar} className={`${ENLACE_ACCION} !text-red-600 hover:!text-red-700`}>
            <XCircle size={13} /> Cancelar
          </button>
        </div>
      )}
      {cita.estado === 'atendida' && (
        <Link to={`/perros/${cita.perro_id}?pestana=historial`} className={`${ENLACE_ACCION} mt-2`}>
          <FileText size={13} /> Ver en el historial
        </Link>
      )}
    </article>
  )
}
