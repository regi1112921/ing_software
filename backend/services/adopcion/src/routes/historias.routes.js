import { Router } from 'express'

// HU-14 · Historias de adopciones exitosas: /historias
export function crearHistoriasRoutes(controller) {
  const router = Router()
  router.get('/', controller.listar)
  router.get('/candidatas', controller.candidatas)
  router.get('/:id', controller.obtener)
  router.post('/', controller.publicar)
  router.patch('/:id', controller.actualizar)
  return router
}
