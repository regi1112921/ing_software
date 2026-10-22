import { Link } from 'react-router-dom'
import { Plus, Stethoscope } from 'lucide-react'
import { veterinariaApi } from '@/api/veterinaria.api'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import EstadoVacio from '@/shared/components/EstadoVacio'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'

// HU-08 · Historial médico del perro (de la atención más reciente a la más antigua)
export default function HistorialMedico({ perroId }: { perroId: number }) {
  const { datos, error, recargar } = useCarga(() => veterinariaApi.obtenerHistorial(perroId), [perroId])
  const rutaNueva = `/perros/${perroId}/atenciones/nueva`

  if (error) return <MensajeError mensaje={error} onReintentar={recargar} />
  if (!datos) return <Cargando />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">
          {datos.total} {datos.total === 1 ? 'atención registrada' : 'atenciones registradas'}
        </p>
        {datos.total > 0 && (
          <Link to={rutaNueva} className={BOTON_PRIMARIO}>
            <Plus size={14} /> Registrar atención
          </Link>
        )}
      </div>

      {datos.total === 0 ? (
        <div className={TARJETA}>
          <EstadoVacio
            icono={Stethoscope}
            titulo="Sin historial médico"
            descripcion="Registra la primera atención médica del perro."
            accion={
              <Link to={rutaNueva} className={BOTON_PRIMARIO}>
                <Plus size={14} /> Registrar atención
              </Link>
            }
          />
        </div>
      ) : (
        <ol className="space-y-3">
          {datos.consultas.map((c) => (
            <li key={c.id} className={`${TARJETA} p-5`}>
              <div className="flex items-start gap-3 mb-4">
                <div className="size-9 rounded-full bg-forest-50 border border-forest-200 flex items-center justify-center flex-shrink-0">
                  <Stethoscope size={15} className="text-forest-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{c.motivo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <time dateTime={c.fecha}>{formatearFecha(c.fecha)}</time> · {c.veterinario_nombre}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                <div>
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Diagnóstico</dt>
                  <dd className="text-sm text-gray-700 whitespace-pre-line">{c.diagnostico}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tratamiento</dt>
                  <dd className="text-sm text-gray-700 whitespace-pre-line">{c.tratamiento}</dd>
                </div>
                {c.observaciones && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observaciones</dt>
                    <dd className="text-sm text-gray-600 whitespace-pre-line">{c.observaciones}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
