// Pruebas unitarias · Servicio de Autenticación (HU-07: login, registro, bloqueo y sesiones).
// El repositorio de usuarios es un doble: no se toca la base de datos.
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { crearAuthService } from '../../services/autenticacion/src/services/auth.service.js'
import { crearAlmacenSesiones } from '../../services/autenticacion/src/services/sesiones.js'
import { argumentos, devuelve, rechazaCon } from './utilidades/dobles.js'

// Costo 4 en vez de 10: el mismo algoritmo, pero la prueba corre en milisegundos.
const HASH = bcrypt.hashSync('secreta123', 4)
const bloqueo = { maxIntentos: 3, minutosBloqueo: 5 }

const usuarioBase = (cambios = {}) => ({
  id: 1,
  nombre_completo: 'Ana Pérez',
  correo: 'ana@huellas.bo',
  rol: 'administrador',
  password_hash: HASH,
  activo: true,
  intentos_fallidos: 0,
  bloqueado_hasta: null,
  bloqueado: false,
  ...cambios,
})

function armar(usuario = usuarioBase(), intento = { bloqueado: false, intentos_fallidos: 1 }) {
  const usuarios = {
    buscarPorCorreo: devuelve(usuario),
    registrarIntentoFallido: devuelve(intento),
    reiniciarIntentos: devuelve(undefined),
    crear: mock.fn(async (datos) => ({ id: 9, ...datos })),
  }
  const sesiones = { crear: mock.fn(() => ({ token: 'tok', expira: '2026-11-15T18:00:00.000Z' })), eliminar: mock.fn() }
  return { usuarios, sesiones, servicio: crearAuthService({ usuarios, sesiones, bloqueo }) }
}

describe('Autenticación · iniciarSesion', () => {
  it('con credenciales correctas devuelve token y el usuario sin su contraseña', async () => {
    const { servicio, usuarios, sesiones } = armar()
    const resultado = await servicio.iniciarSesion({ correo: '  ANA@huellas.bo ', contrasena: 'secreta123' })
    assert.deepEqual(argumentos(usuarios.buscarPorCorreo), ['ana@huellas.bo']) // correo normalizado
    assert.equal(resultado.token, 'tok')
    assert.deepEqual(resultado.usuario, { id: 1, nombre_completo: 'Ana Pérez', correo: 'ana@huellas.bo', rol: 'administrador' })
    assert.equal('password_hash' in argumentos(sesiones.crear)[0], false)
    assert.equal(usuarios.reiniciarIntentos.mock.callCount(), 0)
  })

  it('al entrar bien reinicia los intentos fallidos anteriores', async () => {
    const { servicio, usuarios } = armar(usuarioBase({ intentos_fallidos: 2 }))
    await servicio.iniciarSesion({ correo: 'ana@huellas.bo', contrasena: 'secreta123' })
    assert.deepEqual(argumentos(usuarios.reiniciarIntentos), [1])
  })

  it('exige correo y contraseña', async () => {
    const { servicio } = armar()
    await rechazaCon(servicio.iniciarSesion({}), 400, { campos: ['correo', 'contrasena'] })
  })

  it('con la cuenta bloqueada responde 429 con los minutos restantes', async () => {
    const { servicio } = armar(usuarioBase({ bloqueado: true, minutos_bloqueo: 4 }))
    await rechazaCon(servicio.iniciarSesion({ correo: 'ana@huellas.bo', contrasena: 'secreta123' }), 429, {
      mensaje: /vuelve a intentarlo en 4 minutos/,
    })
  })

  it('usa "minuto" en singular cuando falta 1', async () => {
    const { servicio } = armar(usuarioBase({ bloqueado: true, minutos_bloqueo: 1 }))
    await rechazaCon(servicio.iniciarSesion({ correo: 'ana@huellas.bo', contrasena: 'x' }), 429, { mensaje: /en 1 minuto\./ })
  })

  it('correo inexistente → 401 genérico, sin registrar intentos', async () => {
    const { servicio, usuarios } = armar(null)
    await rechazaCon(servicio.iniciarSesion({ correo: 'nadie@huellas.bo', contrasena: 'x' }), 401, {
      mensaje: /^Usuario o contraseña incorrectos\.$/,
    })
    assert.equal(usuarios.registrarIntentoFallido.mock.callCount(), 0)
  })

  it('contraseña incorrecta → 401 y registra el intento fallido', async () => {
    const { servicio, usuarios } = armar()
    await rechazaCon(servicio.iniciarSesion({ correo: 'ana@huellas.bo', contrasena: 'mala' }), 401, {
      mensaje: /^Usuario o contraseña incorrectos\.$/,
    })
    assert.deepEqual(argumentos(usuarios.registrarIntentoFallido), [1, bloqueo])
  })

  it('avisa cuando queda un solo intento antes del bloqueo', async () => {
    const { servicio } = armar(usuarioBase(), { bloqueado: false, intentos_fallidos: 2 })
    await rechazaCon(servicio.iniciarSesion({ correo: 'ana@huellas.bo', contrasena: 'mala' }), 401, {
      mensaje: /Te queda 1 intento.*bloqueará por 5 minutos/,
    })
  })

  it('bloquea la cuenta al llegar al máximo de intentos (429)', async () => {
    const { servicio } = armar(usuarioBase(), { bloqueado: true, intentos_fallidos: 3 })
    await rechazaCon(servicio.iniciarSesion({ correo: 'ana@huellas.bo', contrasena: 'mala' }), 429, { mensaje: /5 minutos/ })
  })

  it('una cuenta inactiva o sin contraseña no entra aunque la clave coincida', async () => {
    for (const usuario of [usuarioBase({ activo: false }), usuarioBase({ password_hash: null })]) {
      const { servicio, usuarios } = armar(usuario)
      await rechazaCon(servicio.iniciarSesion({ correo: 'ana@huellas.bo', contrasena: 'secreta123' }), 401)
      assert.equal(usuarios.registrarIntentoFallido.mock.callCount(), 0)
    }
  })
})

describe('Autenticación · registrar', () => {
  const nuevo = { nombre_completo: 'Luis Rojas', correo: 'Luis@Huellas.bo', contrasena: 'clave-segura' }

  it('crea la cuenta como responsable de adopciones aunque pida otro rol', async () => {
    const { servicio, usuarios } = armar(null)
    const resultado = await servicio.registrar({ ...nuevo, rol: 'administrador' })
    const [datos, hash] = argumentos(usuarios.crear)
    assert.equal(datos.rol, 'responsable_adopciones')
    assert.equal(datos.correo, 'luis@huellas.bo')
    assert.ok(await bcrypt.compare('clave-segura', hash), 'la contraseña se guarda como hash bcrypt')
    assert.notEqual(hash, 'clave-segura')
    assert.equal(resultado.token, 'tok')
    assert.equal(resultado.usuario.rol, 'responsable_adopciones')
  })

  it('rechaza un correo ya registrado con 409', async () => {
    const { servicio, usuarios } = armar(usuarioBase())
    await rechazaCon(servicio.registrar(nuevo), 409, { campos: ['correo'] })
    assert.equal(usuarios.crear.mock.callCount(), 0)
  })

  it('valida nombre, formato de correo y largo de la contraseña', async () => {
    const { servicio } = armar(null)
    await rechazaCon(servicio.registrar({ correo: 'no-es-correo', contrasena: '123' }), 400, {
      campos: ['nombre_completo', 'correo', 'contrasena'],
    })
    await rechazaCon(servicio.registrar({ ...nuevo, contrasena: 'x'.repeat(73) }), 400, {
      mensaje: /Datos inválidos/,
      campos: ['contrasena'],
    })
  })
})

describe('Autenticación · cerrarSesion', () => {
  it('elimina el token del almacén de sesiones', () => {
    const { servicio, sesiones } = armar()
    servicio.cerrarSesion('tok')
    assert.deepEqual(argumentos(sesiones.eliminar), ['tok'])
  })
})

describe('Almacén de sesiones en memoria', () => {
  beforeEach(() => mock.timers.enable({ apis: ['Date'], now: 0 }))
  afterEach(() => mock.timers.reset())

  it('crea un token aleatorio con su fecha de expiración', () => {
    const sesiones = crearAlmacenSesiones({ duracionMs: 1000 })
    const { token, expira } = sesiones.crear({ id: 1 })
    assert.match(token, /^[A-Za-z0-9_-]{43}$/) // 32 bytes en base64url
    assert.equal(expira, new Date(1000).toISOString())
    assert.notEqual(sesiones.crear({ id: 1 }).token, token)
  })

  it('devuelve el usuario de un token vigente y null de uno desconocido', () => {
    const sesiones = crearAlmacenSesiones({ duracionMs: 1000 })
    const { token } = sesiones.crear({ id: 7 })
    assert.deepEqual(sesiones.obtener(token), { id: 7 })
    assert.equal(sesiones.obtener('inventado'), null)
  })

  it('el token deja de valer al expirar o al cerrar sesión', () => {
    const sesiones = crearAlmacenSesiones({ duracionMs: 1000 })
    const expirado = sesiones.crear({ id: 1 }).token
    const cerrado = sesiones.crear({ id: 2 }).token
    sesiones.eliminar(cerrado)
    assert.equal(sesiones.obtener(cerrado), null)
    mock.timers.tick(1000)
    assert.equal(sesiones.obtener(expirado), null)
  })

  it('al crear una sesión nueva purga las expiradas', () => {
    const sesiones = crearAlmacenSesiones({ duracionMs: 1000 })
    const viejo = sesiones.crear({ id: 1 }).token
    mock.timers.tick(1500)
    const nuevo = sesiones.crear({ id: 2 }).token
    assert.equal(sesiones.obtener(viejo), null)
    assert.deepEqual(sesiones.obtener(nuevo), { id: 2 })
  })
})
