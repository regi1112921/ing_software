import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, FileText, PawPrint, User } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import type { Adopcion } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import DatoInfo from '@/shared/components/DatoInfo'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import FotoAmpliable from '@/shared/components/FotoAmpliable'
import InsigniaEstado from '@/shared/components/InsigniaEstado'
import MensajeError from '@/shared/components/MensajeError'
import { TARJETA } from '@/shared/utils/estilos'
import { NOMBRE_SEXO, formatearEdad, formatearFecha } from '@/shared/utils/formato'
import CambioEstadoAdopcion from '../components/CambioEstadoAdopcion'
import LineaTiempoAdopcion from '../components/LineaTiempoAdopcion'

const AVISO_CAMBIO: Record<string, (perro: string) => string> = {
  aprobada: () => 'Adopción aprobada.',
  finalizada: (perro) => `Adopción finalizada. ${perro} ahora figura como adoptado.`,
  rechazada: (perro) => `Adopción rechazada. ${perro} volvió a estar disponible.`,
}

// HU-11 · Detalle de adopción  ·  HU-12 · Actualizar su estado
export default function AdopcionDetallePage() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const { datos: adopcion, error, recargar } = useCarga(() => adopcionApi.obtenerAdopcion(id!), [id])

  function alCambiar(actualizada: Adopcion, destino: string) {
    recargar()
    navegar(pathname, { replace: true, state: { aviso: AVISO_CAMBIO[destino]?.(actualizada.perro.nombre) } })
  }

  if (!adopcion) {
    return (
      <>
        <EncabezadoPagina titulo="Detalle de adopción" volverA="/adopciones" />
        <Contenido>{error ? <MensajeError mensaje={error} onReintentar={recargar} /> : <Cargando />}</Contenido>
      </>
    )
  }

  const { perro, adoptante } = adopcion

  return (
    <>
      <EncabezadoPagina
        titulo="Detalle de adopción"
        insignia={<InsigniaEstado tipo="adopcion" estado={adopcion.estado} nombre={adopcion.estado_nombre} />}
        subtitulo={`${perro.nombre} · ${adoptante.nombre_completo}`}
        volverA="/adopciones"
      />
      <Contenido>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 max-w-6xl">
          <div className="xl:col-span-2 space-y-5">
            {error && <MensajeError mensaje={error} onReintentar={recargar} />}
            <CambioEstadoAdopcion key={adopcion.estado} adopcion={adopcion} onCambiado={alCambiar} />

            <section className={`${TARJETA} p-5 sm:p-6`}>
              <div className="flex items-center justify-between mb-4 gap-3">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <PawPrint size={15} className="text-forest-500" /> Perro
                </h2>
                <Link to={`/perros/${perro.id}`} className="inline-flex items-center gap-1 text-forest-600 hover:text-forest-700 text-sm font-bold">
                  Ver ficha <ChevronRight size={14} />
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <FotoAmpliable url={perro.foto_url} nombre={perro.nombre} className="size-20 rounded-xl flex-shrink-0" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                  <DatoInfo etiqueta="Nombre" valor={perro.nombre} />
                  <DatoInfo etiqueta="Raza" valor={perro.raza} />
                  <DatoInfo etiqueta="Sexo" valor={NOMBRE_SEXO[perro.sexo]} />
                  <DatoInfo etiqueta="Edad" valor={formatearEdad(perro.edad_meses, perro.fecha_nacimiento_estimada)} />
                  <DatoInfo etiqueta="Tamaño" valor={perro.tamano_nombre} />
                  <DatoInfo etiqueta="Estado" valor={perro.estado_nombre} />
                </div>
              </div>
            </section>

            <section className={`${TARJETA} p-5 sm:p-6`}>
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User size={15} className="text-forest-500" /> Adoptante
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatoInfo etiqueta="Nombre completo" valor={adoptante.nombre_completo} />
                {adoptante.documento_identidad && <DatoInfo etiqueta="Documento de identidad" valor={adoptante.documento_identidad} />}
                <DatoInfo etiqueta="Teléfono" valor={<a href={`tel:${adoptante.telefono}`} className="hover:underline">{adoptante.telefono}</a>} />
                <DatoInfo etiqueta="Dirección" valor={adoptante.direccion} className="sm:col-span-2" />
              </div>
            </section>
          </div>

          <section className={`${TARJETA} p-5 sm:p-6 self-start`}>
            <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
              <FileText size={15} className="text-forest-500" /> Proceso
            </h2>
            <LineaTiempoAdopcion adopcion={adopcion} />
            {adopcion.observaciones && (
              <div className="mt-6 pt-5 border-t border-warm-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Observaciones</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{adopcion.observaciones}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-6">Registrada el {formatearFecha(adopcion.fecha_solicitud)}</p>
          </section>
        </div>
      </Contenido>
    </>
  )
}
