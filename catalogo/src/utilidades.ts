import { useCallback, useEffect, useState } from 'react'
import type { Sexo } from './api'

export const NOMBRE_SEXO: Record<Sexo, string> = { macho: 'Macho', hembra: 'Hembra' }

export function formatearEdad(edadMeses: number | null, estimada = false): string {
  if (edadMeses === null) return 'Edad desconocida'
  const prefijo = estimada ? 'Unos ' : ''
  if (edadMeses < 12) return `${prefijo}${edadMeses} ${edadMeses === 1 ? 'mes' : 'meses'}`
  const anios = Math.floor(edadMeses / 12)
  return `${prefijo}${anios} ${anios === 1 ? 'año' : 'años'}`
}

// Carga datos al montar y cuando cambian las dependencias.
export function useCarga<T>(cargar: () => Promise<T>, dependencias: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [estadoHttp, setEstadoHttp] = useState<number | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setError(null)
    setEstadoHttp(null)
    cargar()
      .then((resultado) => vigente && setDatos(resultado))
      .catch((err: Error & { estado?: number }) => {
        if (!vigente) return
        setError(err.message)
        setEstadoHttp(err.estado ?? null)
      })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { datos, error, estadoHttp, recargar }
}

export const BOTON_PRIMARIO =
  'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold bg-forest-600 hover:bg-forest-700 text-white ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

export const CLASE_INPUT =
  'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent ' +
  'aria-[invalid=true]:border-red-300 aria-[invalid=true]:ring-red-200'
