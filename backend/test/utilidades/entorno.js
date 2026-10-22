// Entorno de pruebas: PostgreSQL en memoria (PGlite) con los mismos scripts de database/,
// expuesto por socket para usar el driver pg real, y los cuatro servicios conectados.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { crearPool, verificadorRemoto } from '@huellas/shared'
import { crearAppAutenticacion } from '../../services/autenticacion/src/app.js'
import { crearAlmacenSesiones } from '../../services/autenticacion/src/services/sesiones.js'
import { crearAppAdopcion } from '../../services/adopcion/src/app.js'
import { crearAppVeterinaria } from '../../services/veterinaria/src/app.js'
import { crearAppDashboard } from '../../services/dashboard/src/app.js'

const ARCHIVOS_BD = [
  'schema/00_comun.sql',
  'schema/01_catalogos.sql',
  'schema/02_usuarios.sql',
  'schema/03_adopcion.sql',
  'schema/04_veterinaria.sql',
  'views/01_vistas.sql',
  'seguridad/01_permisos.sql',
  'seeds/01_datos_prueba.sql',
]

// Contraseña solo para las pruebas (los datos de prueba no traen contraseñas).
export const CONTRASENA = 'Prueba-Huellas-2026'
export const PERSONAL = 'maria.alvarado@peluchin.test'

const leerSql = (archivo) => readFileSync(fileURLToPath(new URL(`../../../database/${archivo}`, import.meta.url)), 'utf8')

export async function crearEntorno() {
  const db = await PGlite.create()
  for (const archivo of ARCHIVOS_BD) await db.exec(leerSql(archivo))

  // Puerto 0: el sistema operativo elige uno libre.
  const servidorBd = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' })
  await servidorBd.start()
  // PGlite atiende una conexión: el pool usa una sola.
  const pool = crearPool({ connectionString: `postgres://postgres@${servidorBd.getServerConn()}/postgres`, ssl: false, max: 1 })

  // Todos con contraseña salvo el administrador; además un usuario desactivado.
  const hash = await bcrypt.hash(CONTRASENA, 4)
  await pool.query("update usuarios set password_hash = $1 where rol <> 'administrador'", [hash])
  await pool.query(
    `insert into usuarios (nombre_completo, correo, rol, activo, password_hash)
     values ('Usuario Inactivo', 'inactivo@peluchin.test', 'personal', false, $1)`,
    [hash],
  )

  const appAutenticacion = crearAppAutenticacion({
    pool,
    sesiones: crearAlmacenSesiones({ duracionMs: 60 * 60 * 1000 }),
  })
  const servidorAuth = await new Promise((resolver) => {
    const servidor = appAutenticacion.listen(0, '127.0.0.1', () => resolver(servidor))
  })
  // Los demás servicios validan la sesión contra el servicio de Autenticación por HTTP, como en producción.
  const verificarSesion = verificadorRemoto(`http://127.0.0.1:${servidorAuth.address().port}`)

  const apps = {
    autenticacion: appAutenticacion,
    adopcion: crearAppAdopcion({ pool, verificarSesion }),
    veterinaria: crearAppVeterinaria({ pool, verificarSesion }),
    dashboard: crearAppDashboard({ pool, verificarSesion }),
  }

  async function iniciarSesion(correo = PERSONAL) {
    const respuesta = await request(appAutenticacion).post('/auth/login').send({ correo, contrasena: CONTRASENA })
    if (respuesta.status !== 200) throw new Error(`No se pudo iniciar sesión: ${JSON.stringify(respuesta.body)}`)
    return respuesta.body.token
  }

  // Petición autenticada: api('adopcion', token).get('/perros')
  function api(servicio, token) {
    const agente = request(apps[servicio])
    const conToken = (prueba) => prueba.set('authorization', `Bearer ${token}`)
    return {
      get: (ruta) => conToken(agente.get(ruta)),
      post: (ruta) => conToken(agente.post(ruta)),
      put: (ruta) => conToken(agente.put(ruta)),
      patch: (ruta) => conToken(agente.patch(ruta)),
    }
  }

  async function cerrar() {
    await new Promise((resolver) => servidorAuth.close(resolver))
    await pool.end()
    await servidorBd.stop()
    await db.close()
  }

  return { pool, apps, api, iniciarSesion, cerrar }
}

// id de un perro de los datos de prueba por su nombre.
export async function idPerro(pool, nombre) {
  const { rows } = await pool.query('select id from perros where nombre = $1', [nombre])
  return rows[0].id
}
