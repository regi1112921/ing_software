// HU-13 (RF-03) y HU-14 (RF-04)
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearEntorno } from './utilidades/entorno.js'

describe('Servicio de Dashboard', () => {
  let entorno, dashboard, adopcion

  before(async () => {
    entorno = await crearEntorno()
    const token = await entorno.iniciarSesion()
    dashboard = entorno.api('dashboard', token)
    adopcion = entorno.api('adopcion', token)
  })
  after(() => entorno.cerrar())

  describe('HU-13 · Indicadores', () => {
    it('devuelve el total y la cantidad por cada uno de los 4 estados', async () => {
      const respuesta = await dashboard.get('/resumen')
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, 8)
      const cantidades = Object.fromEntries(respuesta.body.por_estado.map((e) => [e.codigo, e.cantidad]))
      assert.deepEqual(cantidades, { disponible: 4, en_tratamiento: 2, en_adopcion: 1, adoptado: 1 })
    })

    it('cada indicador coincide con el listado filtrado y el total es la suma', async () => {
      const resumen = (await dashboard.get('/resumen')).body
      let suma = 0
      for (const estado of resumen.por_estado) {
        const listado = (await adopcion.get(`/perros?estado=${estado.codigo}`)).body
        assert.equal(listado.total, estado.cantidad, estado.codigo)
        suma += estado.cantidad
      }
      assert.equal(resumen.total, suma)
    })

    it('se actualiza al registrar un perro', async () => {
      const raza = (await entorno.pool.query('select id from razas limit 1')).rows[0].id
      await adopcion.post('/perros').send({ nombre: 'Nuevo', raza_id: raza, sexo: 'hembra', tamano: 'pequeno', fecha_ingreso: '2026-10-01' })
      const resumen = (await dashboard.get('/resumen')).body
      assert.equal(resumen.total, 9)
      assert.equal(resumen.por_estado.find((e) => e.codigo === 'disponible').cantidad, 5)
    })
  })

  describe('HU-14 · Perros en tratamiento', () => {
    it('lista los perros en tratamiento del ingreso más antiguo al más reciente', async () => {
      const respuesta = await dashboard.get('/perros-en-tratamiento')
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, 2)
      assert.deepEqual(respuesta.body.perros.map((p) => p.nombre), ['Max', 'Nina'])
      for (const campo of ['id', 'nombre', 'sexo', 'raza', 'foto_url', 'fecha_ingreso']) {
        assert.ok(campo in respuesta.body.perros[0], campo)
      }
    })
  })
})
