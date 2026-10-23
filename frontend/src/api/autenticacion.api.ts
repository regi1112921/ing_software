import { http } from './http'
import type { DatosRegistro, RespuestaLogin, Usuario } from './tipos'

const BASE = '/api/autenticacion/auth'

export const autenticacionApi = {
  iniciarSesion: (correo: string, contrasena: string) =>
    http<RespuestaLogin>(`${BASE}/login`, { method: 'POST', body: { correo, contrasena } }),
  registrarse: (datos: DatosRegistro) => http<RespuestaLogin>(`${BASE}/registro`, { method: 'POST', body: datos }),
  cerrarSesion: () => http<void>(`${BASE}/logout`, { method: 'POST' }),
  obtenerSesion: () => http<{ usuario: Usuario }>(`${BASE}/sesion`),
}
