// Límite de peticiones por IP en memoria (ventana fija). Pensado para rutas
// públicas sin sesión, como el envío de solicitudes del catálogo (HU-09).
// Con varias instancias del servicio cada una lleva su propia cuenta.
import { ErrorHttp } from './errores.js'

export function limitarPeticiones({ ventanaMs, maximo, mensaje = 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' }) {
  const registros = new Map() // ip → { inicio, cantidad }

  return function limite(req, res, next) {
    const ahora = Date.now()
    // Limpieza ocasional para que el mapa no crezca sin fin.
    if (registros.size > 10_000) {
      for (const [ip, registro] of registros) if (ahora - registro.inicio >= ventanaMs) registros.delete(ip)
    }

    const ip = req.ip ?? 'desconocida'
    let registro = registros.get(ip)
    if (!registro || ahora - registro.inicio >= ventanaMs) {
      registro = { inicio: ahora, cantidad: 0 }
      registros.set(ip, registro)
    }
    registro.cantidad += 1

    if (registro.cantidad > maximo) {
      res.set('Retry-After', String(Math.ceil((registro.inicio + ventanaMs - ahora) / 1000)))
      throw new ErrorHttp(429, mensaje)
    }
    next()
  }
}
