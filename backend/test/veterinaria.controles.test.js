// HU-08 · Alertas de vacunas y controles pendientes
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PERSONAL, crearEntorno, idPerro } from './utilidades/entorno.js'

const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Veterinaria · controles pendientes (HU-08)', () => {
  let entorno, api, andres, perros

  before(async () => {
    entorno = await crearEntorno()
    api = entorno.api('veterinaria', await entorno.iniciarSesion(VETERINARIO))
    andres = (await entorno.pool.query('select id from usuarios where correo = $1', [VETERINARIO])).rows[0].id
    perros = {}
    for (const nombre of ['Toby', 'Luna', 'Max', 'Coco']) perros[nombre] = await idPerro(entorno.pool, nombre)
  })
  after(() => entorno.cerrar())

  // Fecha de la BD desplazada n días (la vista usa current_date).
  const fecha = async (dias = 0) =>
    (await entorno.pool.query('select (current_date + $1::int)::text as f', [dias])).rows[0].f

  const pendientes = async (query = '') => {
    const respuesta = await api.get(`/controles/pendientes${query}`)
    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
    return respuesta.body
  }
  const buscar = (lista, perroId, detalle) =>
    lista.controles.find((c) => c.perro_id === perroId && c.detalle === detalle)

  const vacuna = (cambios = {}) => ({ perro_id: perros.Max, veterinario_id: andres, nombre: 'Leptospirosis', ...cambios })

  describe('Lista de pendientes', () => {
    it('muestra perro, tipo de control y fecha programada, con los vencidos primero y marcados', async () => {
      const lista = await pendientes()
      assert.equal(lista.dias, 30)
      assert.ok(lista.total > 0)
      assert.equal(lista.vencidos, lista.controles.filter((c) => c.vencido).length)

      const toby = buscar(lista, perros.Toby, 'Antirrábica')
      assert.equal(toby.tipo, 'vacuna')
      assert.equal(toby.perro_nombre, 'Toby')
      assert.equal(toby.fecha_programada, '2026-11-01')
      assert.equal(toby.vencido, toby.dias_restantes < 0)

      const externa = buscar(lista, perros.Luna, 'Desparasitación externa')
      assert.equal(externa.tipo, 'desparasitacion')
      assert.equal(externa.vencido, true)

      const fechas = lista.controles.map((c) => c.fecha_programada)
      assert.deepEqual(fechas, [...fechas].sort())
    })

    it('incluye lo que vence dentro del rango de días y no lo que vence después', async () => {
      await api.post('/vacunas').send(vacuna({ nombre: 'Tos de las perreras', fecha_proxima_dosis: await fecha(10) }))
      await api.post('/vacunas').send(vacuna({ nombre: 'Parvovirus', fecha_proxima_dosis: await fecha(60) }))

      const en30 = await pendientes()
      const proxima = buscar(en30, perros.Max, 'Tos de las perreras')
      assert.ok(proxima)
      assert.equal(proxima.vencido, false)
      assert.equal(proxima.dias_restantes, 10)
      assert.equal(buscar(en30, perros.Max, 'Parvovirus'), undefined)

      assert.ok(buscar(await pendientes('?dias=90'), perros.Max, 'Parvovirus'))
    })

    it('un control sin próxima fecha no aparece', async () => {
      // Max tiene Antirrábica sin próxima dosis en los datos de prueba.
      assert.equal(buscar(await pendientes('?dias=365'), perros.Max, 'Antirrábica'), undefined)
    })

    it('no muestra perros adoptados', async () => {
      const adoptado = (await entorno.pool.query("select id from perros where estado = 'adoptado' limit 1")).rows[0]
      assert.ok(adoptado, 'los datos de prueba deben tener un perro adoptado')
      await entorno.pool.query(
        "insert into vacunas (perro_id, veterinario_id, nombre, fecha_aplicacion, fecha_proxima_dosis) values ($1, $2, 'Refuerzo', current_date - 30, current_date - 1)",
        [adoptado.id, andres],
      )
      assert.equal(buscar(await pendientes(), adoptado.id, 'Refuerzo'), undefined)
    })

    it('días fuera de rango → 400', async () => {
      for (const dias of ['-1', '400', 'abc']) {
        const respuesta = await api.get(`/controles/pendientes?dias=${dias}`)
        assert.equal(respuesta.status, 400, dias)
      }
    })
  })

  describe('Al registrar el control desaparece de la lista', () => {
    it('vacuna: registrar de nuevo la misma vacuna (sin importar mayúsculas) quita la pendiente', async () => {
      assert.ok(buscar(await pendientes(), perros.Toby, 'Antirrábica'))
      const respuesta = await api
        .post('/vacunas')
        .send(vacuna({ perro_id: perros.Toby, nombre: '  antirrábica ', fecha_proxima_dosis: await fecha(365) }))
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      assert.equal(respuesta.body.veterinario_nombre, 'Andrés Ramírez')
      assert.equal(respuesta.body.fecha_aplicacion, await fecha(0))

      const lista = await pendientes()
      assert.equal(lista.controles.some((c) => c.perro_id === perros.Toby && /antirr/i.test(c.detalle)), false)
    })

    it('desparasitación: registrar el mismo tipo quita la pendiente y el otro tipo sigue', async () => {
      const respuesta = await api.post('/desparasitaciones').send({
        perro_id: perros.Luna,
        veterinario_id: andres,
        tipo: 'externa',
        producto: 'Fluralaner',
        fecha_proxima: await fecha(90),
      })
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      assert.equal(respuesta.body.tipo, 'externa')

      const lista = await pendientes()
      assert.equal(buscar(lista, perros.Luna, 'Desparasitación externa'), undefined)
      assert.ok(buscar(lista, perros.Luna, 'Desparasitación interna'))
    })

    it('el historial del perro trae sus vacunas y desparasitaciones', async () => {
      const historial = await api.get(`/perros/${perros.Luna}/historial`)
      assert.equal(historial.status, 200)
      assert.ok(historial.body.vacunas.length >= 2)
      assert.equal(historial.body.desparasitaciones[0].producto, 'Fluralaner')
      assert.ok(Array.isArray(historial.body.consultas))
    })
  })

  describe('Validaciones', () => {
    it('la próxima fecha debe ser posterior a la aplicación', async () => {
      const respuesta = await api
        .post('/vacunas')
        .send(vacuna({ fecha_aplicacion: '2026-10-10', fecha_proxima_dosis: '2026-10-10' }))
      assert.equal(respuesta.status, 400)
      assert.deepEqual(respuesta.body.detalles.map((d) => d.campo), ['fecha_proxima_dosis'])
    })

    it('desparasitación: tipo y producto obligatorios', async () => {
      const respuesta = await api.post('/desparasitaciones').send({ perro_id: perros.Coco, veterinario_id: andres, tipo: 'oral', producto: ' ' })
      assert.equal(respuesta.status, 400)
      assert.deepEqual(respuesta.body.detalles.map((d) => d.campo).sort(), ['producto', 'tipo'])
    })

    it('el perro debe existir y el responsable ser un veterinario activo', async () => {
      const admin = (await entorno.pool.query("select id from usuarios where rol = 'administrador'")).rows[0].id
      const respuesta = await api.post('/vacunas').send(vacuna({ perro_id: 999999, veterinario_id: admin }))
      assert.equal(respuesta.status, 400)
      assert.deepEqual(respuesta.body.detalles.map((d) => d.campo).sort(), ['perro_id', 'veterinario_id'])
    })
  })

  describe('Permisos (HU-07)', () => {
    it('el responsable de adopciones no ve la lista ni registra controles (403)', async () => {
      const otro = entorno.api('veterinaria', await entorno.iniciarSesion(PERSONAL))
      assert.equal((await otro.get('/controles/pendientes')).status, 403)
      assert.equal((await otro.post('/vacunas').send(vacuna())).status, 403)
      assert.equal((await otro.post('/desparasitaciones').send({})).status, 403)
    })
  })
})
