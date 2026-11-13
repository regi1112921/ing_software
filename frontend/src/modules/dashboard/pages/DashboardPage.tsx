import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ClipboardList, Heart, LogIn, PawPrint, Plus, Stethoscope } from 'lucide-react'
import { dashboardApi } from '@/api/dashboard.api'
import type { Periodo } from '@/api/tipos'
import { useSesion } from '@/shared/sesion/SesionContext'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, COLOR_ESTADO_PERRO } from '@/shared/utils/estilos'
import DistribucionEstados from '../components/DistribucionEstados'
import FiltroFechas from '../components/FiltroFechas'
import GraficoEvolucion from '../components/GraficoEvolucion'
import TablaTratamiento from '../components/TablaTratamiento'
import TarjetaIndicador from '../components/TarjetaIndicador'
import { describirPeriodo, rangoDeAtajo } from '../utils/periodos'

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/

// HU-13 · Indicadores del albergue  ·  HU-14 · Perros en tratamiento  ·  HU-12 · Filtro de fechas
// Solo para el rol administrador (App.tsx y el servicio de Dashboard lo validan).
export default function DashboardPage() {
  const { usuario } = useSesion()
  const [parametros, setParametros] = useSearchParams()

  // El periodo vive en la URL (?desde=&hasta=) para poder compartirlo; por defecto, el mes actual.
  const desdeParam = parametros.get('desde') ?? ''
  const hastaParam = parametros.get('hasta') ?? ''
  const periodo: Periodo =
    FECHA_VALIDA.test(desdeParam) && FECHA_VALIDA.test(hastaParam) && desdeParam <= hastaParam
      ? { desde: desdeParam, hasta: hastaParam }
      : rangoDeAtajo('mes')

  const { datos, error, cargando, recargar } = useCarga(
    () =>
      Promise.all([
        dashboardApi.obtenerResumen(periodo),
        dashboardApi.obtenerPerrosEnTratamiento(),
        dashboardApi.obtenerEvolucion(periodo),
      ]),
    [periodo.desde, periodo.hasta],
  )
  const [resumen, tratamiento, evolucion] = datos ?? []
  const nombre = usuario?.nombre_completo.split(' ')[0]

  function cambiarPeriodo(nuevo: Periodo) {
    const mesActual = rangoDeAtajo('mes')
    const esPorDefecto = nuevo.desde === mesActual.desde && nuevo.hasta === mesActual.hasta
    setParametros(esPorDefecto ? {} : { desde: nuevo.desde, hasta: nuevo.hasta }, { replace: true })
  }

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
        <FiltroFechas periodo={periodo} onCambiar={cambiarPeriodo} />

        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos && <Cargando />}
        {resumen && tratamiento && evolucion && (
          <div className={`space-y-7 transition-opacity ${cargando ? 'opacity-60' : ''}`} aria-busy={cargando}>
            <section aria-labelledby="titulo-periodo">
              <h2 id="titulo-periodo" className="font-bold text-gray-800 mb-3">
                En el periodo <span className="font-semibold text-gray-500">· {describirPeriodo(resumen.periodo)}</span>
              </h2>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <TarjetaIndicador
                  etiqueta="Ingresos"
                  valor={resumen.periodo.ingresos}
                  icono={LogIn}
                  claseTarjeta="bg-amber-50 border-amber-200"
                  claseIcono="text-amber-600"
                  a="/perros"
                />
                <TarjetaIndicador
                  etiqueta="Adopciones"
                  valor={resumen.periodo.adopciones}
                  icono={Heart}
                  claseTarjeta="bg-forest-50 border-forest-200"
                  claseIcono="text-forest-600"
                  a="/adopciones?estado=finalizada"
                />
                <TarjetaIndicador
                  etiqueta="Solicitudes recibidas"
                  valor={resumen.periodo.solicitudes}
                  icono={ClipboardList}
                  claseTarjeta={COLOR_ESTADO_PERRO.en_adopcion.tarjeta}
                  claseIcono={COLOR_ESTADO_PERRO.en_adopcion.icono}
                  a="/adopciones"
                />
                <TarjetaIndicador
                  etiqueta="Atenciones médicas"
                  valor={resumen.periodo.atenciones}
                  icono={Stethoscope}
                  claseTarjeta="bg-white border-gray-200"
                  claseIcono="text-gray-400"
                  a="/perros"
                />
              </div>
            </section>

            <GraficoEvolucion datos={evolucion} />

            <section aria-labelledby="titulo-estado-actual" className="space-y-4">
              <div>
                <h2 id="titulo-estado-actual" className="font-bold text-gray-800">
                  Estado actual del albergue
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Cómo está hoy, sin importar el periodo elegido.</p>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
                  etiqueta="Solicitudes pendientes"
                  valor={resumen.indicadores.solicitudes_pendientes}
                  icono={ClipboardList}
                  claseTarjeta={COLOR_ESTADO_PERRO.en_adopcion.tarjeta}
                  claseIcono={COLOR_ESTADO_PERRO.en_adopcion.icono}
                  a="/adopciones"
                />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <DistribucionEstados resumen={resumen} />
                <div className="xl:col-span-2">
                  <TablaTratamiento datos={tratamiento} />
                </div>
              </div>
            </section>
          </div>
        )}
      </Contenido>
    </>
  )
}
