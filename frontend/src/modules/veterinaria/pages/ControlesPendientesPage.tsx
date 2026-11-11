import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Syringe } from 'lucide-react'
import { veterinariaApi } from '@/api/veterinaria.api'
import type { ControlPendiente } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import FotoPerro from '@/shared/components/FotoPerro'
import MensajeError from '@/shared/components/MensajeError'
import { ENLACE_ACCION, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'

const RANGOS = [7, 30, 60, 90]
const RANGO_POR_DEFECTO = 30

const COLUMNAS = ['Perro', 'Control', 'Fecha programada', 'Estado']

function textoPlazo(c: ControlPendiente): string {
  if (c.vencido) return `Vencido hace ${-c.dias_restantes} ${c.dias_restantes === -1 ? 'día' : 'días'}`
  if (c.dias_restantes === 0) return 'Vence hoy'
  return `En ${c.dias_restantes} ${c.dias_restantes === 1 ? 'día' : 'días'}`
}

// Enlace al formulario con el control ya elegido; al guardar vuelve a esta lista.
function rutaRegistrar(c: ControlPendiente): string {
  const parametros = new URLSearchParams({ desde: 'controles' })
  if (c.tipo === 'vacuna') {
    parametros.set('tipo', 'vacuna')
    parametros.set('nombre', c.detalle)
  } else {
    parametros.set('tipo', 'desparasitacion')
    parametros.set('subtipo', /externa/i.test(c.detalle) ? 'externa' : 'interna')
  }
  return `/perros/${c.perro_id}/controles/nuevo?${parametros}`
}

// HU-08 · Alertas de vacunas y controles pendientes
export default function ControlesPendientesPage() {
  const [parametros, setParametros] = useSearchParams()
  const dias = RANGOS.includes(Number(parametros.get('dias'))) ? Number(parametros.get('dias')) : RANGO_POR_DEFECTO
  const { datos, error, cargando, recargar } = useCarga(() => veterinariaApi.listarControlesPendientes(dias), [dias])

  return (
    <>
      <EncabezadoPagina
        titulo="Controles pendientes"
        subtitulo={
          datos
            ? `${datos.vencidos} ${datos.vencidos === 1 ? 'vencido' : 'vencidos'} · ${datos.total - datos.vencidos} en los próximos ${dias} días`
            : 'Vacunas y desparasitaciones programadas'
        }
      />
      <Contenido>
        <div role="group" aria-label="Rango de días" className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-sm text-gray-500 mr-1">Mostrar los que vencen en:</span>
          {RANGOS.map((rango) => {
            const activo = rango === dias
            return (
              <button
                key={rango}
                type="button"
                aria-pressed={activo}
                onClick={() => setParametros(rango === RANGO_POR_DEFECTO ? {} : { dias: String(rango) }, { replace: true })}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  activo ? 'bg-forest-600 border-forest-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {rango} días
              </button>
            )
          })}
        </div>

        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos && <Cargando />}
        {datos && datos.total === 0 && (
          <div className={TARJETA}>
            <EstadoVacio
              icono={CheckCircle2}
              titulo="No hay controles pendientes"
              descripcion={`Ninguna vacuna ni desparasitación vencida o programada para los próximos ${dias} días.`}
            />
          </div>
        )}
        {datos && datos.total > 0 && (
          <div className={`${TARJETA} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-warm-100 bg-warm-50">
                    {COLUMNAS.map((c) => (
                      <th key={c} scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {c}
                      </th>
                    ))}
                    <th scope="col" className="px-5 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {datos.controles.map((c) => (
                    <tr key={`${c.tipo}-${c.control_id}`} className={c.vencido ? 'bg-red-50/60' : undefined}>
                      <td className="px-5 py-4">
                        <Link to={`/perros/${c.perro_id}?pestana=historial`} className="flex items-center gap-3 group">
                          <FotoPerro url={c.perro_foto_url} nombre={c.perro_nombre} className="size-9 rounded-full flex-shrink-0" tamanoIcono={15} />
                          <span className="font-bold text-gray-900 text-sm group-hover:text-forest-700">{c.perro_nombre}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">{c.detalle}</p>
                        <p className="text-xs text-gray-400">
                          {c.tipo === 'vacuna' ? 'Vacuna' : 'Desparasitación'} · última: {formatearFecha(c.ultima_aplicacion)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{formatearFecha(c.fecha_programada)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${
                            c.vencido ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {c.vencido ? <AlertTriangle size={12} /> : <CalendarClock size={12} />}
                          {textoPlazo(c)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link to={rutaRegistrar(c)} className={ENLACE_ACCION}>
                          <Syringe size={13} /> Registrar <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Contenido>
    </>
  )
}
