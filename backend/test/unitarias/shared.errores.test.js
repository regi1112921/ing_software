// Pruebas unitarias · manejador de errores común (shared/errores.js).
// Se usa un "doble" de `res` (objeto falso) en lugar de un servidor Express real.
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  ErrorHttp,
  conflicto,
  manejadorErrores,
  noAutenticado,
  noEncontrado,
  prohibido,
  solicitudInvalida,
} from '@huellas/shared'

// res falso: guarda el estado y el cuerpo que el manejador envía.
function resFalso() {
  const res = { estado: null, cuerpo: null }
  res.status = (codigo) => ((res.estado = codigo), res)
  res.json = (cuerpo) => ((res.cuerpo = cuerpo), res)
  return res
}
const req = { method: 'GET', originalUrl: '/prueba' }

describe('manejadorErrores', () => {
  it('responde con el estado y mensaje de un ErrorHttp', () => {
    const res = resFalso()
    manejadorErrores(noEncontrado('El perro no existe.'), req, res)
    assert.equal(res.estado, 404)
    assert.deepEqual(res.cuerpo, { error: 'El perro no existe.' })
  })

  it('incluye los detalles por campo cuando existen', () => {
    const res = resFalso()
    const detalles = [{ campo: 'nombre', mensaje: 'nombre es obligatorio.' }]
    manejadorErrores(solicitudInvalida('Datos inválidos.', detalles), req, res)
    assert.equal(res.estado, 400)
    assert.deepEqual(res.cuerpo.detalles, detalles)
  })

  it('traduce una restricción conocida de PostgreSQL a su mensaje', () => {
    const res = resFalso()
    manejadorErrores({ code: '23505', constraint: 'uq_usuarios_correo' }, req, res)
    assert.equal(res.estado, 409)
    assert.equal(res.cuerpo.error, 'Ya existe una cuenta con ese correo.')
  })

  it('traduce un dato con formato inválido (22P02) a 400', () => {
    const res = resFalso()
    manejadorErrores({ code: '22P02' }, req, res)
    assert.equal(res.estado, 400)
  })

  it('responde 400 si el cuerpo no es JSON válido', () => {
    const res = resFalso()
    manejadorErrores({ type: 'entity.parse.failed' }, req, res)
    assert.equal(res.estado, 400)
  })

  it('oculta errores desconocidos detrás de un 500', () => {
    const res = resFalso()
    const consola = mock.method(console, 'error', () => {}) // silencia el log en la prueba
    manejadorErrores(new Error('detalle interno'), req, res)
    consola.mock.restore()
    assert.equal(res.estado, 500)
    assert.equal(res.cuerpo.error, 'Error interno del servidor.')
    assert.equal(consola.mock.callCount(), 1)
  })

  it('responde 413 si el cuerpo supera el tamaño máximo', () => {
    const res = resFalso()
    manejadorErrores({ type: 'entity.too.large' }, req, res)
    assert.equal(res.estado, 413)
  })

  it('CHECK sin mensaje propio (23514 con restricción) → 400 genérico', () => {
    const res = resFalso()
    manejadorErrores({ code: '23514', constraint: 'ck_desconocida' }, req, res)
    assert.equal(res.estado, 400)
    assert.equal(res.cuerpo.error, 'Los datos no cumplen las reglas del sistema.')
  })

  it('regla de negocio de un trigger (23514 sin restricción) → 409 con su mensaje', () => {
    const res = resFalso()
    manejadorErrores({ code: '23514', message: 'El perro ya fue adoptado.' }, req, res)
    assert.equal(res.estado, 409)
    assert.equal(res.cuerpo.error, 'El perro ya fue adoptado.')
  })

  it('llave foránea (23503) y duplicado sin mensaje propio (23505) → 409', () => {
    const foranea = resFalso()
    manejadorErrores({ code: '23503' }, req, foranea)
    assert.equal(foranea.estado, 409)
    assert.match(foranea.cuerpo.error, /relacionado con otros datos/)

    const duplicado = resFalso()
    manejadorErrores({ code: '23505', constraint: 'uq_desconocida' }, req, duplicado)
    assert.equal(duplicado.estado, 409)
    assert.equal(duplicado.cuerpo.error, 'Ya existe un registro con esos datos.')
  })

  it('formatos inválidos de PostgreSQL (22007, 22008, 22003) → 400', () => {
    for (const code of ['22007', '22008', '22003']) {
      const res = resFalso()
      manejadorErrores({ code }, req, res)
      assert.equal(res.estado, 400, code)
    }
  })

  it('código SQLSTATE sin traducción → 500', () => {
    const res = resFalso()
    const consola = mock.method(console, 'error', () => {})
    manejadorErrores({ code: '42P01', message: 'relation does not exist' }, req, res)
    consola.mock.restore()
    assert.equal(res.estado, 500)
  })
})

describe('fábricas de errores HTTP', () => {
  it('cada una crea el estado correcto con su mensaje por defecto', () => {
    assert.equal(noAutenticado().estado, 401)
    assert.equal(noAutenticado().message, 'Debes iniciar sesión.')
    assert.equal(prohibido().estado, 403)
    assert.match(prohibido().message, /No tienes permiso/)
    assert.equal(conflicto('x').estado, 409)
    assert.equal(noEncontrado('x').estado, 404)
    assert.ok(solicitudInvalida('x') instanceof ErrorHttp)
    assert.ok(solicitudInvalida('x') instanceof Error)
  })
})
