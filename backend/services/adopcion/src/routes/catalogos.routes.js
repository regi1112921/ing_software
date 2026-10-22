import { Router } from 'express'

export function crearCatalogosRoutes(controller) {
  const router = Router()
  router.get('/', controller.listar) // razas, tamaños y estados para los formularios (HU-04)
  return router
}
