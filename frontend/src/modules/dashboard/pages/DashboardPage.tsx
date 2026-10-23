import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ClipboardList, Heart, PawPrint, Plus } from 'lucide-react'
import { dashboardApi } from '@/api/dashboard.api'
import { useSesion } from '@/shared/sesion/SesionContext'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, COLOR_ESTADO_PERRO } from '@/shared/utils/estilos'
import DistribucionEstados from '../components/DistribucionEstados'
import GraficoAdopciones from '../components/GraficoAdopciones'
import TablaTratamiento from '../components/TablaTratamiento'
import TarjetaIndicador from '../components/TarjetaIndicador'

// HU-13 · Indicadores del albergue  ·  HU-14 · Perros en tratamiento
// Solo para el rol administrador (App.tsx y el servicio de Dashboard lo validan).
export default function DashboardPage() {
  const { usuario } = useSesion()
  const { datos, error, cargando, recargar } = useCarga(() =>
    Promise.all([dashboardApi.obtenerResumen(), dashboardApi.obtenerPerrosEnTratamiento(), dashboardApi.obtenerAdopcionesPorMes()]),
  )
  const [resumen, tratamiento, adopcionesPorMes] = datos ?? []
  const nombre = usuario?.nombre_completo.split(' ')[0]
  const nombreMesActual = new Date().toLocaleDateString('es', { month: 'long' })

  return (
    <>
      <EncabezadoPagina
        titulo="Dashboard"
        subtitulo={nombre ? `Hola, ${nombre}. Este es el resumen del albergue.` : 'Resumen general del albergue'}
        acciones={
          <Link to="/perros/nuevo" className={BOTON_PRIMARIO}>
            <Plus size={15} /> Registrar perro
          </Link>
        }
      />
      <Contenido className="space-y-7">
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos && <Cargando />}
        {resumen && tratamiento && adopcionesPorMes && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <TarjetaIndicador
                etiqueta="Perros en el albergue"
                valor={resumen.indicadores.en_albergue}
                icono={PawPrint}
                claseTarjeta="bg-white border-gray-200"
                claseIcono="text-gray-400"
                a="/perros"
              />
              <TarjetaIndicador
                etiqueta="Disponibles"
                valor={resumen.indicadores.disponibles}
                icono={CheckCircle}
                claseTarjeta={COLOR_ESTADO_PERRO.disponible.tarjeta}
                claseIcono={COLOR_ESTADO_PERRO.disponible.icono}
                a="/perros?estado=disponible"
              />
              <TarjetaIndicador
                etiqueta="En tratamiento"
                valor={resumen.indicadores.en_tratamiento}
                icono={AlertTriangle}
                claseTarjeta={COLOR_ESTADO_PERRO.en_tratamiento.tarjeta}
                claseIcono={COLOR_ESTADO_PERRO.en_tratamiento.icono}
                a="/perros?estado=en_tratamiento"
              />
              <TarjetaIndicador
                etiqueta={`Adopciones de ${nombreMesActual}`}
                valor={resumen.indicadores.adopciones_mes}
                icono={Heart}
                claseTarjeta="bg-forest-50 border-forest-200"
                claseIcono="text-forest-600"
                a="/adopciones?estado=finalizada"
              />
              <TarjetaIndicador
                etiqueta="Solicitudes pendientes"
                valor={resumen.indicadores.solicitudes_pendientes}
                icono={ClipboardList}
                claseTarjeta={COLOR_ESTADO_PERRO.en_adopcion.tarjeta}
                claseIcono={COLOR_ESTADO_PERRO.en_adopcion.icono}
                a="/adopciones"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <GraficoAdopciones datos={adopcionesPorMes} />
              </div>
              <DistribucionEstados resumen={resumen} />
            </div>

            <TablaTratamiento datos={tratamiento} />
          </>
        )}
      </Contenido>
    </>
  )
}
