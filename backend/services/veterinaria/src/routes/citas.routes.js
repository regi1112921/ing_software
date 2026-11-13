import { Router } from 'express'
import { ROLES, exigirRol } from '@huellas/shared'

// HU-11: la agenda de citas es de administración y veterinaria.
const soloVeterinaria = exigirRol(ROLES.administrador, ROLES.veterinario)

export function crearCitasRoutes(controller) {
  const router = Router()
  router.get('/citas', soloVeterinaria, controller.listar)                    // agenda por rango de fechas
  router.post('/citas', soloVeterinaria, controller.crear)
  router.get('/citas/:id', soloVeterinaria, controller.obtener)
  router.put('/citas/:id', soloVeterinaria, controller.editar)                // solo citas programadas
  router.post('/citas/:id/cancelar', soloVeterinaria, controller.cancelar)
  router.post('/citas/:id/atender', soloVeterinaria, controller.atender)      // crea la consulta en el historial
  return router
}
