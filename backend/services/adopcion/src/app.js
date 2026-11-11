import { crearApp, exigirRol } from '@huellas/shared'
import { ROLES_ADOPCIONES } from './permisos.js'
import { crearCatalogosRepository } from './repositories/catalogos.repository.js'
import { crearPerrosRepository } from './repositories/perros.repository.js'
import { crearAdoptantesRepository } from './repositories/adoptantes.repository.js'
import { crearAdopcionesRepository } from './repositories/adopciones.repository.js'
import { crearSolicitudesPublicasRepository } from './repositories/solicitudesPublicas.repository.js'
import { crearPerrosService } from './services/perros.service.js'
import { crearAdopcionesService } from './services/adopciones.service.js'
import { crearPublicoService } from './services/publico.service.js'
import { crearSolicitudesPublicasService } from './services/solicitudesPublicas.service.js'
import { crearCatalogosController } from './controllers/catalogos.controller.js'
import { crearPerrosController } from './controllers/perros.controller.js'
import { crearAdopcionesController } from './controllers/adopciones.controller.js'
import { crearPublicoController } from './controllers/publico.controller.js'
import { crearSolicitudesPublicasController } from './controllers/solicitudesPublicas.controller.js'
import { crearCatalogosRoutes } from './routes/catalogos.routes.js'
import { crearPerrosRoutes } from './routes/perros.routes.js'
import { crearAdopcionesRoutes } from './routes/adopciones.routes.js'
import { crearPublicoRoutes } from './routes/publico.routes.js'
import { crearSolicitudesPublicasRoutes } from './routes/solicitudesPublicas.routes.js'

// limitePublico: opcional, para cambiar el límite de solicitudes del catálogo (pruebas).
export function crearAppAdopcion({ pool, verificarSesion, limitePublico }) {
  const catalogos = crearCatalogosRepository(pool)
  const perros = crearPerrosRepository(pool)
  const adoptantes = crearAdoptantesRepository()
  const adopciones = crearAdopcionesRepository(pool)
  const solicitudesPublicas = crearSolicitudesPublicasRepository(pool)

  const perrosService = crearPerrosService({ perros, adopciones, catalogos })
  const adopcionesService = crearAdopcionesService({ pool, adopciones, adoptantes, perros, solicitudesPublicas })
  const publicoService = crearPublicoService({ perros, catalogos, solicitudesPublicas })
  const solicitudesPublicasService = crearSolicitudesPublicasService({ pool, solicitudesPublicas })

  return crearApp({
    nombre: 'adopcion',
    verificarSesion,
    rutas: (app, { exigirSesion }) => {
      // HU-09: catálogo público, sin sesión.
      app.use(
        '/publico',
        crearPublicoRoutes(crearPublicoController(publicoService), limitePublico ? { limite: limitePublico } : undefined),
      )
      app.use('/catalogos', exigirSesion, crearCatalogosRoutes(crearCatalogosController(catalogos)))
      app.use('/perros', exigirSesion, crearPerrosRoutes(crearPerrosController(perrosService)))
      app.use(
        '/adopciones',
        exigirSesion,
        exigirRol(...ROLES_ADOPCIONES),
        crearAdopcionesRoutes(crearAdopcionesController(adopcionesService)),
      )
      app.use(
        '/solicitudes-publicas',
        exigirSesion,
        exigirRol(...ROLES_ADOPCIONES),
        crearSolicitudesPublicasRoutes(crearSolicitudesPublicasController(solicitudesPublicasService)),
      )
    },
  })
}
