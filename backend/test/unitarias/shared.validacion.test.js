// Pruebas unitarias · validación de entrada (shared/validacion.js).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { campos, hoy, validar, z } from '@huellas/shared'
import { ErrorHttp } from '@huellas/shared'

const esquema = z.object({
  nombre: campos.texto('nombre', 10),
  notas: campos.textoOpcional('notas'),
  fecha: campos.fecha('fecha'),
  perro_id: campos.id('perro_id'),
})

describe('validar', () => {
  it('devuelve los datos limpios cuando son válidos', () => {
    const datos = validar(esquema, { nombre: '  Toby ', notas: '   ', fecha: '2026-10-01', perro_id: '7' })
    assert.deepEqual(datos, { nombre: 'Toby', notas: null, fecha: '2026-10-01', perro_id: 7 })
  })

  it('lanza un ErrorHttp 400 con un detalle por campo inválido', () => {
    assert.throws(
      () => validar(esquema, { nombre: '', fecha: '01/10/2026', perro_id: -1 }),
      (error) => {
        assert.ok(error instanceof ErrorHttp)
        assert.equal(error.estado, 400)
        const camposConError = error.detalles.map((d) => d.campo)
        assert.deepEqual(camposConError.sort(), ['fecha', 'nombre', 'perro_id'])
        return true
      },
    )
  })

  it('rechaza textos más largos que el máximo', () => {
    assert.throws(
      () => validar(esquema, { nombre: 'Nombre demasiado largo', fecha: '2026-10-01', perro_id: 1 }),
      (error) => error.detalles[0].mensaje === 'nombre no puede superar 10 caracteres.',
    )
  })

  it('trata datos nulos como objeto vacío', () => {
    assert.throws(() => validar(esquema, null), ErrorHttp)
  })
})

describe('hoy', () => {
  it('devuelve la fecha en formato AAAA-MM-DD', () => {
    assert.match(hoy(), /^\d{4}-\d{2}-\d{2}$/)
  })
})
