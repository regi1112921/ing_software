// HU-07: cada rol solo accede a los módulos que tiene permitidos.
//
//                         administrador  veterinario  responsable_adopciones
//   Dashboard                  ✔              ✘                ✘
//   Perros (ver/editar)        ✔              ✔                ✔
//   Historial médico (ver)     ✔              ✔                ✔
//   Registrar atención         ✔              ✔                ✘
//   Adopciones                 ✔              ✘                ✔
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PERSONAL, crearEntorno, idPerro } from './utilidades/entorno.js'

const ADMINISTRADOR = 'admin@peluchin.test'
const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('HU-07 · Permisos por rol', () => {
  let entorno, perroConAdopcion, max, andres
  const tokens = {}

  before(async () => {
    entorno = await crearEntorno()
    // El entorno deja al administrador sin contraseña; aquí se le asigna la misma que al resto.
    await entorno.pool.query(
      'update usuarios set password_hash = (select password_hash from usuarios where correo = $2) where correo = $1',
      [ADMINISTRADOR, PERSONAL],
    )
    for (const [rol, correo] of [['administrador', ADMINISTRADOR], ['veterinario', VETERINARIO], ['responsable', PERSONAL]]) {
      tokens[rol] = await entorno.iniciarSesion(correo)
    }
    perroConAdopcion = (
      await entorno.pool.query("select perro_id from solicitudes_adopcion where estado in ('en_proceso', 'aprobada') limit 1")
    ).rows[0].perro_id
    max = await idPerro(entorno.pool, 'Max')
    andres = (await entorno.pool.query('select id from usuarios where correo = $1', [VETERINARIO])).rows[0].id
  })
  after(() => entorno.cerrar())

  const como = (rol, servicio) => entorno.api(servicio, tokens[rol])
  const consulta = () => ({
    perro_id: max,
    veterinario_id: andres,
    motivo: 'Control',
    diagnostico: 'Sano',
    tratamiento: 'Ninguno',
  })

  describe('Veterinario', () => {
    it('no accede al módulo de adopciones (403)', async () => {
      const api = como('veterinario', 'adopcion')
      assert.equal((await api.get('/adopciones')).status, 403)
      assert.equal((await api.get('/adopciones/1')).status, 403)
      assert.equal((await api.post('/adopciones').send({})).status, 403)
      assert.equal((await api.patch('/adopciones/1/estado').send({})).status, 403)
    })

    it('ve los perros, pero sin la adopción vigente (datos del adoptante)', async () => {
      const api = como('veterinario', 'adopcion')
      assert.equal((await api.get('/perros')).status, 200)
      const detalle = await api.get(`/perros/${perroConAdopcion}`)
      assert.equal(detalle.status, 200)
      assert.equal(detalle.body.adopcion_vigente, null)
    })

    it('consulta el historial y registra atenciones', async () => {
      const api = como('veterinario', 'veterinaria')
      assert.equal((await api.get(`/perros/${max}/historial`)).status, 200)
      assert.equal((await api.post('/consultas').send(consulta())).status, 201)
    })
  })

  describe('Responsable de adopciones', () => {
    it('accede a adopciones y ve la adopción vigente del perro', async () => {
      const api = como('responsable', 'adopcion')
      assert.equal((await api.get('/adopciones')).status, 200)
      const detalle = await api.get(`/perros/${perroConAdopcion}`)
      assert.ok(detalle.body.adopcion_vigente)
    })

    it('consulta el historial médico pero no registra atenciones (403)', async () => {
      const api = como('responsable', 'veterinaria')
      assert.equal((await api.get(`/perros/${max}/historial`)).status, 200)
      const respuesta = await api.post('/consultas').send(consulta())
      assert.equal(respuesta.status, 403)
      assert.ok(respuesta.body.error)
    })
  })

  describe('Administrador', () => {
    it('accede a todos los módulos', async () => {
      assert.equal((await como('administrador', 'dashboard').get('/resumen')).status, 200)
      assert.equal((await como('administrador', 'adopcion').get('/adopciones')).status, 200)
      assert.equal((await como('administrador', 'veterinaria').post('/consultas').send(consulta())).status, 201)
    })
  })
})
