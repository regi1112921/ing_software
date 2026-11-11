import { crearApp } from '@huellas/shared'
import { crearConsultasRepository } from './repositories/consultas.repository.js'
import { crearLecturasRepository } from './repositories/lecturas.repository.js'
import { crearControlesRepository } from './repositories/controles.repository.js'
import { crearHistorialService } from './services/historial.service.js'
import { crearControlesService } from './services/controles.service.js'
import { crearHistorialController } from './controllers/historial.controller.js'
import { crearControlesController } from './controllers/controles.controller.js'
import { crearHistorialRoutes } from './routes/historial.routes.js'
import { crearControlesRoutes } from './routes/controles.routes.js'

export function crearAppVeterinaria({ pool, verificarSesion }) {
  const lecturas = crearLecturasRepository(pool)
  const controles = crearControlesRepository(pool)
  const historialService = crearHistorialService({ consultas: crearConsultasRepository(pool), controles, lecturas })
  const controlesService = crearControlesService({ controles, lecturas })

  return crearApp({
    nombre: 'veterinaria',
    verificarSesion,
    rutas: (app, { exigirSesion }) => {
      // Un solo exigirSesion para los dos routers (la sesión se valida una vez por petición).
      app.use(
        exigirSesion,
        crearHistorialRoutes(crearHistorialController(historialService)),
        crearControlesRoutes(crearControlesController(controlesService)),
      )
    },
  })
}
