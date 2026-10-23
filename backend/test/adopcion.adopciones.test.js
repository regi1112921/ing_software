// HU-10 (RF-13, RF-14, RF-19), HU-11 (RF-15, RF-16), HU-12 (RF-17, RF-18, RF-19, RF-20)
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearEntorno, idPerro } from './utilidades/entorno.js'

describe('Servicio de Adopción · adopciones', () => {
  let entorno, api

  before(async () => {
    entorno = await crearEntorno()
    api = entorno.api('adopcion', await entorno.iniciarSesion())
  })
  after(() => entorno.cerrar())

  const estadoPerro = async (id) => (await api.get(`/perros/${id}`)).body.estado

  const nuevaAdopcion = (perroId, cambios = {}) => ({
    perro_id: perroId,
    adoptante: { nombre_completo: 'Laura Quispe', telefono: '700 123 45', direccion: 'Calle 1, La Paz' },
    fecha_solicitud: '2026-10-01',
    ...cambios,
  })

  describe('HU-11 · Consultar adopciones', () => {
    it('lista con perro, adoptante, teléfono, fecha y estado, de la más reciente a la más antigua', async () => {
      const respuesta = await api.get('/adopciones')
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, 3)
      const fechas = respuesta.body.adopciones.map((a) => a.fecha_solicitud)
      assert.deepEqual(fechas, [...fechas].sort().reverse())
      const primera = respuesta.body.adopciones[0]
      assert.equal(primera.perro.nombre, 'Bella')
      assert.equal(primera.adoptante.telefono, '71234567')
      assert.equal(primera.estado_nombre, 'En proceso')
    })

    it('el detalle trae fechas de cada etapa y las transiciones permitidas', async () => {
      const finalizada = (await api.get('/adopciones')).body.adopciones.find((a) => a.estado === 'finalizada')
      const respuesta = await api.get(`/adopciones/${finalizada.id}`)
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.perro.nombre, 'Rocky')
      assert.equal(respuesta.body.fecha_aprobacion, '2023-12-05')
      assert.equal(respuesta.body.fecha_adopcion, '2023-12-15')
      assert.deepEqual(respuesta.body.transiciones_permitidas, [])
    })

    it('adopción inexistente → 404', async () => {
      assert.equal((await api.get('/adopciones/99999')).status, 404)
    })
  })

  describe('HU-10 · Registrar adopción', () => {
    it('registra En proceso y el perro pasa a En proceso de adopción', async () => {
      const toby = await idPerro(entorno.pool, 'Toby')
      const respuesta = await api.post('/adopciones').send(nuevaAdopcion(toby, { observaciones: 'Casa con patio.' }))
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.estado, 'en_proceso')
      assert.equal(respuesta.body.fecha_solicitud, '2026-10-01')
      assert.equal(respuesta.body.adoptante.telefono, '70012345')
      assert.deepEqual(respuesta.body.transiciones_permitidas, ['aprobada', 'rechazada'])
      assert.equal(await estadoPerro(toby), 'en_adopcion')
    })

    it('solo se puede iniciar para perros Disponibles', async () => {
      for (const nombre of ['Max', 'Bella', 'Rocky']) {
        const respuesta = await api.post('/adopciones').send(nuevaAdopcion(await idPerro(entorno.pool, nombre)))
        assert.equal(respuesta.status, 409, nombre)
        assert.match(respuesta.body.error, /no está disponible/)
      }
    })

    it('si falla, no deja un adoptante creado a medias', async () => {
      const antes = (await entorno.pool.query('select count(*) from adoptantes')).rows[0].count
      await api.post('/adopciones').send(nuevaAdopcion(await idPerro(entorno.pool, 'Max'), {
        adoptante: { nombre_completo: 'No Debe Quedar', telefono: '7000000', direccion: 'X', documento_identidad: 'ZZZ' },
      }))
      const despues = (await entorno.pool.query('select count(*) from adoptantes')).rows[0].count
      assert.equal(despues, antes)
    })

    it('reutiliza al adoptante si el documento ya está registrado', async () => {
      const canela = await idPerro(entorno.pool, 'Canela')
      const respuesta = await api.post('/adopciones').send(nuevaAdopcion(canela, {
        adoptante: { nombre_completo: 'Otro Nombre', telefono: '7000000', direccion: 'Otra', documento_identidad: '6012478' },
      }))
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.adoptante.nombre_completo, 'Ana García López')
    })

    it('valida los datos obligatorios del adoptante y el teléfono', async () => {
      const sinAdoptante = await api.post('/adopciones').send({ perro_id: 1 })
      assert.equal(sinAdoptante.status, 400)
      assert.equal(sinAdoptante.body.detalles[0].campo, 'adoptante')

      const telefono = await api.post('/adopciones').send(nuevaAdopcion(1, {
        adoptante: { nombre_completo: 'A', telefono: '12', direccion: 'B' },
      }))
      assert.equal(telefono.status, 400)
      assert.equal(telefono.body.detalles[0].campo, 'adoptante.telefono')
    })

    it('perro inexistente → 400', async () => {
      const respuesta = await api.post('/adopciones').send(nuevaAdopcion(99999))
      assert.equal(respuesta.status, 400)
    })
  })

  describe('HU-12 · Actualizar estado de una adopción', () => {
    let luna, adopcionId

    before(async () => {
      luna = await idPerro(entorno.pool, 'Luna')
      adopcionId = (await api.post('/adopciones').send(nuevaAdopcion(luna, { fecha_solicitud: '2026-10-02' }))).body.id
    })

    it('no permite saltar de En proceso a Finalizada', async () => {
      const respuesta = await api.patch(`/adopciones/${adopcionId}/estado`).send({ estado: 'finalizada' })
      assert.equal(respuesta.status, 409)
      assert.match(respuesta.body.error, /No se puede pasar/)
    })

    it('rechaza fechas anteriores a la etapa previa', async () => {
      const respuesta = await api.patch(`/adopciones/${adopcionId}/estado`).send({ estado: 'aprobada', fecha: '2026-09-01' })
      assert.equal(respuesta.status, 400)
    })

    it('aprobar guarda la fecha y el perro sigue En proceso de adopción', async () => {
      const respuesta = await api.patch(`/adopciones/${adopcionId}/estado`).send({ estado: 'aprobada', fecha: '2026-10-05' })
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.estado, 'aprobada')
      assert.equal(respuesta.body.fecha_aprobacion, '2026-10-05')
      assert.deepEqual(respuesta.body.transiciones_permitidas, ['finalizada', 'rechazada'])
      assert.equal(await estadoPerro(luna), 'en_adopcion')
    })

    it('finalizar guarda la fecha de adopción y el perro queda Adoptado (RF-18)', async () => {
      const respuesta = await api.patch(`/adopciones/${adopcionId}/estado`).send({ estado: 'finalizada', fecha: '2026-10-10' })
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.fecha_adopcion, '2026-10-10')
      assert.equal(await estadoPerro(luna), 'adoptado')
    })

    it('una adopción finalizada ya no cambia de estado', async () => {
      const respuesta = await api.patch(`/adopciones/${adopcionId}/estado`).send({ estado: 'rechazada' })
      assert.equal(respuesta.status, 409)
    })

    it('rechazar devuelve el perro a Disponible y agrega el motivo a las observaciones (RF-20)', async () => {
      const toby = await idPerro(entorno.pool, 'Toby') // tiene una adopción En proceso creada en HU-10
      const { id, observaciones } = (await api.get(`/perros/${toby}`)).body.adopcion_vigente
      const respuesta = await api.patch(`/adopciones/${id}/estado`).send({ estado: 'rechazada', observaciones: 'No pasó la visita.' })
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.estado, 'rechazada')
      assert.ok(respuesta.body.fecha_rechazo)
      assert.equal(respuesta.body.observaciones, `${observaciones}\n\nNo pasó la visita.`)
      assert.equal(await estadoPerro(toby), 'disponible')
    })

    it('estado desconocido o en_proceso → 400', async () => {
      for (const estado of ['en_proceso', 'perdida']) {
        const respuesta = await api.patch(`/adopciones/${adopcionId}/estado`).send({ estado })
        assert.equal(respuesta.status, 400, estado)
      }
    })
  })
})
