import { Router } from 'express'

export function crearIndicadoresRoutes(controller) {
  const router = Router()
  router.get('/resumen', controller.resumen)                           // HU-13 · RF-03 (+ periodo, HU-12)
  router.get('/perros-en-tratamiento', controller.perrosEnTratamiento) // HU-14 · RF-04
  router.get('/adopciones-por-mes', controller.adopcionesPorMes)       // HU-13
  router.get('/evolucion', controller.evolucion)                       // HU-12 · ingresos y adopciones del periodo
  return router
}
