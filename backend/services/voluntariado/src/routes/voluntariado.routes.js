import { Router } from 'express'

export function crearVoluntariadoRoutes(controller) {
  const router = Router()
  router.get('/voluntarios', controller.listarVoluntarios)
  router.post('/voluntarios', controller.registrarVoluntario)
  router.get('/turnos', controller.calendario)
  router.post('/turnos', controller.asignarTurno)
  router.get('/horas', controller.horasMensuales)
  return router
}
