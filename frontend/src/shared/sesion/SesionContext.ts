import { createContext, useContext } from 'react'
import type { Usuario } from '@/api/tipos'

export interface ValorSesion {
  usuario: Usuario | null
  // true mientras se valida un token guardado al abrir la app.
  verificando: boolean
  // Motivo por el que se cerró la sesión sin que la persona lo pidiera.
  aviso: string | null
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const SesionContext = createContext<ValorSesion | null>(null)

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext)
  if (!valor) throw new Error('useSesion debe usarse dentro de <SesionProvider>.')
  return valor
}
