import { crearApp } from '@huellas/shared'
import { crearUsuariosRepository } from './repositories/usuarios.repository.js'
import { crearAuthService } from './services/auth.service.js'
import { crearAuthController } from './controllers/auth.controller.js'
import { crearAuthRoutes } from './routes/auth.routes.js'

export function crearAppAutenticacion({ pool, sesiones }) {
  const authService = crearAuthService({ usuarios: crearUsuariosRepository(pool), sesiones })
  const controller = crearAuthController(authService)

  return crearApp({
    nombre: 'autenticacion',
    // Este servicio es el dueño de las sesiones: las verifica en memoria.
    verificarSesion: async (token) => sesiones.obtener(token),
    rutas: (app, { exigirSesion }) => {
      app.use('/auth', crearAuthRoutes(controller, { exigirSesion }))
    },
  })
}
