import { http } from './http'
import type { RespuestaLogin, Usuario } from './tipos'

const BASE = '/api/autenticacion/auth'

export const autenticacionApi = {
  iniciarSesion: (correo: string, contrasena: string) =>
    http<RespuestaLogin>(`${BASE}/login`, { method: 'POST', body: { correo, contrasena } }),
  cerrarSesion: () => http<void>(`${BASE}/logout`, { method: 'POST' }),
  obtenerSesion: () => http<{ usuario: Usuario }>(`${BASE}/sesion`),
}
