import { useEffect, useState, type FormEvent } from 'react'
import { CalendarRange } from 'lucide-react'
import type { Periodo } from '@/api/tipos'
import { BOTON_PRIMARIO, CLASE_INPUT } from '@/shared/utils/estilos'
import { NOMBRE_ATAJO, atajoDe, rangoDeAtajo, type Atajo } from '../utils/periodos'

interface Props {
  periodo: Periodo
  onCambiar: (periodo: Periodo) => void
}

const ATAJOS = Object.keys(NOMBRE_ATAJO) as Exclude<Atajo, 'personalizado'>[]

// HU-12 · Atajos (este mes, últimos 3 meses, este año) o un rango de fechas propio.
export default function FiltroFechas({ periodo, onCambiar }: Props) {
  const activo = atajoDe(periodo)
  const [personalizado, setPersonalizado] = useState(activo === 'personalizado')
  const [rango, setRango] = useState(periodo)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setRango(periodo), [periodo])

  function aplicar(e: FormEvent) {
    e.preventDefault()
    if (!rango.desde || !rango.hasta) return setError('Elige las dos fechas.')
    if (rango.hasta < rango.desde) return setError('La fecha final no puede ser anterior a la inicial.')
    setError(null)
    onCambiar(rango)
  }

  const claseBoton = (marcado: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
      marcado ? 'bg-forest-600 border-forest-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
    }`

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Periodo del dashboard" className="flex flex-wrap items-center gap-2">
        {ATAJOS.map((atajo) => (
          <button
            key={atajo}
            type="button"
            aria-pressed={!personalizado && activo === atajo}
            onClick={() => {
              setPersonalizado(false)
              setError(null)
              onCambiar(rangoDeAtajo(atajo))
            }}
            className={claseBoton(!personalizado && activo === atajo)}
          >
            {NOMBRE_ATAJO[atajo]}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={personalizado || activo === 'personalizado'}
          aria-expanded={personalizado}
          onClick={() => setPersonalizado(true)}
          className={`${claseBoton(personalizado || activo === 'personalizado')} inline-flex items-center gap-1.5`}
        >
          <CalendarRange size={14} /> Rango de fechas
        </button>
      </div>

      {personalizado && (
        <form onSubmit={aplicar} className="flex flex-wrap items-end gap-3" noValidate>
          <label className="text-sm text-gray-600">
            <span className="block text-xs font-semibold mb-1">Desde</span>
            <input
              type="date"
              value={rango.desde}
              max={rango.hasta || undefined}
              onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
              className={`${CLASE_INPUT} !w-auto !py-2`}
            />
          </label>
          <label className="text-sm text-gray-600">
            <span className="block text-xs font-semibold mb-1">Hasta</span>
            <input
              type="date"
              value={rango.hasta}
              min={rango.desde || undefined}
              onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
              className={`${CLASE_INPUT} !w-auto !py-2`}
            />
          </label>
          <button type="submit" className={`${BOTON_PRIMARIO} !py-2`}>
            Aplicar
          </button>
          {error && (
            <p role="alert" className="text-xs text-red-600 w-full">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
