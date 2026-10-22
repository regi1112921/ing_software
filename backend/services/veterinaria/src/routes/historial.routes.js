import { Router } from 'express'

export function crearHistorialRoutes(controller) {
  const router = Router()
  router.get('/veterinarios', controller.veterinarios)        // HU-09 · RF-12 (lista de responsables)
  router.get('/perros/:id/historial', controller.historial)   // HU-08 · RF-11
  router.post('/consultas', controller.registrarConsulta)     // HU-09 · RF-12
  return router
}
