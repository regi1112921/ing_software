import { Link } from 'react-router-dom'
import { Eye, EyeOff, LoaderCircle, Pencil } from 'lucide-react'
import type { Historia } from '@/api/tipos'
import FotoPerro from '@/shared/components/FotoPerro'
import { BOTON_SECUNDARIO, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'

interface Props {
  historia: Historia
  cambiando: boolean
  onEditar: () => void
  onCambiarVisible: () => void
}

// HU-14 · Una historia publicada en el panel interno, con sus acciones.
export default function TarjetaHistoria({ historia, cambiando, onEditar, onCambiarVisible }: Props) {
  return (
    <article className={`${TARJETA} overflow-hidden flex flex-col sm:flex-row ${historia.visible ? '' : 'bg-warm-50'}`}>
      <FotoPerro
        url={historia.foto_url}
        nombre={historia.perro_nombre}
        className={`w-full h-48 sm:h-auto sm:w-44 flex-shrink-0 ${historia.visible ? '' : 'opacity-60 grayscale'}`}
        tamanoIcono={28}
      />
      <div className="p-4 sm:p-5 flex flex-col flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-bold text-gray-900 min-w-0">{historia.titulo}</h3>
          {historia.visible ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">
              <Eye size={12} /> Visible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold bg-gray-100 text-gray-600 border-gray-200 whitespace-nowrap">
              <EyeOff size={12} /> Oculta
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3">
          <Link to={`/adopciones/${historia.solicitud_id}`} className="font-semibold text-forest-700 hover:underline">
            {historia.perro_nombre}
          </Link>{' '}
          · {historia.adoptante_nombre} · publicada el {formatearFecha(historia.fecha_publicacion)} por {historia.publicado_por_nombre}
        </p>
        <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-4 flex-1">{historia.relato}</p>
        <div className="mt-4 pt-3 border-t border-warm-100 flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={onEditar} className={`${BOTON_SECUNDARIO} !py-1.5 !px-3 text-xs`}>
            <Pencil size={13} /> Editar
          </button>
          <button
            type="button"
            onClick={onCambiarVisible}
            disabled={cambiando}
            className={`${BOTON_SECUNDARIO} !py-1.5 !px-3 text-xs`}
          >
            {cambiando ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : historia.visible ? (
              <EyeOff size={13} />
            ) : (
              <Eye size={13} />
            )}
            {historia.visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
    </article>
  )
}
