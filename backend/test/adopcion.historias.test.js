// HU-14 · Historias de adopciones exitosas
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { PERSONAL, crearEntorno, idPerro } from './utilidades/entorno.js'

const ADMINISTRADOR = 'admin@peluchin.test'
const VETERINARIO = 'andres.ramirez@peluchin.test'
const FOTO = 'https://images.dog.ceo/breeds/beagle/n02088364_11136.jpg'

describe('Servicio de Adopción · historias de adopciones exitosas (HU-14)', () => {
  let entorno, api, publico, rocky, toby, enProceso

  // Adopción de un perro de los datos de prueba hasta el estado indicado.
  const adopcion = async (perro, telefono, { aprobar, entregar } = {}) => {
    const creada = await api.post('/adopciones').send({
      perro_id: await idPerro(entorno.pool, perro),
      adoptante: { nombre_completo: 'Laura Quispe', telefono, direccion: 'Calle 1, La Paz' },
      fecha_solicitud: '2026-10-01',
    })
    assert.equal(creada.status, 201, JSON.stringify(creada.body))
    if (aprobar) {
      const aprobada = await api.patch(`/adopciones/${creada.body.id}/estado`).send({ estado: 'aprobada', fecha: '2026-10-05' })
      assert.equal(aprobada.status, 200, JSON.stringify(aprobada.body))
    }
    if (entregar) {
      const entregada = await api.patch(`/adopciones/${creada.body.id}/estado`).send({ estado: 'finalizada', fecha: '2026-10-10' })
      assert.equal(entregada.status, 200, JSON.stringify(entregada.body))
    }
    return creada.body.id
  }

  const historia = (solicitudId, cambios = {}) => ({
    solicitud_id: solicitudId,
    titulo: 'Toby ya tiene familia',
    relato: 'Toby duerme en el sillón y sale a pasear todas las tardes.',
    foto_url: FOTO,
    fecha_publicacion: '2026-10-20',
    ...cambios,
  })

  before(async () => {
    entorno = await crearEntorno()
    // El entorno deja al administrador sin contraseña; aquí se le asigna la misma que al resto.
    await entorno.pool.query(
      'update usuarios set password_hash = (select password_hash from usuarios where correo = $2) where correo = $1',
      [ADMINISTRADOR, PERSONAL],
    )
    api = entorno.api('adopcion', await entorno.iniciarSesion(ADMINISTRADOR))
    publico = request(entorno.apps.adopcion)
    // Rocky: adopción finalizada en los datos de prueba, ya con su historia publicada.
    rocky = (
      await entorno.pool.query("select id from solicitudes_adopcion where perro_id = $1 and estado = 'finalizada'", [
        await idPerro(entorno.pool, 'Rocky'),
      ])
    ).rows[0].id
    toby = await adopcion('Toby', '70012345', { aprobar: true, entregar: true })
    enProceso = await adopcion('Luna', '70054321')
  })
  after(() => entorno.cerrar())

  describe('Publicar', () => {
    it('lista las adopciones finalizadas que aún no tienen historia', async () => {
      const respuesta = await api.get('/historias/candidatas')
      assert.equal(respuesta.status, 200)
      const ids = respuesta.body.adopciones.map((a) => a.solicitud_id)
      assert.ok(ids.includes(toby))
      assert.ok(!ids.includes(rocky), 'Rocky ya tiene historia')
      assert.ok(!ids.includes(enProceso), 'solo adopciones finalizadas')
      const candidata = respuesta.body.adopciones.find((a) => a.solicitud_id === toby)
      assert.equal(candidata.perro_nombre, 'Toby')
      assert.equal(candidata.fecha_adopcion, '2026-10-10')
    })

    it('valida título, relato y foto (400 por campo)', async () => {
      const casos = [
        [{ titulo: '  ' }, 'titulo'],
        [{ relato: '' }, 'relato'],
        [{ relato: 'x'.repeat(2001) }, 'relato'],
        [{ foto_url: undefined }, 'foto_url'],
        [{ foto_url: 'C:\\fotos\\toby.jpg' }, 'foto_url'],
        [{ fecha_publicacion: '2026-10-09' }, 'fecha_publicacion'],
        [{ fecha_publicacion: '2999-01-01' }, 'fecha_publicacion'],
      ]
      for (const [cambios, campo] of casos) {
        const respuesta = await api.post('/historias').send(historia(toby, cambios))
        assert.equal(respuesta.status, 400, JSON.stringify(cambios))
        assert.equal(respuesta.body.detalles[0].campo, campo, JSON.stringify(cambios))
      }
    })

    it('solo de adopciones finalizadas (409) y existentes (400)', async () => {
      const enCurso = await api.post('/historias').send(historia(enProceso))
      assert.equal(enCurso.status, 409)
      assert.match(enCurso.body.error, /finalizadas/)
      const inexistente = await api.post('/historias').send(historia(999999))
      assert.equal(inexistente.status, 400)
      assert.equal(inexistente.body.detalles[0].campo, 'solicitud_id')
    })

    it('publica la historia con foto y texto ligada a la adopción, visible por defecto', async () => {
      const respuesta = await api.post('/historias').send(historia(toby))
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      const h = respuesta.body
      assert.equal(h.solicitud_id, toby)
      assert.equal(h.perro_nombre, 'Toby')
      assert.equal(h.adoptante_nombre, 'Laura Quispe')
      assert.equal(h.titulo, 'Toby ya tiene familia')
      assert.equal(h.foto_url, FOTO)
      assert.equal(h.fecha_publicacion, '2026-10-20')
      assert.equal(h.visible, true)
      assert.equal(h.publicado_por_nombre, 'Patricia Gómez')
    })

    it('una sola historia por adopción (409)', async () => {
      const respuesta = await api.post('/historias').send(historia(toby, { titulo: 'Otra vez Toby' }))
      assert.equal(respuesta.status, 409)
      assert.match(respuesta.body.error, /ya tiene una historia/)
      const candidatas = await api.get('/historias/candidatas')
      assert.ok(!candidatas.body.adopciones.some((a) => a.solicitud_id === toby))
    })
  })

  describe('Sección pública', () => {
    it('muestra las historias visibles, de la más reciente a la más antigua, sin sesión', async () => {
      const respuesta = await publico.get('/publico/historias')
      assert.equal(respuesta.status, 200)
      assert.deepEqual(
        respuesta.body.historias.map((h) => h.perro_nombre),
        ['Toby', 'Rocky'],
      )
      const fechas = respuesta.body.historias.map((h) => h.fecha_publicacion)
      assert.deepEqual(fechas, [...fechas].sort().reverse())
    })

    it('no expone datos del adoptante ni del personal', async () => {
      const { body } = await publico.get('/publico/historias')
      for (const h of body.historias) {
        assert.deepEqual(Object.keys(h).sort(), ['fecha_adopcion', 'fecha_publicacion', 'foto_url', 'id', 'perro_nombre', 'relato', 'titulo'])
      }
    })
  })

  describe('Editar, ocultar y volver a mostrar', () => {
    let id

    before(async () => {
      id = (await api.get('/historias')).body.historias.find((h) => h.solicitud_id === toby).id
    })

    it('edita el relato sin cambiar lo demás', async () => {
      const respuesta = await api.patch(`/historias/${id}`).send({ relato: 'Toby aprendió a dar la pata.' })
      assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
      assert.equal(respuesta.body.relato, 'Toby aprendió a dar la pata.')
      assert.equal(respuesta.body.titulo, 'Toby ya tiene familia')
      assert.equal(respuesta.body.visible, true)
    })

    it('rechaza cambios vacíos o inválidos (400)', async () => {
      assert.equal((await api.patch(`/historias/${id}`).send({})).status, 400)
      assert.equal((await api.patch(`/historias/${id}`).send({ visible: 'no' })).status, 400)
      assert.equal((await api.patch(`/historias/${id}`).send({ foto_url: 'foto.jpg' })).status, 400)
      assert.equal((await api.patch(`/historias/${id}`).send({ fecha_publicacion: '2026-10-01' })).status, 400)
      assert.equal((await api.patch('/historias/999999').send({ visible: false })).status, 404)
    })

    it('ocultarla la quita de la sección pública sin borrarla', async () => {
      const respuesta = await api.patch(`/historias/${id}`).send({ visible: false })
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.visible, false)

      const publicas = await publico.get('/publico/historias')
      assert.deepEqual(publicas.body.historias.map((h) => h.perro_nombre), ['Rocky'])

      // Sigue en el panel interno y se puede filtrar por visible.
      const internas = await api.get('/historias')
      assert.ok(internas.body.historias.some((h) => h.id === id && !h.visible))
      const ocultas = await api.get('/historias?visible=false')
      assert.deepEqual(ocultas.body.historias.map((h) => h.id), [id])
      assert.equal((await api.get('/historias?visible=quizas')).status, 400)
      assert.equal((await api.get(`/historias/${id}`)).status, 200)
    })

    it('se puede volver a mostrar', async () => {
      assert.equal((await api.patch(`/historias/${id}`).send({ visible: true })).status, 200)
      const publicas = await publico.get('/publico/historias')
      assert.ok(publicas.body.historias.some((h) => h.id === id))
    })
  })

  describe('Permisos', () => {
    it('solo la administración gestiona las historias (403 al resto)', async () => {
      for (const correo of [PERSONAL, VETERINARIO]) {
        const otro = entorno.api('adopcion', await entorno.iniciarSesion(correo))
        assert.equal((await otro.get('/historias')).status, 403, correo)
        assert.equal((await otro.get('/historias/candidatas')).status, 403, correo)
        assert.equal((await otro.post('/historias').send(historia(toby))).status, 403, correo)
        assert.equal((await otro.patch('/historias/1').send({ visible: false })).status, 403, correo)
      }
    })

    it('sin sesión solo se ve la sección pública (401)', async () => {
      assert.equal((await publico.get('/historias')).status, 401)
      assert.equal((await publico.get('/publico/historias')).status, 200)
    })
  })
})
