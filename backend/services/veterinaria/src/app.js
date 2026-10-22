import { crearApp } from '@huellas/shared'
import { crearConsultasRepository } from './repositories/consultas.repository.js'
import { crearLecturasRepository } from './repositories/lecturas.repository.js'
import { crearHistorialService } from './services/historial.service.js'
import { crearHistorialController } from './controllers/historial.controller.js'
import { crearHistorialRoutes } from './routes/historial.routes.js'

export function crearAppVeterinaria({ pool, verificarSesion }) {
  const historialService = crearHistorialService({
    consultas: crearConsultasRepository(pool),
    lecturas: crearLecturasRepository(pool),
  })

  return crearApp({
    nombre: 'veterinaria',
    verificarSesion,
    rutas: (app, { exigirSesion }) => {
      app.use(exigirSesion, crearHistorialRoutes(crearHistorialController(historialService)))
    },
  })
}
