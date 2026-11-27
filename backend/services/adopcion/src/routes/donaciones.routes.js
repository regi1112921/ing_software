import { Router } from 'express'

export function crearDonacionesRoutes(controller) {
  const router = Router()
  router.get('/', controller.listar)
  router.post('/', controller.crear)
  return router
}