import { Router } from 'express'
import { ROLES, exigirRol } from '@huellas/shared'

// HU-07: todos los roles consultan el historial; solo administración y veterinaria registran atenciones.
const puedeRegistrarAtencion = exigirRol(ROLES.administrador, ROLES.veterinario)

export function crearHistorialRoutes(controller) {
  const router = Router()
  router.get('/veterinarios', controller.veterinarios)        // HU-09 · RF-12 (lista de responsables)
  router.get('/perros/:id/historial', controller.historial)   // RF-11 (+ vacunas y desparasitaciones, HU-08)
  router.post('/consultas', puedeRegistrarAtencion, controller.registrarConsulta) // HU-09 · RF-12
  return router
}
