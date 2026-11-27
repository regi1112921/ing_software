import { Router } from 'express'

// HU-13 · Avisos al adoptante sobre su solicitud: /adopciones/:id/avisos
export function crearAvisosRoutes(controller) {
  const router = Router({ mergeParams: true })
  router.get('/', controller.listar)
  router.get('/borrador', controller.borrador)
  router.post('/', controller.registrar)
  return router
}
