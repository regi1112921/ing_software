import { Router } from 'express'
import { ROLES, exigirRol } from '@huellas/shared'

// HU-08: la lista de controles y su registro son de administración y veterinaria.
const soloVeterinaria = exigirRol(ROLES.administrador, ROLES.veterinario)

export function crearControlesRoutes(controller) {
  const router = Router()
  router.get('/controles/pendientes', soloVeterinaria, controller.pendientes)            // HU-08
  router.post('/vacunas', soloVeterinaria, controller.registrarVacuna)                   // HU-08
  router.post('/desparasitaciones', soloVeterinaria, controller.registrarDesparasitacion) // HU-08
  return router
}
