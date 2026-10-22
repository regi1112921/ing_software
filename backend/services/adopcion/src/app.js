import { crearApp } from '@huellas/shared'
import { crearCatalogosRepository } from './repositories/catalogos.repository.js'
import { crearPerrosRepository } from './repositories/perros.repository.js'
import { crearAdoptantesRepository } from './repositories/adoptantes.repository.js'
import { crearAdopcionesRepository } from './repositories/adopciones.repository.js'
import { crearPerrosService } from './services/perros.service.js'
import { crearAdopcionesService } from './services/adopciones.service.js'
import { crearCatalogosController } from './controllers/catalogos.controller.js'
import { crearPerrosController } from './controllers/perros.controller.js'
import { crearAdopcionesController } from './controllers/adopciones.controller.js'
import { crearCatalogosRoutes } from './routes/catalogos.routes.js'
import { crearPerrosRoutes } from './routes/perros.routes.js'
import { crearAdopcionesRoutes } from './routes/adopciones.routes.js'

export function crearAppAdopcion({ pool, verificarSesion }) {
  const catalogos = crearCatalogosRepository(pool)
  const perros = crearPerrosRepository(pool)
  const adoptantes = crearAdoptantesRepository()
  const adopciones = crearAdopcionesRepository(pool)

  const perrosService = crearPerrosService({ perros, adopciones, catalogos })
  const adopcionesService = crearAdopcionesService({ pool, adopciones, adoptantes, perros })

  return crearApp({
    nombre: 'adopcion',
    verificarSesion,
    rutas: (app, { exigirSesion }) => {
      app.use('/catalogos', exigirSesion, crearCatalogosRoutes(crearCatalogosController(catalogos)))
      app.use('/perros', exigirSesion, crearPerrosRoutes(crearPerrosController(perrosService)))
      app.use('/adopciones', exigirSesion, crearAdopcionesRoutes(crearAdopcionesController(adopcionesService)))
    },
  })
}
