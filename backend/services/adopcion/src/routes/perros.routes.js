import { Router } from 'express'

export function crearPerrosRoutes(controller) {
  const router = Router()
  router.get('/', controller.listar)          // HU-06 · RF-07, RF-08, RF-09
  router.get('/:id', controller.obtener)      // HU-07 · RF-10
  router.post('/', controller.crear)          // HU-04 · RF-05
  router.put('/:id', controller.actualizar)   // HU-05 · RF-06
  return router
}
