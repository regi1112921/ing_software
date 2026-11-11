import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, Flag, LoaderCircle, Plus } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import type { Adopcion, Seguimiento } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_SECUNDARIO, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'
import { DIAS_SIN_SEGUIMIENTO, TIPOS_SEGUIMIENTO, diasDesde } from '../utils/seguimientos'
import FormularioSeguimiento from './FormularioSeguimiento'

interface Props {
  adopcion: Adopcion
  onCambio?: (aviso: string) => void
}

// HU-10 · Seguimientos de una adopción: visitas o llamadas después de la entrega.
// Solo se registran en adopciones finalizadas (el backend aplica la misma regla).
export default function SeguimientosAdopcion({ adopcion, onCambio }: Props) {
  const finalizada = adopcion.estado === 'finalizada'
  const { datos, error, cargando, recargar } = useCarga(
    () => (finalizada ? adopcionApi.listarSeguimientos(adopcion.id) : Promise.resolve({ total: 0, seguimientos: [] })),
    [adopcion.id, finalizada],
  )
  const [formAbierto, setFormAbierto] = useState(false)
  const [cambiando, setCambiando] = useState<number | null>(null)
  const [errorMarca, setErrorMarca] = useState<string | null>(null)
  const { hash } = useLocation()
  const listo = !!datos

  // Desde la página de Seguimientos se llega con #seguimientos: baja hasta la sección.
  useEffect(() => {
    if (listo && hash === '#seguimientos') document.getElementById('seguimientos')?.scrollIntoView({ behavior: 'smooth' })
  }, [listo, hash])

  if (adopcion.estado === 'rechazada') return null

  if (!finalizada) {
    return (
      <section className={`${TARJETA} p-5 sm:p-6`} aria-labelledby="titulo-seguimientos">
        <h2 id="titulo-seguimientos" className="font-bold text-gray-800 mb-1 flex items-center gap-2">
          <ClipboardList size={15} className="text-forest-500" /> Seguimientos
        </h2>
        <p className="text-sm text-gray-500">Las visitas y llamadas de seguimiento se registran cuando el perro ya fue entregado (adopción finalizada).</p>
      </section>
    )
  }

  const seguimientos = datos?.seguimientos ?? []
  const referencia = seguimientos[0]?.fecha ?? adopcion.fecha_adopcion
  const diasSin = referencia ? diasDesde(referencia) : 0

  async function marcar(seguimiento: Seguimiento) {
    setCambiando(seguimiento.id)
    setErrorMarca(null)
    try {
      await adopcionApi.marcarProblemasSeguimiento(adopcion.id, seguimiento.id, !seguimiento.con_problemas)
      recargar()
      onCambio?.(seguimiento.con_problemas ? 'Seguimiento marcado como revisado.' : 'Seguimiento marcado con problemas para revisarlo.')
    } catch (err) {
      setErrorMarca((err as Error).message)
    } finally {
      setCambiando(null)
    }
  }

  return (
    <section id="seguimientos" className={`${TARJETA} p-5 sm:p-6 scroll-mt-4`} aria-labelledby="titulo-seguimientos">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="titulo-seguimientos" className="font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList size={15} className="text-forest-500" /> Seguimientos
          {datos && <span className="text-sm font-semibold text-gray-400">({datos.total})</span>}
        </h2>
        {!formAbierto && (
          <button type="button" onClick={() => setFormAbierto(true)} className={BOTON_SECUNDARIO}>
            <Plus size={15} /> Registrar seguimiento
          </button>
        )}
      </div>

      {datos && diasSin > DIAS_SIN_SEGUIMIENTO && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          {seguimientos.length === 0
            ? `Sin seguimientos desde la entrega, hace ${diasSin} días.`
            : `Sin seguimiento en los últimos ${DIAS_SIN_SEGUIMIENTO} días (el último fue hace ${diasSin} días).`}
        </p>
      )}

      {formAbierto && (
        <FormularioSeguimiento
          adopcion={adopcion}
          onCancelar={() => setFormAbierto(false)}
          onGuardado={(nuevo) => {
            setFormAbierto(false)
            recargar()
            onCambio?.(nuevo.con_problemas ? 'Seguimiento registrado y marcado con problemas.' : 'Seguimiento registrado.')
          }}
        />
      )}

      {error && <MensajeError mensaje={error} onReintentar={recargar} />}
      {errorMarca && (
        <div className="mb-3">
          <MensajeError mensaje={errorMarca} />
        </div>
      )}
      {cargando && !datos && <Cargando />}
      {datos && seguimientos.length === 0 && !formAbierto && (
        <p className="text-sm text-gray-500">Todavía no hay seguimientos. Registra la primera visita o llamada al adoptante.</p>
      )}

      {seguimientos.length > 0 && (
        <ol className="divide-y divide-warm-100">
          {seguimientos.map((s) => {
            const { nombre, icono: Icono } = TIPOS_SEGUIMIENTO[s.tipo]
            return (
              <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-800">
                    <Icono size={14} className="text-forest-500" /> {nombre}
                  </span>
                  <span className="text-sm text-gray-500">{formatearFecha(s.fecha)}</span>
                  {s.con_problemas && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold bg-red-100 text-red-700 border-red-200">
                      <Flag size={11} /> Con problemas
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => marcar(s)}
                    disabled={cambiando === s.id}
                    className={`ml-auto inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap disabled:opacity-60 ${
                      s.con_problemas ? 'text-forest-600 hover:text-forest-700' : 'text-gray-400 hover:text-red-700'
                    }`}
                  >
                    {cambiando === s.id ? (
                      <LoaderCircle size={13} className="animate-spin" />
                    ) : s.con_problemas ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Flag size={13} />
                    )}
                    {s.con_problemas ? 'Marcar como revisado' : 'Marcar con problemas'}
                  </button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line">{s.observaciones}</p>
                <p className="text-xs text-gray-400 mt-1">Registrado por {s.registrado_por_nombre}</p>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
