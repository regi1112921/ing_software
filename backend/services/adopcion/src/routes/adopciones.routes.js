import { Router } from 'express'

export function crearAdopcionesRoutes(controller) {
  const router = Router()
  router.get('/', controller.listar)                     // HU-11 · RF-15
  router.get('/:id', controller.obtener)                 // HU-11 · RF-16
  router.post('/', controller.crear)                     // HU-10 · RF-13, RF-14, RF-19
  router.patch('/:id/estado', controller.cambiarEstado)  // HU-12 · RF-17, RF-18, RF-19, RF-20
  return router
}
