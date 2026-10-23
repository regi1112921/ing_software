import { Router } from 'express'

export function crearAuthRoutes(controller, { exigirSesion }) {
  const router = Router()
  router.post('/login', controller.login)                    // HU-02 · RF-01
  router.post('/registro', controller.registro)              // crea una cuenta de personal y abre sesión
  router.post('/logout', exigirSesion, controller.logout)    // HU-03 · RF-02
  router.get('/sesion', exigirSesion, controller.sesion)     // usado por los demás servicios
  return router
}
