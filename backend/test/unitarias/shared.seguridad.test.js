// Pruebas unitarias · protección de rutas (shared/autenticacion.js) y
// límite de peticiones por IP (shared/limite.js).
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { ROLES, crearExigirSesion, exigirRol, limitarPeticiones, verificadorRemoto } from '@huellas/shared'
import { rechazaCon } from './utilidades/dobles.js'

const peticion = (autorizacion) => ({ get: (cabecera) => (cabecera === 'authorization' ? autorizacion : undefined) })
const usuario = { id: 1, rol: ROLES.administrador }

describe('ROLES', () => {
  it('define los tres roles del sistema y no se puede modificar', () => {
    assert.deepEqual(Object.values(ROLES), ['administrador', 'veterinario', 'responsable_adopciones'])
    assert.ok(Object.isFrozen(ROLES))
  })
})

describe('crearExigirSesion', () => {
  it('sin cabecera Authorization → 401', async () => {
    const exigir = crearExigirSesion(async () => usuario)
    await rechazaCon(exigir(peticion(undefined), {}, () => {}), 401, { mensaje: /Debes iniciar sesión/ })
  })

  it('con un esquema distinto de Bearer o sin token → 401', async () => {
    const exigir = crearExigirSesion(async () => usuario)
    await rechazaCon(exigir(peticion('Basic abc'), {}, () => {}), 401)
    await rechazaCon(exigir(peticion('Bearer'), {}, () => {}), 401)
  })

  it('con un token que el verificador no reconoce → 401 de sesión expirada', async () => {
    const exigir = crearExigirSesion(async () => null)
    await rechazaCon(exigir(peticion('Bearer viejo'), {}, () => {}), 401, { mensaje: /no es válida o ya expiró/ })
  })

  it('con un token válido deja el usuario y el token en req y continúa', async () => {
    const verificar = mock.fn(async () => usuario)
    const siguiente = mock.fn()
    const req = peticion('bearer abc123') // el esquema no distingue mayúsculas
    await crearExigirSesion(verificar)(req, {}, siguiente)
    assert.deepEqual(verificar.mock.calls[0].arguments, ['abc123'])
    assert.equal(req.usuario, usuario)
    assert.equal(req.token, 'abc123')
    assert.equal(siguiente.mock.callCount(), 1)
  })
})

describe('exigirRol', () => {
  it('deja pasar a un rol permitido', () => {
    const siguiente = mock.fn()
    exigirRol(ROLES.administrador, ROLES.veterinario)({ usuario: { rol: 'veterinario' } }, {}, siguiente)
    assert.equal(siguiente.mock.callCount(), 1)
  })

  it('rechaza con 403 a un rol no permitido o sin usuario', async () => {
    const verificar = exigirRol(ROLES.administrador)
    await rechazaCon(() => verificar({ usuario: { rol: 'veterinario' } }, {}, () => {}), 403)
    await rechazaCon(() => verificar({}, {}, () => {}), 403)
  })
})

describe('verificadorRemoto', () => {
  afterEach(() => mock.restoreAll())
  const verificar = verificadorRemoto('http://auth:3004')

  it('pregunta al servicio de autenticación y devuelve el usuario', async () => {
    const fetchFalso = mock.method(globalThis, 'fetch', async () => ({ status: 200, ok: true, json: async () => ({ usuario }) }))
    assert.deepEqual(await verificar('tok'), usuario)
    const [url, opciones] = fetchFalso.mock.calls[0].arguments
    assert.equal(url, 'http://auth:3004/auth/sesion')
    assert.equal(opciones.headers.authorization, 'Bearer tok')
  })

  it('devuelve null si la sesión no es válida (401)', async () => {
    mock.method(globalThis, 'fetch', async () => ({ status: 401, ok: false }))
    assert.equal(await verificar('tok'), null)
  })

  it('responde 503 si el servicio falla o no responde', async () => {
    mock.method(globalThis, 'fetch', async () => ({ status: 500, ok: false }))
    await rechazaCon(verificar('tok'), 503)
    mock.method(globalThis, 'fetch', async () => {
      throw new Error('ECONNREFUSED')
    })
    await rechazaCon(verificar('tok'), 503, { mensaje: /no está disponible/ })
  })
})

describe('limitarPeticiones', () => {
  beforeEach(() => mock.timers.enable({ apis: ['Date'], now: 0 }))
  afterEach(() => mock.timers.reset())

  const resFalso = () => ({ cabeceras: {}, set(nombre, valor) { this.cabeceras[nombre] = valor } })

  it('deja pasar hasta el máximo y luego responde 429 con Retry-After', async () => {
    const limite = limitarPeticiones({ ventanaMs: 60_000, maximo: 2 })
    const siguiente = mock.fn()
    const res = resFalso()
    limite({ ip: '1.1.1.1' }, res, siguiente)
    limite({ ip: '1.1.1.1' }, res, siguiente)
    assert.equal(siguiente.mock.callCount(), 2)
    await rechazaCon(() => limite({ ip: '1.1.1.1' }, res, siguiente), 429, { mensaje: /Demasiadas solicitudes/ })
    assert.equal(res.cabeceras['Retry-After'], '60')
  })

  it('lleva una cuenta separada por IP', () => {
    const limite = limitarPeticiones({ ventanaMs: 60_000, maximo: 1 })
    const siguiente = mock.fn()
    limite({ ip: '1.1.1.1' }, resFalso(), siguiente)
    limite({ ip: '2.2.2.2' }, resFalso(), siguiente)
    limite({}, resFalso(), siguiente) // sin IP cuenta como "desconocida"
    assert.equal(siguiente.mock.callCount(), 3)
  })

  it('reinicia la cuenta cuando pasa la ventana de tiempo', () => {
    const limite = limitarPeticiones({ ventanaMs: 1000, maximo: 1 })
    const siguiente = mock.fn()
    limite({ ip: '1.1.1.1' }, resFalso(), siguiente)
    assert.throws(() => limite({ ip: '1.1.1.1' }, resFalso(), siguiente))
    mock.timers.tick(1000)
    limite({ ip: '1.1.1.1' }, resFalso(), siguiente)
    assert.equal(siguiente.mock.callCount(), 2)
  })

  it('usa el mensaje personalizado', async () => {
    const limite = limitarPeticiones({ ventanaMs: 1000, maximo: 0, mensaje: 'Espera un poco.' })
    await rechazaCon(() => limite({ ip: '1.1.1.1' }, resFalso(), () => {}), 429, { mensaje: /Espera un poco/ })
  })

  it('con más de 10 000 IPs limpia las vencidas y sigue funcionando', () => {
    const limite = limitarPeticiones({ ventanaMs: 1000, maximo: 1 })
    const siguiente = mock.fn()
    for (let i = 0; i <= 10_000; i++) limite({ ip: `ip-${i}` }, resFalso(), siguiente)
    mock.timers.tick(1000)
    limite({ ip: 'ip-0' }, resFalso(), siguiente)
    assert.equal(siguiente.mock.callCount(), 10_002)
  })
})
