import { Router } from 'express'

export function crearIndicadoresRoutes(controller) {
  const router = Router()
  router.get('/resumen', controller.resumen)                           // HU-13 · RF-03
  router.get('/perros-en-tratamiento', controller.perrosEnTratamiento) // HU-14 · RF-04
  router.get('/adopciones-por-mes', controller.adopcionesPorMes)       // HU-13
  return router
}
