import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ClipboardList, Download, Heart, PawPrint, Plus } from 'lucide-react'
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
  const [tipoReporte, setTipoReporte] = useState<'perros' | 'adopciones' | 'atenciones'>('perros')
  const [formatoReporte, setFormatoReporte] = useState<'pdf' | 'excel'>('pdf')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [descargando, setDescargando] = useState(false)
  const [errorReporte, setErrorReporte] = useState<string | null>(null)
  const { datos, error, cargando, recargar } = useCarga(() =>
    Promise.all([dashboardApi.obtenerResumen(), dashboardApi.obtenerPerrosEnTratamiento(), dashboardApi.obtenerAdopcionesPorMes()]),
  )
  const [resumen, tratamiento, adopcionesPorMes] = datos ?? []
  const nombre = usuario?.nombre_completo.split(' ')[0]
  const nombreMesActual = new Date().toLocaleDateString('es', { month: 'long' })

  async function descargarReporte() {
    setDescargando(true)
    setErrorReporte(null)
    try {
      await dashboardApi.descargarReporte(tipoReporte, formatoReporte, desde || undefined, hasta || undefined)
    } catch (error) {
      setErrorReporte(error instanceof Error ? error.message : 'No se pudo generar el reporte.')
    } finally {
      setDescargando(false)
    }
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
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos && <Cargando />}
        {resumen && tratamiento && adopcionesPorMes && (
          <>
            <section className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
              <label className="text-sm font-semibold text-gray-700">Reporte
                <select value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value as typeof tipoReporte)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2">
                  <option value="perros">Perros</option>
                  <option value="adopciones">Adopciones</option>
                  <option value="atenciones">Atenciones veterinarias</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">Desde
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="text-sm font-semibold text-gray-700">Hasta
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="text-sm font-semibold text-gray-700">Formato
                <select value={formatoReporte} onChange={(e) => setFormatoReporte(e.target.value as typeof formatoReporte)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2">
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel (.csv)</option>
                </select>
              </label>
              <button type="button" onClick={descargarReporte} disabled={descargando} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-forest-600 text-white font-semibold disabled:opacity-60">
                <Download size={15} /> {descargando ? 'Generando...' : 'Descargar'}
              </button>
              {errorReporte && <p className="text-sm text-red-600">{errorReporte}</p>}
            </section>
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
