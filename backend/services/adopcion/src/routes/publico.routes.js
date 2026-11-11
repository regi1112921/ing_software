import { Router } from 'express'
import { limitarPeticiones, limiteSolicitudesPublicas } from '@huellas/shared'

// HU-09 · Catálogo público. Rutas SIN sesión: solo leen perros disponibles
// y reciben pre-solicitudes (limitadas por IP para frenar el spam).
export function crearPublicoRoutes(controller, { limite = limiteSolicitudesPublicas() } = {}) {
  const router = Router()
  router.get('/filtros', controller.filtros)
  router.get('/perros', controller.listar)
  router.get('/perros/:id', controller.obtener)
  router.post(
    '/solicitudes',
    limitarPeticiones({
      ...limite,
      mensaje: 'Recibimos demasiadas solicitudes desde tu conexión. Inténtalo de nuevo más tarde.',
    }),
    controller.enviarSolicitud,
  )
  return router
}
