import { Link } from 'react-router-dom'
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardList, Flag } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import FotoPerro from '@/shared/components/FotoPerro'
import MensajeError from '@/shared/components/MensajeError'
import { ENLACE_ACCION, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'
import { DIAS_SIN_SEGUIMIENTO, TIPOS_SEGUIMIENTO } from '../utils/seguimientos'

const COLUMNAS = ['Perro', 'Adoptante', 'Entrega', 'Último seguimiento', 'Sin seguimiento']

const rutaSeguimientos = (adopcionId: number) => `/adopciones/${adopcionId}#seguimientos`

// HU-10 (sprint 2) · Seguimiento después de la adopción: seguimientos marcados con problemas
// y adopciones finalizadas sin seguimiento en los últimos 30 días.
export default function SeguimientosPage() {
  const problemas = useCarga(() => adopcionApi.listarSeguimientosConProblemas())
  const pendientes = useCarga(() => adopcionApi.listarSinSeguimiento(DIAS_SIN_SEGUIMIENTO))

  const resumen =
    problemas.datos && pendientes.datos
      ? `${problemas.datos.total} con problemas · ${pendientes.datos.total} sin seguimiento en ${DIAS_SIN_SEGUIMIENTO} días`
      : 'Visitas y llamadas después de cada adopción'

  return (
    <>
      <EncabezadoPagina titulo="Seguimientos" subtitulo={resumen} />
      <Contenido>
        <div className="space-y-8 max-w-6xl">
          <section aria-labelledby="titulo-problemas">
            <h2 id="titulo-problemas" className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Flag size={15} className="text-red-600" /> Con problemas por revisar
            </h2>
            {problemas.error && <MensajeError mensaje={problemas.error} onReintentar={problemas.recargar} />}
            {problemas.cargando && !problemas.datos && <Cargando />}
            {problemas.datos && problemas.datos.total === 0 && (
              <div className={TARJETA}>
                <EstadoVacio icono={CheckCircle2} titulo="Nada por revisar" descripcion="Ningún seguimiento está marcado con problemas." />
              </div>
            )}
            {problemas.datos && problemas.datos.total > 0 && (
              <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {problemas.datos.seguimientos.map((s) => {
                  const { nombre, icono: Icono } = TIPOS_SEGUIMIENTO[s.tipo]
                  return (
                    <li key={s.id} className={`${TARJETA} border-red-200 p-4 flex flex-col`}>
                      <div className="flex items-center gap-3 mb-3">
                        <FotoPerro url={s.perro_foto_url} nombre={s.perro_nombre} className="size-10 rounded-full flex-shrink-0" tamanoIcono={16} />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm truncate">{s.perro_nombre}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {s.adoptante_nombre} ·{' '}
                            <a href={`tel:${s.adoptante_telefono}`} className="hover:underline">
                              {s.adoptante_telefono}
                            </a>
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                          <Icono size={13} /> {nombre} · {formatearFecha(s.fecha)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-3 flex-1">{s.observaciones}</p>
                      <div className="mt-3 pt-3 border-t border-warm-100 flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-400">Registrado por {s.registrado_por_nombre}</span>
                        <Link to={rutaSeguimientos(s.solicitud_id)} className={ENLACE_ACCION}>
                          Revisar <ChevronRight size={13} />
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="titulo-pendientes">
            <h2 id="titulo-pendientes" className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CalendarClock size={15} className="text-amber-600" /> Sin seguimiento en los últimos {DIAS_SIN_SEGUIMIENTO} días
            </h2>
            {pendientes.error && <MensajeError mensaje={pendientes.error} onReintentar={pendientes.recargar} />}
            {pendientes.cargando && !pendientes.datos && <Cargando />}
            {pendientes.datos && pendientes.datos.total === 0 && (
              <div className={TARJETA}>
                <EstadoVacio
                  icono={ClipboardList}
                  titulo="Todas las adopciones están al día"
                  descripcion={`Cada adopción finalizada tuvo un seguimiento en los últimos ${DIAS_SIN_SEGUIMIENTO} días.`}
                />
              </div>
            )}
            {pendientes.datos && pendientes.datos.total > 0 && (
              <div className={`${TARJETA} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
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
                      {pendientes.datos.adopciones.map((a) => (
                        <tr key={a.solicitud_id}>
                          <td className="px-5 py-4">
                            <Link to={`/perros/${a.perro_id}`} className="flex items-center gap-3 group">
                              <FotoPerro url={a.perro_foto_url} nombre={a.perro_nombre} className="size-9 rounded-full flex-shrink-0" tamanoIcono={15} />
                              <span className="font-bold text-gray-900 text-sm group-hover:text-forest-700">{a.perro_nombre}</span>
                            </Link>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-gray-900">{a.adoptante_nombre}</p>
                            <a href={`tel:${a.adoptante_telefono}`} className="text-xs text-gray-500 hover:underline">
                              {a.adoptante_telefono}
                            </a>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">{formatearFecha(a.fecha_adopcion)}</td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {a.ultimo_seguimiento ? formatearFecha(a.ultimo_seguimiento) : <span className="text-gray-400">Ninguno</span>}
                            {a.seguimientos_con_problemas > 0 && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-red-700">
                                <Flag size={11} /> {a.seguimientos_con_problemas}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                              <CalendarClock size={12} /> {a.dias_sin_seguimiento} días
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link to={rutaSeguimientos(a.solicitud_id)} className={ENLACE_ACCION}>
                              Registrar <ChevronRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </Contenido>
    </>
  )
}
