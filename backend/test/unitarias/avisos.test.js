// Pruebas unitarias · HU-13 · utilidades de avisos al adoptante.
// Unitarias = prueban una función aislada: sin base de datos, sin HTTP, sin red.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  enlaceWhatsapp,
  generarAviso,
  telefonoWhatsapp,
} from '../../services/adopcion/src/utils/avisos.js'

describe('telefonoWhatsapp', () => {
  it('antepone el código de país a un número local', () => {
    assert.equal(telefonoWhatsapp('70012345'), '59170012345')
  })

  it('respeta el número que ya trae "+"', () => {
    assert.equal(telefonoWhatsapp('+591 700-12345'), '59170012345')
  })

  it('quita el prefijo internacional 00', () => {
    assert.equal(telefonoWhatsapp('0059170012345'), '59170012345')
  })

  it('no duplica el código si el número ya empieza con 591', () => {
    assert.equal(telefonoWhatsapp('59170012345'), '59170012345')
  })
})

describe('enlaceWhatsapp', () => {
  it('codifica el mensaje en la URL', () => {
    assert.equal(enlaceWhatsapp('59170012345', 'Hola Ana'), 'https://wa.me/59170012345?text=Hola%20Ana')
  })
})

describe('generarAviso', () => {
  const base = {
    adoptante: { nombre_completo: 'Ana Pérez', telefono: '70012345' },
    perro: { nombre: 'Firulais' },
  }

  it('genera aviso de aprobación con el nombre del perro', () => {
    const aviso = generarAviso({ ...base, estado: 'aprobada' })
    assert.equal(aviso.tipo, 'aprobacion')
    assert.equal(aviso.telefono, '59170012345')
    assert.match(aviso.mensaje, /Firulais fue aprobada/)
    assert.ok(aviso.enlace_whatsapp.startsWith('https://wa.me/59170012345?text='))
  })

  it('incluye el motivo en el aviso de rechazo', () => {
    const aviso = generarAviso({ ...base, estado: 'rechazada', motivo_rechazo: 'Vivienda sin patio' })
    assert.equal(aviso.tipo, 'rechazo')
    assert.match(aviso.mensaje, /Motivo: Vivienda sin patio/)
  })

  it('omite la línea de motivo si no hay motivo registrado', () => {
    const aviso = generarAviso({ ...base, estado: 'rechazada' })
    assert.doesNotMatch(aviso.mensaje, /Motivo:/)
  })

  it('devuelve null para estados sin aviso', () => {
    assert.equal(generarAviso({ ...base, estado: 'en_proceso' }), null)
    assert.equal(generarAviso({ ...base, estado: 'finalizada' }), null)
  })
})
