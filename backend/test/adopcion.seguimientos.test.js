// HU-10 · Seguimiento después de la adopción
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearEntorno, idPerro } from './utilidades/entorno.js'

const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Adopción · seguimientos (HU-10)', () => {
  let entorno, api, rocky, toby, bella

  // Fecha de la BD desplazada n días (la vista usa current_date).
  const fecha = async (dias = 0) =>
    (await entorno.pool.query('select (current_date + $1::int)::text as f', [dias])).rows[0].f

  const adopcionDe = async (perroId) =>
    (await entorno.pool.query(
      "select id from solicitudes_adopcion where perro_id = $1 and estado <> 'rechazada' order by id desc limit 1",
      [perroId],
    )).rows[0].id

  const pendientes = async (query = '') => {
    const respuesta = await api.get(`/seguimientos/pendientes${query}`)
    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
    return respuesta.body
  }
  const conProblemas = async () => {
    const respuesta = await api.get('/seguimientos/con-problemas')
    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
    return respuesta.body
  }

  const visita = (cambios = {}) => ({ tipo: 'visita', observaciones: 'Todo en orden.', ...cambios })

  before(async () => {
    entorno = await crearEntorno()
    api = entorno.api('adopcion', await entorno.iniciarSesion())

    // Rocky: adopción finalizada de los datos de prueba (2023-12-15) con 3 seguimientos.
    rocky = await adopcionDe(await idPerro(entorno.pool, 'Rocky'))
    // Bella: adopción en proceso.
    bella = await adopcionDe(await idPerro(entorno.pool, 'Bella'))

    // Toby: adopción entregada hace 40 días, todavía sin seguimientos.
    const perroToby = await idPerro(entorno.pool, 'Toby')
    const creada = await api.post('/adopciones').send({
      perro_id: perroToby,
      adoptante: { nombre_completo: 'Laura Quispe', telefono: '70012345', direccion: 'Calle 1, La Paz' },
      fecha_solicitud: await fecha(-50),
    })
    toby = creada.body.id
    await api.patch(`/adopciones/${toby}/estado`).send({ estado: 'aprobada', fecha: await fecha(-45) })
    const finalizada = await api.patch(`/adopciones/${toby}/estado`).send({ estado: 'finalizada', fecha: await fecha(-40) })
    assert.equal(finalizada.status, 200, JSON.stringify(finalizada.body))
  })
  after(() => entorno.cerrar())

  describe('Sección de seguimientos de cada adopción', () => {
    it('lista fecha, tipo, observaciones, marca y quién lo registró, del más reciente al más antiguo', async () => {
      const respuesta = await api.get(`/adopciones/${rocky}/seguimientos`)
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, 3)
      const [ultimo] = respuesta.body.seguimientos
      assert.equal(ultimo.fecha, '2024-03-15')
      assert.equal(ultimo.tipo, 'llamada')
      assert.match(ultimo.observaciones, /cojea/)
      assert.equal(ultimo.con_problemas, true)
      assert.equal(ultimo.registrado_por_nombre, 'María Alvarado')
      const fechas = respuesta.body.seguimientos.map((s) => s.fecha)
      assert.deepEqual(fechas, [...fechas].sort().reverse())
    })

    it('una adopción sin seguimientos devuelve la lista vacía', async () => {
      const respuesta = await api.get(`/adopciones/${toby}/seguimientos`)
      assert.equal(respuesta.status, 200)
      assert.deepEqual(respuesta.body, { total: 0, seguimientos: [] })
    })

    it('registra una visita o una llamada con fecha, tipo y observaciones', async () => {
      const respuesta = await api.post(`/adopciones/${toby}/seguimientos`).send(
        visita({ fecha: await fecha(-35), observaciones: '  Toby se adaptó bien a la casa.  ' }),
      )
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      assert.equal(respuesta.body.solicitud_id, toby)
      assert.equal(respuesta.body.tipo, 'visita')
      assert.equal(respuesta.body.fecha, await fecha(-35))
      assert.equal(respuesta.body.observaciones, 'Toby se adaptó bien a la casa.')
      assert.equal(respuesta.body.con_problemas, false)
    })

    it('la fecha por defecto es hoy', async () => {
      const respuesta = await api.post(`/adopciones/${rocky}/seguimientos`).send({ tipo: 'llamada', observaciones: 'Rocky ya no cojea.' })
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.fecha, await fecha(0))
    })

    it('solo se registran en adopciones finalizadas (409)', async () => {
      const enProceso = await api.post(`/adopciones/${bella}/seguimientos`).send(visita())
      assert.equal(enProceso.status, 409)
      assert.match(enProceso.body.error, /finalizadas/)

      const luna = (await entorno.pool.query(
        "select id from solicitudes_adopcion where estado = 'rechazada' limit 1",
      )).rows[0].id
      assert.equal((await api.post(`/adopciones/${luna}/seguimientos`).send(visita())).status, 409)
    })

    it('valida fecha (no antes de la entrega ni futura), tipo y observaciones', async () => {
      const antes = await api.post(`/adopciones/${toby}/seguimientos`).send(visita({ fecha: await fecha(-41) }))
      assert.equal(antes.status, 400)
      assert.equal(antes.body.detalles[0].campo, 'fecha')

      const futura = await api.post(`/adopciones/${toby}/seguimientos`).send(visita({ fecha: await fecha(1) }))
      assert.equal(futura.status, 400)
      assert.equal(futura.body.detalles[0].campo, 'fecha')

      const tipo = await api.post(`/adopciones/${toby}/seguimientos`).send(visita({ tipo: 'correo' }))
      assert.equal(tipo.status, 400)
      assert.equal(tipo.body.detalles[0].campo, 'tipo')

      const sinTexto = await api.post(`/adopciones/${toby}/seguimientos`).send(visita({ observaciones: '   ' }))
      assert.equal(sinTexto.status, 400)
      assert.equal(sinTexto.body.detalles[0].campo, 'observaciones')
    })

    it('adopción inexistente → 404', async () => {
      assert.equal((await api.get('/adopciones/99999/seguimientos')).status, 404)
      assert.equal((await api.post('/adopciones/99999/seguimientos').send(visita())).status, 404)
    })
  })

  describe('Adopciones sin seguimiento en los últimos 30 días', () => {
    it('lista las adopciones finalizadas cuyo último seguimiento tiene más de 30 días', async () => {
      // Toby: último seguimiento hace 35 días.  Rocky: tiene uno de hoy (prueba anterior).
      const lista = await pendientes()
      assert.equal(lista.dias, 30)
      const fila = lista.adopciones.find((a) => a.solicitud_id === toby)
      assert.ok(fila, 'Toby debería estar en la lista')
      assert.equal(fila.perro_nombre, 'Toby')
      assert.equal(fila.adoptante_nombre, 'Laura Quispe')
      assert.equal(fila.adoptante_telefono, '70012345')
      assert.equal(fila.ultimo_seguimiento, await fecha(-35))
      assert.equal(fila.dias_sin_seguimiento, 35)
      assert.equal(fila.total_seguimientos, 1)
      assert.ok(!lista.adopciones.some((a) => a.solicitud_id === rocky), 'Rocky tiene un seguimiento reciente')
      assert.equal(lista.total, lista.adopciones.length)
    })

    it('un seguimiento dentro de los 30 días la saca de la lista', async () => {
      await api.post(`/adopciones/${toby}/seguimientos`).send(visita({ tipo: 'llamada', fecha: await fecha(-30) }))
      const lista = await pendientes()
      assert.ok(!lista.adopciones.some((a) => a.solicitud_id === toby))
    })

    it('el rango de días es configurable y una adopción sin seguimientos cuenta desde la entrega', async () => {
      // Con 10 días Toby vuelve a aparecer (su último seguimiento fue hace 30).
      const lista = await pendientes('?dias=10')
      assert.equal(lista.dias, 10)
      assert.equal(lista.adopciones.find((a) => a.solicitud_id === toby).dias_sin_seguimiento, 30)

      // Sin ningún seguimiento, los días se cuentan desde la entrega.
      await entorno.pool.query('delete from seguimientos_adopcion where solicitud_id = $1', [toby])
      const sinNinguno = (await pendientes()).adopciones.find((a) => a.solicitud_id === toby)
      assert.equal(sinNinguno.ultimo_seguimiento, null)
      assert.equal(sinNinguno.total_seguimientos, 0)
      assert.equal(sinNinguno.dias_sin_seguimiento, 40)
    })

    it('no incluye adopciones en proceso', async () => {
      assert.ok(!(await pendientes()).adopciones.some((a) => a.solicitud_id === bella))
    })

    it('días inválidos → 400', async () => {
      for (const dias of ['0', 'abc', '400']) {
        assert.equal((await api.get(`/seguimientos/pendientes?dias=${dias}`)).status, 400, dias)
      }
    })
  })

  describe('Seguimientos "con problemas"', () => {
    let nuevo

    it('se puede registrar un seguimiento ya marcado con problemas', async () => {
      const respuesta = await api.post(`/adopciones/${toby}/seguimientos`).send(
        visita({ observaciones: 'Toby está muy delgado.', con_problemas: true }),
      )
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.con_problemas, true)
      nuevo = respuesta.body.id
    })

    it('la lista de problemas muestra los marcados con su perro y adoptante, el más reciente primero', async () => {
      const lista = await conProblemas()
      assert.equal(lista.total, 2)
      assert.deepEqual(lista.seguimientos.map((s) => s.perro_nombre), ['Toby', 'Rocky'])
      assert.equal(lista.seguimientos[1].adoptante_nombre, 'Ana García López')
      assert.equal(lista.seguimientos[1].solicitud_id, rocky)
    })

    it('se puede marcar un seguimiento existente y desmarcarlo cuando se revisa', async () => {
      const [primero] = (await api.get(`/adopciones/${rocky}/seguimientos`)).body.seguimientos.filter((s) => !s.con_problemas)

      const marcado = await api.patch(`/adopciones/${rocky}/seguimientos/${primero.id}`).send({ con_problemas: true })
      assert.equal(marcado.status, 200)
      assert.equal(marcado.body.con_problemas, true)
      assert.equal((await conProblemas()).total, 3)

      const revisado = await api.patch(`/adopciones/${rocky}/seguimientos/${primero.id}`).send({ con_problemas: false })
      assert.equal(revisado.status, 200)
      assert.equal(revisado.body.con_problemas, false)
      assert.equal((await conProblemas()).total, 2)
    })

    it('el seguimiento debe ser de esa adopción (404) y la marca es obligatoria (400)', async () => {
      assert.equal((await api.patch(`/adopciones/${rocky}/seguimientos/${nuevo}`).send({ con_problemas: false })).status, 404)
      assert.equal((await api.patch(`/adopciones/${toby}/seguimientos/99999`).send({ con_problemas: false })).status, 404)
      const sinMarca = await api.patch(`/adopciones/${toby}/seguimientos/${nuevo}`).send({ con_problemas: 'si' })
      assert.equal(sinMarca.status, 400)
      assert.equal(sinMarca.body.detalles[0].campo, 'con_problemas')
    })
  })

  describe('Permisos', () => {
    it('el veterinario no accede a los seguimientos (403)', async () => {
      const vet = entorno.api('adopcion', await entorno.iniciarSesion(VETERINARIO))
      assert.equal((await vet.get(`/adopciones/${rocky}/seguimientos`)).status, 403)
      assert.equal((await vet.post(`/adopciones/${rocky}/seguimientos`).send(visita())).status, 403)
      assert.equal((await vet.get('/seguimientos/pendientes')).status, 403)
      assert.equal((await vet.get('/seguimientos/con-problemas')).status, 403)
    })
  })
})
