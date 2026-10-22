import { crearApp } from '@huellas/shared'
import { crearIndicadoresRepository } from './repositories/indicadores.repository.js'
import { crearIndicadoresService } from './services/indicadores.service.js'
import { crearIndicadoresController } from './controllers/indicadores.controller.js'
import { crearIndicadoresRoutes } from './routes/indicadores.routes.js'

export function crearAppDashboard({ pool, verificarSesion }) {
  const indicadoresService = crearIndicadoresService({ indicadores: crearIndicadoresRepository(pool) })

  return crearApp({
    nombre: 'dashboard',
    verificarSesion,
    rutas: (app, { exigirSesion }) => {
      app.use(exigirSesion, crearIndicadoresRoutes(crearIndicadoresController(indicadoresService)))
    },
  })
}
