import { Router } from 'express'

// HU-09 · Solicitudes recibidas desde el catálogo público (módulo de adopciones).
export function crearSolicitudesPublicasRoutes(controller) {
  const router = Router()
  router.get('/', controller.listar)
  router.get('/:id', controller.obtener)
  router.post('/:id/descartar', controller.descartar)
  return router
}
