// Pruebas unitarias · transacciones y pool (shared/db.js) y app base de Express (shared/app.js).
import { afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import request from 'supertest'
import { crearApp, crearPool, enTransaccion, iniciarServidor } from '@huellas/shared'
import { poolFalso } from './utilidades/dobles.js'

describe('enTransaccion', () => {
  it('hace begin, commit, libera la conexión y devuelve el resultado', async () => {
    const pool = poolFalso()
    const resultado = await enTransaccion(pool, async (cliente) => {
      assert.equal(cliente, pool.cliente)
      return 42
    })
    assert.equal(resultado, 42)
    assert.deepEqual(pool.sentencias, ['begin', 'commit', 'release'])
  })

  it('si la función falla hace rollback, libera y relanza el error', async () => {
    const pool = poolFalso()
    await assert.rejects(
      enTransaccion(pool, async () => {
        throw new Error('falló')
      }),
      /falló/,
    )
    assert.deepEqual(pool.sentencias, ['begin', 'rollback', 'release'])
  })

  it('si el rollback también falla, relanza el error original', async () => {
    const pool = poolFalso()
    pool.cliente.query = async (sql) => {
      if (sql === 'rollback') throw new Error('sin conexión')
    }
    await assert.rejects(
      enTransaccion(pool, async () => {
        throw new Error('original')
      }),
      /original/,
    )
  })
})

describe('crearPool y tipos de PostgreSQL', () => {
  it('configura SSL sin validar la CA y el máximo de conexiones', async () => {
    const pool = crearPool({ connectionString: 'postgres://u:p@localhost/bd', max: 7 })
    assert.deepEqual(pool.options.ssl, { rejectUnauthorized: false })
    assert.equal(pool.options.max, 7)
    await pool.end()
  })

  it('permite desactivar SSL', async () => {
    const pool = crearPool({ connectionString: 'postgres://u:p@localhost/bd', ssl: false })
    assert.equal(pool.options.ssl, false)
    assert.equal(pool.options.max, 5)
    await pool.end()
  })

  it('las fechas llegan como texto AAAA-MM-DD y los bigint como number', () => {
    assert.equal(pg.types.getTypeParser(pg.types.builtins.DATE)('2026-11-15'), '2026-11-15')
    assert.equal(pg.types.getTypeParser(pg.types.builtins.INT8)('42'), 42)
  })
})

describe('crearApp', () => {
  const app = crearApp({
    nombre: 'prueba',
    verificarSesion: async (token) => (token === 'bueno' ? { id: 1, rol: 'administrador' } : null),
    rutas: (app, { exigirSesion }) => {
      app.get('/privado', exigirSesion, (req, res) => res.json({ usuario: req.usuario.id }))
      app.get('/falla', () => {
        throw new Error('inesperado')
      })
    },
  })

  it('expone /health con el nombre del servicio', async () => {
    const respuesta = await request(app).get('/health')
    assert.equal(respuesta.status, 200)
    assert.deepEqual(respuesta.body, { servicio: 'prueba', estado: 'ok' })
    assert.equal(respuesta.headers['x-powered-by'], undefined)
  })

  it('protege las rutas con la sesión', async () => {
    assert.equal((await request(app).get('/privado')).status, 401)
    const respuesta = await request(app).get('/privado').set('Authorization', 'Bearer bueno')
    assert.deepEqual(respuesta.body, { usuario: 1 })
  })

  it('responde 404 en rutas que no existen', async () => {
    const respuesta = await request(app).get('/nada')
    assert.equal(respuesta.status, 404)
    assert.equal(respuesta.body.error, 'Ruta no encontrada: GET /nada')
  })

  it('convierte errores inesperados en 500 y JSON inválido en 400', async () => {
    const consola = mock.method(console, 'error', () => {})
    assert.equal((await request(app).get('/falla')).status, 500)
    consola.mock.restore()
    const respuesta = await request(app).post('/health').set('Content-Type', 'application/json').send('{malo')
    assert.equal(respuesta.status, 400)
  })

  it('confía en el proxy cuando TRUST_PROXY > 0', () => {
    process.env.TRUST_PROXY = '1'
    try {
      const conProxy = crearApp({ nombre: 'p', verificarSesion: async () => null, rutas: () => {} })
      assert.equal(conProxy.get('trust proxy'), 1)
    } finally {
      delete process.env.TRUST_PROXY
    }
  })
})

describe('iniciarServidor', () => {
  afterEach(() => mock.restoreAll())

  it('escucha en el puerto y al recibir SIGTERM cierra el servidor y la BD', async () => {
    const log = mock.method(console, 'log', () => {})
    const salida = new Promise((resolver) => mock.method(process, 'exit', resolver))
    const pool = { end: mock.fn(async () => {}) }
    const antes = process.listeners('SIGTERM').length

    const servidor = iniciarServidor({ nombre: 'prueba', app: crearApp({ nombre: 'prueba', verificarSesion: async () => null, rutas: () => {} }), puerto: 0, pool })
    await new Promise((resolver) => servidor.once('listening', resolver))
    assert.match(log.mock.calls[0].arguments[0], /\[prueba\] escuchando en http:\/\/localhost:0/)

    const detener = process.listeners('SIGTERM').at(-1)
    assert.equal(process.listeners('SIGTERM').length, antes + 1)
    detener()
    assert.equal(await salida, 0)
    assert.equal(pool.end.mock.callCount(), 1)
    process.removeListener('SIGTERM', detener)
    process.removeListener('SIGINT', detener)
  })
})
