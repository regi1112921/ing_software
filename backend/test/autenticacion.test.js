// HU-02 (RF-01) y HU-03 (RF-02)
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { CONTRASENA, PERSONAL, crearEntorno } from './utilidades/entorno.js'

describe('Servicio de Autenticación', () => {
  let entorno
  before(async () => { entorno = await crearEntorno() })
  after(() => entorno.cerrar())

  const login = (cuerpo) => request(entorno.apps.autenticacion).post('/auth/login').send(cuerpo)

  describe('HU-02 · Iniciar sesión', () => {
    it('con correo y contraseña válidos entrega un token y los datos públicos del usuario', async () => {
      const respuesta = await login({ correo: PERSONAL, contrasena: CONTRASENA })
      assert.equal(respuesta.status, 200)
      assert.ok(respuesta.body.token.length >= 40)
      assert.equal(respuesta.body.usuario.correo, PERSONAL)
      assert.equal(respuesta.body.usuario.rol, 'personal')
      assert.equal(respuesta.body.usuario.password_hash, undefined)
    })

    it('el correo no distingue mayúsculas ni espacios', async () => {
      const respuesta = await login({ correo: '  Maria.Alvarado@PELUCHIN.test ', contrasena: CONTRASENA })
      assert.equal(respuesta.status, 200)
    })

    it('contraseña incorrecta y correo inexistente dan el mismo mensaje genérico', async () => {
      const malaContrasena = await login({ correo: PERSONAL, contrasena: 'otra-cosa' })
      const sinUsuario = await login({ correo: 'nadie@peluchin.test', contrasena: CONTRASENA })
      assert.equal(malaContrasena.status, 401)
      assert.equal(sinUsuario.status, 401)
      assert.equal(malaContrasena.body.error, 'Usuario o contraseña incorrectos.')
      assert.equal(sinUsuario.body.error, malaContrasena.body.error)
    })

    it('un usuario desactivado no puede iniciar sesión', async () => {
      const respuesta = await login({ correo: 'inactivo@peluchin.test', contrasena: CONTRASENA })
      assert.equal(respuesta.status, 401)
    })

    it('un usuario sin contraseña asignada no puede iniciar sesión', async () => {
      const respuesta = await login({ correo: 'admin@peluchin.test', contrasena: CONTRASENA })
      assert.equal(respuesta.status, 401)
    })

    it('sin correo o contraseña responde 400 indicando el campo', async () => {
      const respuesta = await login({ correo: PERSONAL })
      assert.equal(respuesta.status, 400)
      assert.deepEqual(respuesta.body.detalles.map((d) => d.campo), ['contrasena'])
    })

    it('sin sesión, los demás servicios responden 401', async () => {
      for (const [servicio, ruta] of [['adopcion', '/perros'], ['veterinaria', '/veterinarios'], ['dashboard', '/resumen']]) {
        const sinToken = await request(entorno.apps[servicio]).get(ruta)
        const tokenFalso = await request(entorno.apps[servicio]).get(ruta).set('authorization', 'Bearer inventado')
        assert.equal(sinToken.status, 401, `${servicio} sin token`)
        assert.equal(tokenFalso.status, 401, `${servicio} con token falso`)
      }
    })
  })

  describe('HU-03 · Cerrar sesión', () => {
    it('después de cerrar sesión el token deja de valer en todos los servicios', async () => {
      const token = await entorno.iniciarSesion()
      assert.equal((await entorno.api('adopcion', token).get('/perros')).status, 200)

      const cierre = await entorno.api('autenticacion', token).post('/auth/logout')
      assert.equal(cierre.status, 204)

      assert.equal((await entorno.api('autenticacion', token).get('/auth/sesion')).status, 401)
      assert.equal((await entorno.api('adopcion', token).get('/perros')).status, 401)
      assert.equal((await entorno.api('veterinaria', token).get('/veterinarios')).status, 401)
      assert.equal((await entorno.api('dashboard', token).get('/resumen')).status, 401)
    })

    it('cerrar una sesión no afecta a otras sesiones abiertas', async () => {
      const primera = await entorno.iniciarSesion()
      const segunda = await entorno.iniciarSesion()
      await entorno.api('autenticacion', primera).post('/auth/logout')
      assert.equal((await entorno.api('adopcion', segunda).get('/perros')).status, 200)
    })

    it('GET /auth/sesion devuelve el usuario conectado (nombre y rol para el menú)', async () => {
      const token = await entorno.iniciarSesion()
      const respuesta = await entorno.api('autenticacion', token).get('/auth/sesion')
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.usuario.nombre_completo, 'María Alvarado')
      assert.equal(respuesta.body.usuario.rol, 'personal')
    })
  })
})
