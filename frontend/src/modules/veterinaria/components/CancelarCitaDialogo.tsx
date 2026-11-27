import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { Cita } from '@/api/tipos'
import { veterinariaApi } from '@/api/veterinaria.api'
import Campo from '@/shared/components/Campo'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PELIGRO, BOTON_SECUNDARIO, CLASE_TEXTAREA } from '@/shared/utils/estilos'
import { formatearFecha } from '@/shared/utils/formato'
import { NOMBRE_TIPO_CITA } from '../utils/citas'

interface Props {
  cita: Cita
  onCerrar: () => void
  onCancelada: (cita: Cita) => void
}

// HU-11 · Cancelar una cita programada (con motivo opcional). Libera el horario.
export default function CancelarCitaDialogo({ cita, onCerrar, onCancelada }: Props) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogo.current?.showModal()
  }, [])

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      onCancelada(await veterinariaApi.cancelarCita(cita.id, motivo.trim() || null))
    } catch (err) {
      setEnviando(false)
      setError((err as Error).message)
    }
  }

  return (
    <dialog
      ref={dialogo}
      onClose={onCerrar}
      aria-labelledby="titulo-cancelar-cita"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/40"
    >
      <form onSubmit={confirmar} className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="titulo-cancelar-cita" className="text-lg font-bold text-gray-900">
              Cancelar cita
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {NOMBRE_TIPO_CITA[cita.tipo]} de {cita.perro_nombre} · {formatearFecha(cita.fecha)} a las {cita.hora}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-gray-400 hover:text-gray-700 p-1">
            <X size={18} />
          </button>
        </div>
        {error && <MensajeError mensaje={error} />}
        <Campo etiqueta="Motivo de la cancelación" ayuda="Opcional. El horario queda libre para otra cita.">
          <textarea
            rows={3}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={CLASE_TEXTAREA}
            placeholder="Ej: El perro sigue en cuarentena"
          />
        </Campo>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
          <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>
            Volver
          </button>
          <button type="submit" disabled={enviando} className={BOTON_PELIGRO}>
            {enviando && <LoaderCircle size={16} className="animate-spin" />}
            Cancelar cita
          </button>
        </div>
      </form>
    </dialog>
  )
}
