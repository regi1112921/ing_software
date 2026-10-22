import { useState, type FormEvent } from 'react'
import { CheckCircle2, Home, LoaderCircle, XCircle } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { ErrorApi } from '@/api/http'
import type { Adopcion, CambioEstadoAdopcion as Cambio } from '@/api/tipos'
import Campo from '@/shared/components/Campo'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PELIGRO, BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_INPUT, CLASE_TEXTAREA, TARJETA } from '@/shared/utils/estilos'
import { hoy } from '@/shared/utils/formato'

type Destino = Cambio['estado']

const ACCIONES: Record<Destino, { etiqueta: string; icono: typeof CheckCircle2; descripcion: string; etiquetaFecha: string }> = {
  aprobada: {
    etiqueta: 'Aprobar',
    icono: CheckCircle2,
    descripcion: 'El adoptante fue aceptado. El perro sigue «En proceso de adopción» hasta la entrega.',
    etiquetaFecha: 'Fecha de aprobación',
  },
  finalizada: {
    etiqueta: 'Finalizar (entregado)',
    icono: Home,
    descripcion: 'El perro fue entregado al adoptante y pasará a «Adoptado». Esta acción no se puede deshacer.',
    etiquetaFecha: 'Fecha de entrega',
  },
  rechazada: {
    etiqueta: 'Rechazar',
    icono: XCircle,
    descripcion: 'La solicitud no continúa y el perro vuelve a estar «Disponible». Esta acción no se puede deshacer.',
    etiquetaFecha: 'Fecha de rechazo',
  },
}

interface Props {
  adopcion: Adopcion
  onCambiado: (adopcion: Adopcion, destino: Destino) => void
}

// HU-12 · Actualizar estado. Solo ofrece las transiciones que permite el backend;
// en Rechazada y Finalizada no se muestra nada.
export default function CambioEstadoAdopcion({ adopcion, onCambiado }: Props) {
  const permitidas = (adopcion.transiciones_permitidas ?? []).filter((t): t is Destino => t in ACCIONES)
  const [destino, setDestino] = useState<Destino | null>(null)
  const [fecha, setFecha] = useState(hoy())
  const [observaciones, setObservaciones] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (permitidas.length === 0) return null

  // La fecha no puede ser anterior a la etapa previa.
  const fechaMinima = adopcion.fecha_aprobacion ?? adopcion.fecha_solicitud

  function elegir(nuevo: Destino) {
    setDestino(nuevo)
    setFecha(hoy())
    setObservaciones('')
    setErrores({})
    setError(null)
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    if (!destino) return
    if (destino === 'rechazada' && !observaciones.trim()) {
      setErrores({ observaciones: 'Indica el motivo del rechazo.' })
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const actualizada = await adopcionApi.cambiarEstadoAdopcion(adopcion.id, {
        estado: destino,
        fecha,
        observaciones: observaciones.trim() || null,
      })
      onCambiado(actualizada, destino)
      setDestino(null)
    } catch (err) {
      setError((err as Error).message)
      if (err instanceof ErrorApi) setErrores(err.porCampo)
    } finally {
      setGuardando(false)
    }
  }

  const accion = destino ? ACCIONES[destino] : null

  return (
    <section className={`${TARJETA} p-5 sm:p-6`} aria-labelledby="titulo-cambio-estado">
      <h2 id="titulo-cambio-estado" className="font-bold text-gray-800 mb-1">
        Avanzar el proceso
      </h2>
      <p className="text-sm text-gray-500 mb-4">Elige el siguiente paso de esta adopción.</p>
      <div className="flex flex-wrap gap-2">
        {permitidas.map((t) => {
          const { etiqueta, icono: Icono } = ACCIONES[t]
          const activo = destino === t
          const base = t === 'rechazada' ? BOTON_SECUNDARIO + ' !text-red-700 hover:!bg-red-50' : BOTON_SECUNDARIO
          return (
            <button
              key={t}
              type="button"
              aria-pressed={activo}
              onClick={() => elegir(t)}
              className={`${base} ${activo ? '!border-forest-500 ring-2 ring-forest-100' : ''}`}
            >
              <Icono size={15} /> {etiqueta}
            </button>
          )
        })}
      </div>

      {destino && accion && (
        <form onSubmit={confirmar} className="mt-5 pt-5 border-t border-warm-100 space-y-4" noValidate>
          <p className="text-sm text-gray-600">{accion.descripcion}</p>
          {error && <MensajeError mensaje={error} />}
          <Campo etiqueta={accion.etiquetaFecha} obligatorio error={errores.fecha} className="sm:max-w-xs">
            <input
              type="date"
              required
              min={fechaMinima}
              max={hoy()}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={CLASE_INPUT}
            />
          </Campo>
          <Campo etiqueta={destino === 'rechazada' ? 'Motivo del rechazo' : 'Observaciones'} obligatorio={destino === 'rechazada'} error={errores.observaciones}>
            <textarea
              rows={3}
              maxLength={2000}
              value={observaciones}
              onChange={(e) => {
                setObservaciones(e.target.value)
                setErrores(({ observaciones: _, ...resto }) => resto)
              }}
              className={CLASE_TEXTAREA}
              placeholder={destino === 'rechazada' ? '¿Por qué no continúa la solicitud?' : 'Opcional. Se agrega a las observaciones del proceso.'}
            />
          </Campo>
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
            <button type="button" onClick={() => setDestino(null)} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className={destino === 'rechazada' ? BOTON_PELIGRO : BOTON_PRIMARIO}>
              {guardando && <LoaderCircle size={16} className="animate-spin" />}
              Confirmar: {accion.etiqueta.toLowerCase()}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
