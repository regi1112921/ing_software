import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Heart, Plus } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import type { EstadoAdopcion } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import FotoPerro from '@/shared/components/FotoPerro'
import InsigniaEstado from '@/shared/components/InsigniaEstado'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, ENLACE_ACCION, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'

const FILTROS: { codigo: EstadoAdopcion | ''; nombre: string }[] = [
  { codigo: '', nombre: 'Todas' },
  { codigo: 'en_proceso', nombre: 'En proceso' },
  { codigo: 'aprobada', nombre: 'Aprobadas' },
  { codigo: 'finalizada', nombre: 'Finalizadas' },
  { codigo: 'rechazada', nombre: 'Rechazadas' },
]

const COLUMNAS = ['Perro', 'Adoptante', 'Teléfono', 'Solicitud', 'Estado']

// HU-11 · Consultar adopciones (de la más reciente a la más antigua)
export default function AdopcionesPage() {
  const navegar = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const filtro = (parametros.get('estado') ?? '') as EstadoAdopcion | ''
  const { datos, error, cargando, recargar } = useCarga(() => adopcionApi.listarAdopciones())

  const adopciones = datos?.adopciones ?? []
  const visibles = filtro ? adopciones.filter((a) => a.estado === filtro) : adopciones
  const contar = (codigo: EstadoAdopcion | '') => (codigo ? adopciones.filter((a) => a.estado === codigo).length : adopciones.length)

  return (
    <>
      <EncabezadoPagina
        titulo="Adopciones"
        subtitulo={datos ? `${datos.total} ${datos.total === 1 ? 'proceso registrado' : 'procesos registrados'}` : 'Procesos de adopción'}
        acciones={
          <Link to="/adopciones/nueva" className={BOTON_PRIMARIO}>
            <Plus size={15} /> Registrar adopción
          </Link>
        }
      />
      <Contenido>
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos && <Cargando />}
        {datos && datos.total === 0 && (
          <div className={TARJETA}>
            <EstadoVacio
              icono={Heart}
              titulo="No hay adopciones registradas"
              descripcion="Registra el primer proceso de adopción."
              accion={
                <Link to="/adopciones/nueva" className={BOTON_PRIMARIO}>
                  <Plus size={15} /> Registrar adopción
                </Link>
              }
            />
          </div>
        )}
        {datos && datos.total > 0 && (
          <>
            <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2 mb-5">
              {FILTROS.map((f) => {
                const activo = filtro === f.codigo
                return (
                  <button
                    key={f.codigo || 'todas'}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setParametros(f.codigo ? { estado: f.codigo } : {}, { replace: true })}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                      activo ? 'bg-forest-600 border-forest-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {f.nombre} <span className={activo ? 'text-forest-100' : 'text-gray-400'}>{contar(f.codigo)}</span>
                  </button>
                )
              })}
            </div>

            <div className={`${TARJETA} overflow-hidden`}>
              {visibles.length === 0 ? (
                <EstadoVacio icono={Heart} titulo="No hay adopciones con este estado" />
              ) : (
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
                      {visibles.map((a) => (
                        <tr
                          key={a.id}
                          onClick={() => navegar(`/adopciones/${a.id}`)}
                          className="hover:bg-warm-50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <FotoPerro url={a.perro.foto_url} nombre={a.perro.nombre} className="size-9 rounded-full flex-shrink-0" tamanoIcono={15} />
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{a.perro.nombre}</p>
                                <p className="text-xs text-gray-400">{a.perro.raza}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-900">{a.adoptante.nombre_completo}</td>
                          <td className="px-5 py-4 text-sm text-gray-500">{a.adoptante.telefono}</td>
                          <td className="px-5 py-4 text-sm text-gray-500">{formatearFecha(a.fecha_solicitud)}</td>
                          <td className="px-5 py-4">
                            <InsigniaEstado tipo="adopcion" estado={a.estado} nombre={a.estado_nombre} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link to={`/adopciones/${a.id}`} onClick={(e) => e.stopPropagation()} className={ENLACE_ACCION}>
                              Ver detalle <ChevronRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </Contenido>
    </>
  )
}
