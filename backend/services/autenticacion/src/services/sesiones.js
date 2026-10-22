// Sesiones activas en memoria. Cerrar sesión borra el token, así que deja de valer
// de inmediato en todos los servicios (todos le consultan a este).
// Si el servicio se reinicia, las sesiones se pierden y hay que volver a iniciar sesión.
import { randomBytes } from 'node:crypto'

export function crearAlmacenSesiones({ duracionMs }) {
  const sesiones = new Map()

  function purgarExpiradas(ahora) {
    for (const [token, sesion] of sesiones) {
      if (sesion.expira <= ahora) sesiones.delete(token)
    }
  }

  return {
    crear(usuario) {
      purgarExpiradas(Date.now())
      const token = randomBytes(32).toString('base64url')
      const expira = Date.now() + duracionMs
      sesiones.set(token, { usuario, expira })
      return { token, expira: new Date(expira).toISOString() }
    },

    obtener(token) {
      const sesion = sesiones.get(token)
      if (!sesion) return null
      if (sesion.expira <= Date.now()) {
        sesiones.delete(token)
        return null
      }
      return sesion.usuario
    },

    eliminar(token) {
      sesiones.delete(token)
    },
  }
}
