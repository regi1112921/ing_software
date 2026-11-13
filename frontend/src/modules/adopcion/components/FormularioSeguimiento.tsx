import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { ErrorApi } from '@/api/http'
import type { Adopcion, Seguimiento, TipoSeguimiento } from '@/api/tipos'
import Campo from '@/shared/components/Campo'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_INPUT, CLASE_TEXTAREA } from '@/shared/utils/estilos'
import { hoy } from '@/shared/utils/formato'
import { TIPOS_SEGUIMIENTO } from '../utils/seguimientos'

interface Props {
  adopcion: Adopcion
  onCancelar: () => void
  onGuardado: (seguimiento: Seguimiento) => void
}

// HU-10 · Registrar una visita o llamada de seguimiento.
export default function FormularioSeguimiento({ adopcion, onCancelar, onGuardado }: Props) {
  const [fecha, setFecha] = useState(hoy())
  const [tipo, setTipo] = useState<TipoSeguimiento>('visita')
  const [observaciones, setObservaciones] = useState('')
  const [conProblemas, setConProblemas] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!observaciones.trim()) {
      setErrores({ observaciones: 'Cuenta cómo está el perro.' })
      return
    }
    setGuardando(true)
    setError(null)
    try {
      onGuardado(
        await adopcionApi.registrarSeguimiento(adopcion.id, {
          fecha,
          tipo,
          observaciones: observaciones.trim(),
          con_problemas: conProblemas,
        }),
      )
    } catch (err) {
      setError((err as Error).message)
      if (err instanceof ErrorApi) setErrores(err.porCampo)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="mb-5 pb-5 border-b border-warm-100 space-y-4">
      {error && <MensajeError mensaje={error} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo etiqueta="Fecha" obligatorio error={errores.fecha}>
          <input
            type="date"
            required
            min={adopcion.fecha_adopcion ?? undefined}
            max={hoy()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={CLASE_INPUT}
          />
        </Campo>
        <fieldset>
          <legend className="block text-sm font-semibold text-gray-700 mb-1.5">
            Tipo<span className="text-red-500"> *</span>
          </legend>
          <div className="flex gap-2">
            {(Object.keys(TIPOS_SEGUIMIENTO) as TipoSeguimiento[]).map((t) => {
              const { nombre, icono: Icono } = TIPOS_SEGUIMIENTO[t]
              const activo = tipo === t
              return (
                <label
                  key={t}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-forest-500 ${
                    activo ? 'bg-forest-50 border-forest-500 text-forest-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input type="radio" name="tipo" value={t} checked={activo} onChange={() => setTipo(t)} className="sr-only" />
                  <Icono size={15} /> {nombre}
                </label>
              )
            })}
          </div>
          {errores.tipo && <p className="text-xs text-red-600 mt-1.5">{errores.tipo}</p>}
        </fieldset>
      </div>
      <Campo etiqueta="Observaciones" obligatorio error={errores.observaciones}>
        <textarea
          rows={3}
          maxLength={2000}
          value={observaciones}
          onChange={(e) => {
            setObservaciones(e.target.value)
            setErrores(({ observaciones: _, ...resto }) => resto)
          }}
          className={CLASE_TEXTAREA}
          placeholder="¿Cómo está el perro? Alimentación, salud, convivencia, condiciones del hogar…"
        />
      </Campo>
      <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={conProblemas}
          onChange={(e) => setConProblemas(e.target.checked)}
          className="mt-0.5 size-4 rounded border-gray-300 accent-red-600"
        />
        <span>
          <span className="font-semibold">Con problemas</span>
          <span className="text-gray-500"> · queda marcado para revisarlo</span>
        </span>
      </label>
      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
        <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
          {guardando && <LoaderCircle size={16} className="animate-spin" />}
          Guardar seguimiento
        </button>
      </div>
    </form>
  )
}
