import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Globe, LoaderCircle, Mail, Phone, X } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import type { EstadoSolicitudPublica, SolicitudPublica } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import FotoPerro from '@/shared/components/FotoPerro'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'

const FILTROS: { codigo: EstadoSolicitudPublica | ''; nombre: string }[] = [
  { codigo: 'pendiente', nombre: 'Pendientes' },
  { codigo: 'convertida', nombre: 'Convertidas en adopción' },
  { codigo: 'descartada', nombre: 'Descartadas' },
  { codigo: '', nombre: 'Todas' },
]

const ESTILO: Record<EstadoSolicitudPublica, string> = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  convertida: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  descartada: 'bg-gray-100 text-gray-600 border-gray-200',
}
const NOMBRE: Record<EstadoSolicitudPublica, string> = { pendiente: 'Pendiente', convertida: 'Convertida', descartada: 'Descartada' }

// HU-09 · Solicitudes enviadas desde el catálogo público. El responsable de adopciones
// contacta a la persona y la convierte en una adopción o la descarta.
export default function SolicitudesWebPage() {
  const [parametros, setParametros] = useSearchParams()
  const valor = parametros.get('estado')
  const filtro = (valor === null ? 'pendiente' : valor) as EstadoSolicitudPublica | ''
  const { datos, error, cargando, recargar } = useCarga(() => adopcionApi.listarSolicitudesPublicas(filtro), [filtro])

  return (
    <>
      <EncabezadoPagina
        titulo="Solicitudes web"
        subtitulo="Personas que pidieron adoptar desde el catálogo público"
      />
      <Contenido>
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2 mb-5">
          {FILTROS.map((f) => {
            const activo = filtro === f.codigo
            return (
              <button
                key={f.codigo || 'todas'}
                type="button"
                aria-pressed={activo}
                onClick={() => setParametros(f.codigo === 'pendiente' ? {} : { estado: f.codigo || 'todas' }, { replace: true })}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  activo ? 'bg-forest-600 border-forest-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.nombre}
              </button>
            )
          })}
        </div>

        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos && <Cargando />}
        {datos && datos.total === 0 && (
          <div className={TARJETA}>
            <EstadoVacio
              icono={Globe}
              titulo={filtro === 'pendiente' ? 'No hay solicitudes pendientes' : 'No hay solicitudes con este estado'}
              descripcion="Las solicitudes llegan desde el catálogo público de perros en adopción."
            />
          </div>
        )}
        {datos && datos.total > 0 && (
          <ul className="space-y-3">
            {datos.solicitudes.map((s) => (
              <TarjetaSolicitud key={s.id} solicitud={s} onCambio={recargar} />
            ))}
          </ul>
        )}
      </Contenido>
    </>
  )
}

function TarjetaSolicitud({ solicitud: s, onCambio }: { solicitud: SolicitudPublica; onCambio: () => void }) {
  const [descartando, setDescartando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const perroDisponible = s.perro_estado === 'disponible'

  async function descartar() {
    if (!window.confirm(`¿Descartar la solicitud de ${s.nombre_completo} para ${s.perro_nombre}?`)) return
    setDescartando(true)
    setError(null)
    try {
      await adopcionApi.descartarSolicitudPublica(s.id)
      onCambio()
    } catch (err) {
      setError((err as Error).message)
      setDescartando(false)
    }
  }

  return (
    <li className={`${TARJETA} p-5`}>
      <div className="flex flex-wrap items-start gap-4">
        <Link to={`/perros/${s.perro_id}`} className="flex items-center gap-3 min-w-40">
          <FotoPerro url={s.perro_foto_url} nombre={s.perro_nombre} className="size-11 rounded-full flex-shrink-0" tamanoIcono={16} />
          <div>
            <p className="font-bold text-gray-900 text-sm">{s.perro_nombre}</p>
            {!perroDisponible && s.estado === 'pendiente' && <p className="text-xs text-red-600">Ya no está disponible</p>}
          </div>
        </Link>
        <div className="flex-1 min-w-56">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-gray-900">{s.nombre_completo}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ESTILO[s.estado]}`}>{NOMBRE[s.estado]}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <a href={`tel:${s.telefono}`} className="inline-flex items-center gap-1 hover:text-forest-700">
              <Phone size={13} /> {s.telefono}
            </a>
            {s.correo && (
              <a href={`mailto:${s.correo}`} className="inline-flex items-center gap-1 hover:text-forest-700">
                <Mail size={13} /> {s.correo}
              </a>
            )}
          </p>
          {s.mensaje && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line bg-warm-50 rounded-lg p-3">{s.mensaje}</p>}
          <p className="text-xs text-gray-400 mt-2">
            Recibida el {formatearFecha(s.creado_en)}
            {s.revisado_por_nombre && ` · Revisada por ${s.revisado_por_nombre} el ${formatearFecha(s.revisado_en)}`}
          </p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {s.estado === 'pendiente' && (
            <>
              <button type="button" onClick={descartar} disabled={descartando} className={BOTON_SECUNDARIO}>
                {descartando ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} />} Descartar
              </button>
              {perroDisponible && (
                <Link to={`/adopciones/nueva?solicitud_web=${s.id}`} className={BOTON_PRIMARIO}>
                  Iniciar adopción
                </Link>
              )}
            </>
          )}
          {s.estado === 'convertida' && s.solicitud_id && (
            <Link to={`/adopciones/${s.solicitud_id}`} className={BOTON_SECUNDARIO}>
              Ver adopción
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}
