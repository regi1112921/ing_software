import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, CheckCircle, Heart, PawPrint, Plus } from 'lucide-react'
import { dashboardApi } from '@/api/dashboard.api'
import type { EstadoPerro } from '@/api/tipos'
import { useSesion } from '@/shared/sesion/SesionContext'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, COLOR_ESTADO_PERRO } from '@/shared/utils/estilos'
import DistribucionEstados from '../components/DistribucionEstados'
import TablaTratamiento from '../components/TablaTratamiento'
import TarjetaIndicador from '../components/TarjetaIndicador'

const ICONO_ESTADO: Record<EstadoPerro, typeof PawPrint> = {
  disponible: CheckCircle,
  en_tratamiento: AlertTriangle,
  en_adopcion: Heart,
  adoptado: Activity,
}

// HU-13 · Indicadores del albergue  ·  HU-14 · Perros en tratamiento
export default function DashboardPage() {
  const { usuario } = useSesion()
  const { datos, error, cargando, recargar } = useCarga(() =>
    Promise.all([dashboardApi.obtenerResumen(), dashboardApi.obtenerPerrosEnTratamiento()]),
  )
  const [resumen, tratamiento] = datos ?? []
  const nombre = usuario?.nombre_completo.split(' ')[0]

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
        {resumen && tratamiento && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <TarjetaIndicador
                etiqueta="Total de perros"
                valor={resumen.total}
                icono={PawPrint}
                claseTarjeta="bg-white border-gray-200"
                claseIcono="text-gray-400"
                a="/perros"
              />
              {resumen.por_estado.map((estado) => (
                <TarjetaIndicador
                  key={estado.codigo}
                  etiqueta={estado.nombre}
                  valor={estado.cantidad}
                  icono={ICONO_ESTADO[estado.codigo] ?? PawPrint}
                  claseTarjeta={COLOR_ESTADO_PERRO[estado.codigo]?.tarjeta ?? 'bg-white border-gray-200'}
                  claseIcono={COLOR_ESTADO_PERRO[estado.codigo]?.icono ?? 'text-gray-400'}
                  a={`/perros?estado=${estado.codigo}`}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <TablaTratamiento datos={tratamiento} />
              </div>
              <DistribucionEstados resumen={resumen} />
            </div>
          </>
        )}
      </Contenido>
    </>
  )
}
