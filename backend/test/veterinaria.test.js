// HU-08 (RF-11) y HU-09 (RF-12)
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearEntorno, idPerro } from './utilidades/entorno.js'

describe('Servicio de Veterinaria', () => {
  let entorno, api, max, andres

  before(async () => {
    entorno = await crearEntorno()
    api = entorno.api('veterinaria', await entorno.iniciarSesion('andres.ramirez@peluchin.test'))
    max = await idPerro(entorno.pool, 'Max')
    andres = (await entorno.pool.query("select id from usuarios where correo = 'andres.ramirez@peluchin.test'")).rows[0].id
  })
  after(() => entorno.cerrar())

  const consulta = (cambios = {}) => ({
    perro_id: max,
    veterinario_id: andres,
    fecha: '2026-10-20',
    motivo: 'Control de dermatitis',
    diagnostico: 'Mejoría notable',
    tratamiento: 'Suspender antibiótico',
    ...cambios,
  })

  describe('GET /veterinarios', () => {
    it('lista solo usuarios activos con rol veterinario', async () => {
      const respuesta = await api.get('/veterinarios')
      assert.equal(respuesta.status, 200)
      assert.deepEqual(respuesta.body.veterinarios.map((v) => v.nombre_completo), ['Andrés Ramírez', 'Lucía Torres'])
    })
  })

  describe('HU-08 · Consultar historial médico', () => {
    it('devuelve las atenciones de la más reciente a la más antigua, con el veterinario', async () => {
      const respuesta = await api.get(`/perros/${max}/historial`)
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, 2)
      assert.deepEqual(respuesta.body.consultas.map((c) => c.fecha), ['2024-03-22', '2024-03-15'])
      assert.equal(respuesta.body.consultas[0].veterinario_nombre, 'Andrés Ramírez')
    })

    it('un perro sin atenciones devuelve una lista vacía', async () => {
      const respuesta = await api.get(`/perros/${await idPerro(entorno.pool, 'Canela')}/historial`)
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, 0)
    })

    it('perro inexistente → 404', async () => {
      assert.equal((await api.get('/perros/99999/historial')).status, 404)
    })
  })

  describe('HU-09 · Registrar atención médica', () => {
    it('registra la atención y aparece primera en el historial', async () => {
      const respuesta = await api.post('/consultas').send(consulta({ observaciones: '  ' }))
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.veterinario_nombre, 'Andrés Ramírez')
      assert.equal(respuesta.body.observaciones, null)

      const historial = (await api.get(`/perros/${max}/historial`)).body
      assert.equal(historial.total, 3)
      assert.equal(historial.consultas[0].id, respuesta.body.id)
    })

    it('la fecha es hoy si no se indica', async () => {
      const respuesta = await api.post('/consultas').send(consulta({ fecha: undefined }))
      assert.equal(respuesta.status, 201)
      assert.match(respuesta.body.fecha, /^\d{4}-\d{2}-\d{2}$/)
    })

    it('motivo, diagnóstico y tratamiento vacíos o solo con espacios → 400 por campo', async () => {
      const respuesta = await api.post('/consultas').send(consulta({ motivo: ' ', diagnostico: '', tratamiento: undefined }))
      assert.equal(respuesta.status, 400)
      assert.deepEqual(respuesta.body.detalles.map((d) => d.campo).sort(), ['diagnostico', 'motivo', 'tratamiento'])
    })

    it('el responsable debe ser un veterinario activo y el perro debe existir', async () => {
      const maria = (await entorno.pool.query("select id from usuarios where correo = 'maria.alvarado@peluchin.test'")).rows[0].id
      const respuesta = await api.post('/consultas').send(consulta({ veterinario_id: maria, perro_id: 99999 }))
      assert.equal(respuesta.status, 400)
      assert.deepEqual(respuesta.body.detalles.map((d) => d.campo).sort(), ['perro_id', 'veterinario_id'])
    })
  })
})
