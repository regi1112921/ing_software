import { Link } from 'react-router-dom'
import { Bug, Plus, Stethoscope, Syringe } from 'lucide-react'
import type { Historial } from '@/api/tipos'
import { veterinariaApi } from '@/api/veterinaria.api'
import { useCarga } from '@/shared/hooks/useCarga'
import { usePermiso } from '@/shared/sesion/permisos'
import Cargando from '@/shared/components/Cargando'
import EstadoVacio from '@/shared/components/EstadoVacio'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'

// HU-08 · Historial médico del perro (de la atención más reciente a la más antigua)
export default function HistorialMedico({ perroId }: { perroId: number }) {
  const { datos, error, recargar } = useCarga(() => veterinariaApi.obtenerHistorial(perroId), [perroId])
  const rutaNueva = `/perros/${perroId}/atenciones/nueva`
  // HU-07: solo administración y veterinaria registran atenciones; el resto solo consulta.
  const puedeRegistrar = usePermiso('registrarAtencion')
  const puedeRegistrarControl = usePermiso('controles')

  if (error) return <MensajeError mensaje={error} onReintentar={recargar} />
  if (!datos) return <Cargando />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">
          {datos.total} {datos.total === 1 ? 'atención registrada' : 'atenciones registradas'}
        </p>
        {datos.total > 0 && puedeRegistrar && (
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
            descripcion={
              puedeRegistrar
                ? 'Registra la primera atención médica del perro.'
                : 'Todavía no hay atenciones médicas registradas para este perro.'
            }
            accion={
              puedeRegistrar ? (
                <Link to={rutaNueva} className={BOTON_PRIMARIO}>
                  <Plus size={14} /> Registrar atención
                </Link>
              ) : undefined
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

      <ControlesPreventivos datos={datos} rutaNueva={puedeRegistrarControl ? `/perros/${perroId}/controles/nuevo` : null} />
    </div>
  )
}

// HU-08 · Vacunas y desparasitaciones del perro, de la más reciente a la más antigua.
function ControlesPreventivos({ datos, rutaNueva }: { datos: Historial; rutaNueva: string | null }) {
  const registros = [
    ...datos.vacunas.map((v) => ({
      clave: `v-${v.id}`,
      icono: Syringe,
      titulo: `Vacuna · ${v.nombre}`,
      fecha: v.fecha_aplicacion,
      proxima: v.fecha_proxima_dosis,
      etiquetaProxima: 'Próxima dosis',
      veterinario: v.veterinario_nombre,
      observaciones: v.observaciones,
    })),
    ...datos.desparasitaciones.map((d) => ({
      clave: `d-${d.id}`,
      icono: Bug,
      titulo: `Desparasitación ${d.tipo} · ${d.producto}`,
      fecha: d.fecha_aplicacion,
      proxima: d.fecha_proxima,
      etiquetaProxima: 'Próximo control',
      veterinario: d.veterinario_nombre,
      observaciones: d.observaciones,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <section aria-labelledby="titulo-controles" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 id="titulo-controles" className="font-bold text-gray-800">
          Vacunas y desparasitaciones <span className="text-sm font-normal text-gray-400">({registros.length})</span>
        </h3>
        {rutaNueva && (
          <Link to={rutaNueva} className={BOTON_SECUNDARIO}>
            <Plus size={14} /> Registrar vacuna o desparasitación
          </Link>
        )}
      </div>
      {registros.length === 0 ? (
        <p className={`${TARJETA} p-5 text-sm text-gray-500`}>Todavía no hay vacunas ni desparasitaciones registradas.</p>
      ) : (
        <ul className={`${TARJETA} divide-y divide-warm-100`}>
          {registros.map((r) => (
            <li key={r.clave} className="flex items-start gap-3 p-4">
              <div className="size-8 rounded-full bg-warm-50 border border-warm-200 flex items-center justify-center flex-shrink-0">
                <r.icono size={14} className="text-forest-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{r.titulo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <time dateTime={r.fecha}>{formatearFecha(r.fecha)}</time> · {r.veterinario}
                  {r.proxima && (
                    <>
                      {' '}· {r.etiquetaProxima}: <time dateTime={r.proxima}>{formatearFecha(r.proxima)}</time>
                    </>
                  )}
                </p>
                {r.observaciones && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{r.observaciones}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
