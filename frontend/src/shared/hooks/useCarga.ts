import { useCallback, useEffect, useState, type DependencyList } from 'react'

interface EstadoCarga<T> {
  datos: T | undefined
  error: string | null
  cargando: boolean
}

// Carga datos del backend y expone { datos, error, cargando, recargar }.
// Mientras recarga conserva los datos anteriores para no parpadear.
export function useCarga<T>(cargar: () => Promise<T>, dependencias: DependencyList = []) {
  const [estado, setEstado] = useState<EstadoCarga<T>>({ datos: undefined, error: null, cargando: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setEstado((previo) => ({ ...previo, cargando: true, error: null }))
    cargar()
      .then((datos) => vigente && setEstado({ datos, error: null, cargando: false }))
      .catch((error: Error) => vigente && setEstado((previo) => ({ ...previo, error: error.message, cargando: false })))
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { ...estado, recargar }
}
