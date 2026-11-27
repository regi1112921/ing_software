import { crearApp, exigirRol } from '@huellas/shared'
import { ROLES_ADOPCIONES, ROLES_HISTORIAS } from './permisos.js'
import { crearCatalogosRepository } from './repositories/catalogos.repository.js'
import { crearPerrosRepository } from './repositories/perros.repository.js'
import { crearAdoptantesRepository } from './repositories/adoptantes.repository.js'
import { crearAdopcionesRepository } from './repositories/adopciones.repository.js'
import { crearSolicitudesPublicasRepository } from './repositories/solicitudesPublicas.repository.js'
import { crearSeguimientosRepository } from './repositories/seguimientos.repository.js'
import { crearAvisosRepository } from './repositories/avisos.repository.js'
import { crearHistoriasRepository } from './repositories/historias.repository.js'
import { crearPerrosService } from './services/perros.service.js'
import { crearAdopcionesService } from './services/adopciones.service.js'
import { crearPublicoService } from './services/publico.service.js'
import { crearSolicitudesPublicasService } from './services/solicitudesPublicas.service.js'
import { crearSeguimientosService } from './services/seguimientos.service.js'
import { crearAvisosService } from './services/avisos.service.js'
import { crearHistoriasService } from './services/historias.service.js'
import { crearCatalogosController } from './controllers/catalogos.controller.js'
import { crearPerrosController } from './controllers/perros.controller.js'
import { crearAdopcionesController } from './controllers/adopciones.controller.js'
import { crearPublicoController } from './controllers/publico.controller.js'
import { crearSolicitudesPublicasController } from './controllers/solicitudesPublicas.controller.js'
import { crearSeguimientosController } from './controllers/seguimientos.controller.js'
import { crearAvisosController } from './controllers/avisos.controller.js'
import { crearHistoriasController } from './controllers/historias.controller.js'
import { crearCatalogosRoutes } from './routes/catalogos.routes.js'
import { crearPerrosRoutes } from './routes/perros.routes.js'
import { crearAdopcionesRoutes } from './routes/adopciones.routes.js'
import { crearPublicoRoutes } from './routes/publico.routes.js'
import { crearSolicitudesPublicasRoutes } from './routes/solicitudesPublicas.routes.js'
import { crearSeguimientosDeAdopcionRoutes, crearSeguimientosRoutes } from './routes/seguimientos.routes.js'
import { crearAvisosRoutes } from './routes/avisos.routes.js'
import { crearHistoriasRoutes } from './routes/historias.routes.js'

// limitePublico: opcional, para cambiar el límite de solicitudes del catálogo (pruebas).
export function crearAppAdopcion({ pool, verificarSesion, limitePublico }) {
  const catalogos = crearCatalogosRepository(pool)
  const perros = crearPerrosRepository(pool)
  const adoptantes = crearAdoptantesRepository()
  const adopciones = crearAdopcionesRepository(pool)
  const solicitudesPublicas = crearSolicitudesPublicasRepository(pool)
  const seguimientos = crearSeguimientosRepository(pool)
  const avisos = crearAvisosRepository(pool)
  const historias = crearHistoriasRepository(pool)

  const perrosService = crearPerrosService({ perros, adopciones, catalogos })
  const adopcionesService = crearAdopcionesService({ pool, adopciones, adoptantes, perros, solicitudesPublicas })
  const publicoService = crearPublicoService({ perros, catalogos, solicitudesPublicas, historias })
  const solicitudesPublicasService = crearSolicitudesPublicasService({ pool, solicitudesPublicas })
  const seguimientosController = crearSeguimientosController(crearSeguimientosService({ adopciones, seguimientos }))
  const avisosController = crearAvisosController(crearAvisosService({ adopciones, avisos }))
  const historiasController = crearHistoriasController(crearHistoriasService({ adopciones, historias }))

  return crearApp({
    nombre: 'adopcion',
    verificarSesion,
    rutas: (app, { exigirSesion }) => {
      // HU-09: catálogo público, sin sesión (HU-14: también las historias de adopciones exitosas).
      app.use(
        '/publico',
        crearPublicoRoutes(crearPublicoController(publicoService), limitePublico ? { limite: limitePublico } : undefined),
      )
      app.use('/catalogos', exigirSesion, crearCatalogosRoutes(crearCatalogosController(catalogos)))
      app.use('/perros', exigirSesion, crearPerrosRoutes(crearPerrosController(perrosService)))
      // HU-10: seguimientos después de la adopción (antes que /adopciones/:id para no chocar).
      app.use(
        '/adopciones/:id/seguimientos',
        exigirSesion,
        exigirRol(...ROLES_ADOPCIONES),
        crearSeguimientosDeAdopcionRoutes(seguimientosController),
      )
      // HU-13: avisos al adoptante sobre su solicitud (también antes que /adopciones/:id).
      app.use(
        '/adopciones/:id/avisos',
        exigirSesion,
        exigirRol(...ROLES_ADOPCIONES),
        crearAvisosRoutes(avisosController),
      )
      // HU-14: historias de adopciones exitosas (las publica la administración).
      app.use('/historias', exigirSesion, exigirRol(...ROLES_HISTORIAS), crearHistoriasRoutes(historiasController))
      app.use('/seguimientos', exigirSesion, exigirRol(...ROLES_ADOPCIONES), crearSeguimientosRoutes(seguimientosController))
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
