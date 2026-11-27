import { ROLES, crearApp, exigirRol } from '@huellas/shared'
import { crearVoluntariosRepository } from './repositories/voluntarios.repository.js'
import { crearVoluntariadoService } from './services/voluntariado.service.js'
import { crearVoluntariadoController } from './controllers/voluntariado.controller.js'
import { crearVoluntariadoRoutes } from './routes/voluntariado.routes.js'

export function crearAppVoluntariado({ pool, verificarSesion }) {
  const service = crearVoluntariadoService({ pool, voluntarios: crearVoluntariosRepository(pool) })

  return crearApp({
    nombre: 'voluntariado',
    verificarSesion,
    rutas: (app, { exigirSesion }) => {
      app.use(exigirSesion, exigirRol(ROLES.administrador), crearVoluntariadoRoutes(crearVoluntariadoController(service)))
    },
  })
}
