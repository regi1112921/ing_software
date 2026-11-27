import express, { Router } from 'express'
import { ErrorHttp } from '@huellas/shared'
import { TAMANO_MAXIMO_FOTO } from '../services/fotos.service.js'

// Subida de fotos: POST /fotos?carpeta=perros|historias con la imagen como cuerpo
// (Content-Type image/jpeg, image/png o image/webp). Responde la URL pública.
export function crearFotosRoutes(controller) {
  const router = Router()
  router.post('/', express.raw({ type: () => true, limit: TAMANO_MAXIMO_FOTO }), controller.subir)
  // Cuerpo más grande que el límite → 413 con un mensaje claro.
  router.use((error, req, res, next) => {
    next(error.type === 'entity.too.large' ? new ErrorHttp(413, 'La foto no puede superar 5 MB.') : error)
  })
  return router
}
