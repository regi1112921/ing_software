import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { autenticacionApi } from '@/api/autenticacion.api'
import { EVENTO_SESION_EXPIRADA, tokenGuardado } from '@/api/http'
import type { Usuario } from '@/api/tipos'
import { SesionContext, type ValorSesion } from './SesionContext'

export default function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [verificando, setVerificando] = useState(() => tokenGuardado.leer() !== null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Al abrir la app, si hay un token guardado se valida contra el backend.
  useEffect(() => {
    if (!tokenGuardado.leer()) return
    autenticacionApi
      .obtenerSesion()
      .then(({ usuario }) => setUsuario(usuario))
      .catch(() => tokenGuardado.borrar())
      .finally(() => setVerificando(false))
  }, [])

  // Cualquier 401 con sesión abierta (expiró o se cerró en otra pestaña).
  useEffect(() => {
    function alExpirar() {
      tokenGuardado.borrar()
      setAviso('Tu sesión expiró. Inicia sesión de nuevo para continuar.')
      setUsuario(null)
    }
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar)
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar)
  }, [])

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    const respuesta = await autenticacionApi.iniciarSesion(correo, contrasena)
    tokenGuardado.guardar(respuesta.token)
    setAviso(null)
    setUsuario(respuesta.usuario)
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await autenticacionApi.cerrarSesion()
    } catch {
      // Aunque el backend no responda, la sesión local se cierra igual.
    }
    tokenGuardado.borrar()
    setAviso(null)
    setUsuario(null)
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({ usuario, verificando, aviso, iniciarSesion, cerrarSesion }),
    [usuario, verificando, aviso, iniciarSesion, cerrarSesion],
  )

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
