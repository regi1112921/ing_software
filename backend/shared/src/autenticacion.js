// Protección de rutas con la sesión emitida por el servicio de Autenticación.
import { ErrorHttp, noAutenticado } from './errores.js'

function tokenDe(req) {
  const cabecera = req.get('authorization') || ''
  const [tipo, token] = cabecera.split(' ')
  return tipo?.toLowerCase() === 'bearer' && token ? token : null
}

// verificarSesion(token) → usuario | null
export function crearExigirSesion(verificarSesion) {
  return async function exigirSesion(req, res, next) {
    const token = tokenDe(req)
    if (!token) throw noAutenticado()
    const usuario = await verificarSesion(token)
    if (!usuario) throw noAutenticado('La sesión no es válida o ya expiró. Inicia sesión de nuevo.')
    req.usuario = usuario
    req.token = token
    next()
  }
}

// Verificador que usan Veterinaria, Adopción y Dashboard: pregunta al servicio de Autenticación.
export function verificadorRemoto(urlAutenticacion) {
  return async function verificarSesion(token) {
    let respuesta
    try {
      respuesta = await fetch(`${urlAutenticacion}/auth/sesion`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      throw new ErrorHttp(503, 'El servicio de autenticación no está disponible.')
    }
    if (respuesta.status === 401) return null
    if (!respuesta.ok) throw new ErrorHttp(503, 'El servicio de autenticación no está disponible.')
    const { usuario } = await respuesta.json()
    return usuario
  }
}
