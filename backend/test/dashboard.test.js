// HU-13 (RF-03) y HU-14 (RF-04)
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PERSONAL, crearEntorno, idPerro } from './utilidades/entorno.js'

const ADMINISTRADOR = 'admin@peluchin.test'
const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Dashboard', () => {
  let entorno, dashboard, adopcion

  before(async () => {
    entorno = await crearEntorno()
    // El entorno deja al administrador sin contraseña; aquí se le asigna la misma que al resto.
    await entorno.pool.query(
      'update usuarios set password_hash = (select password_hash from usuarios where correo = $2) where correo = $1',
      [ADMINISTRADOR, PERSONAL],
    )
    const token = await entorno.iniciarSesion(ADMINISTRADOR)
    dashboard = entorno.api('dashboard', token)
    adopcion = entorno.api('adopcion', token)
  })
  after(() => entorno.cerrar())

  // Fecha de hoy según la BD, la misma que usa el dashboard para "este mes".
  async function hoyBd() {
    return (await entorno.pool.query("select to_char(current_date, 'YYYY-MM-DD') as hoy")).rows[0].hoy
  }

  describe('Acceso', () => {
    it('solo el rol administrador puede verlo; el resto recibe 403', async () => {
      for (const correo of [PERSONAL, VETERINARIO]) {
        const otro = entorno.api('dashboard', await entorno.iniciarSesion(correo))
        for (const ruta of ['/resumen', '/perros-en-tratamiento', '/adopciones-por-mes']) {
          const respuesta = await otro.get(ruta)
          assert.equal(respuesta.status, 403, `${correo} ${ruta}`)
          assert.ok(respuesta.body.error)
        }
      }
    })

    it('sin sesión responde 401', async () => {
      const respuesta = await entorno.api('dashboard', 'token-invalido').get('/resumen')
      assert.equal(respuesta.status, 401)
    })
  })

  describe('HU-13 · Indicadores', () => {
    it('devuelve el total y la cantidad por cada uno de los 4 estados', async () => {
      const respuesta = await dashboard.get('/resumen')
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, 8)
      const cantidades = Object.fromEntries(respuesta.body.por_estado.map((e) => [e.codigo, e.cantidad]))
      assert.deepEqual(cantidades, { disponible: 4, en_tratamiento: 2, en_adopcion: 1, adoptado: 1 })
    })

    it('devuelve los cinco indicadores principales con los datos de la BD', async () => {
      const { indicadores } = (await dashboard.get('/resumen')).body
      // 8 perros menos Rocky (adoptado); la única adopción finalizada es de 2023; Bella tiene una solicitud en proceso.
      assert.deepEqual(indicadores, {
        en_albergue: 7,
        disponibles: 4,
        en_tratamiento: 2,
        adopciones_mes: 0,
        solicitudes_pendientes: 1,
      })
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
      assert.equal(resumen.indicadores.en_albergue, 8)
      assert.equal(resumen.indicadores.disponibles, 5)
    })

    it('solicitudes pendientes y adopciones del mes siguen el proceso de adopción', async () => {
      const hoy = await hoyBd()
      const indicadores = async () => (await dashboard.get('/resumen')).body.indicadores
      const antes = await indicadores()

      const creada = await adopcion.post('/adopciones').send({
        perro_id: await idPerro(entorno.pool, 'Luna'),
        adoptante: { nombre_completo: 'Laura Ríos', telefono: '3001112233', direccion: 'Calle 1 #2-3' },
        fecha_solicitud: hoy,
      })
      assert.equal(creada.status, 201)
      assert.equal((await indicadores()).solicitudes_pendientes, antes.solicitudes_pendientes + 1)

      await adopcion.patch(`/adopciones/${creada.body.id}/estado`).send({ estado: 'aprobada', fecha: hoy })
      assert.equal((await indicadores()).solicitudes_pendientes, antes.solicitudes_pendientes + 1)

      await adopcion.patch(`/adopciones/${creada.body.id}/estado`).send({ estado: 'finalizada', fecha: hoy })
      const despues = await indicadores()
      assert.equal(despues.solicitudes_pendientes, antes.solicitudes_pendientes)
      assert.equal(despues.adopciones_mes, antes.adopciones_mes + 1)
      assert.equal(despues.en_albergue, antes.en_albergue - 1)
      assert.equal(despues.disponibles, antes.disponibles - 1)
    })
  })

  describe('HU-13 · Adopciones por mes', () => {
    it('devuelve los últimos 12 meses en orden, terminando en el actual, con el conteo de finalizadas', async () => {
      const respuesta = await dashboard.get('/adopciones-por-mes')
      assert.equal(respuesta.status, 200)
      const { meses } = respuesta.body
      assert.equal(meses.length, 12)
      assert.equal(meses.at(-1).mes, (await hoyBd()).slice(0, 7))
      for (let i = 1; i < meses.length; i++) assert.ok(meses[i - 1].mes < meses[i].mes)
      // Solo la adopción finalizada en la prueba anterior cae en estos 12 meses (la de Rocky es de 2023).
      assert.equal(meses.at(-1).cantidad, 1)
      assert.equal(meses.reduce((suma, m) => suma + m.cantidad, 0), 1)
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
