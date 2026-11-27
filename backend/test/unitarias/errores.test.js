// Pruebas unitarias · manejador de errores común (shared/errores.js).
// Se usa un "doble" de `res` (objeto falso) en lugar de un servidor Express real.
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { manejadorErrores, noEncontrado, solicitudInvalida } from '../../shared/src/errores.js'

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
})
