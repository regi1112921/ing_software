import { Router } from 'express'

// HU-10 · Seguimientos de una adopción: /adopciones/:id/seguimientos
export function crearSeguimientosDeAdopcionRoutes(controller) {
  const router = Router({ mergeParams: true })
  router.get('/', controller.listar)
  router.post('/', controller.registrar)
  router.patch('/:seguimientoId', controller.marcarProblemas)
  return router
}

// HU-10 · Alertas de seguimiento: /seguimientos
export function crearSeguimientosRoutes(controller) {
  const router = Router()
  router.get('/pendientes', controller.sinSeguimiento)
  router.get('/con-problemas', controller.conProblemas)
  return router
}
