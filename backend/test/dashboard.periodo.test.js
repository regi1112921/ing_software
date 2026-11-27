// HU-12 · Filtros de fecha en el dashboard
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hoy } from '@huellas/shared'
import { PERSONAL, crearEntorno } from './utilidades/entorno.js'

const ADMINISTRADOR = 'admin@peluchin.test'
const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Dashboard · filtro de fechas (HU-12)', () => {
  let entorno, dashboard

  before(async () => {
    entorno = await crearEntorno()
    await entorno.pool.query(
      'update usuarios set password_hash = (select password_hash from usuarios where correo = $2) where correo = $1',
      [ADMINISTRADOR, PERSONAL],
    )
    const token = await entorno.iniciarSesion(ADMINISTRADOR)
    dashboard = entorno.api('dashboard', token)
    const adopcion = entorno.api('adopcion', token)
    const veterinaria = entorno.api('veterinaria', token)

    // Datos de 2021 (los de prueba son de 2023 en adelante): 3 ingresos, 1 adopción y 1 atención.
    const raza = (await entorno.pool.query('select id from razas limit 1')).rows[0].id
    const registrar = async (nombre, fechaIngreso) => {
      const respuesta = await adopcion
        .post('/perros')
        .send({ nombre, raza_id: raza, sexo: 'macho', tamano: 'mediano', fecha_ingreso: fechaIngreso })
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      return respuesta.body.id
    }
    const pancho = await registrar('Pancho', '2021-03-05')
    await registrar('Lola', '2021-03-20')
    await registrar('Firulais', '2021-05-02')

    const solicitud = await adopcion.post('/adopciones').send({
      perro_id: pancho,
      adoptante: { nombre_completo: 'Adoptante 2021', telefono: '3005556677', direccion: 'Calle 2021' },
      fecha_solicitud: '2021-03-06',
    })
    assert.equal(solicitud.status, 201, JSON.stringify(solicitud.body))
    for (const [estado, fecha] of [['aprobada', '2021-03-10'], ['finalizada', '2021-04-02']]) {
      const cambio = await adopcion.patch(`/adopciones/${solicitud.body.id}/estado`).send({ estado, fecha })
      assert.equal(cambio.status, 200, JSON.stringify(cambio.body))
    }

    const veterinario = (await entorno.pool.query('select id from usuarios where correo = $1', [VETERINARIO])).rows[0].id
    const consulta = await veterinaria.post('/consultas').send({
      perro_id: pancho,
      veterinario_id: veterinario,
      fecha: '2021-03-15',
      motivo: 'Chequeo de ingreso',
      diagnostico: 'Sano',
      tratamiento: 'Ninguno',
    })
    assert.equal(consulta.status, 201, JSON.stringify(consulta.body))
  })
  after(() => entorno.cerrar())

  const resumen = async (query) => {
    const respuesta = await dashboard.get(`/resumen${query}`)
    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
    return respuesta.body
  }

  describe('Resumen', () => {
    it('por defecto usa el mes actual y conserva los indicadores del estado actual', async () => {
      const { periodo, indicadores } = await resumen('')
      const mes = hoy().slice(0, 7)
      assert.equal(periodo.desde, `${mes}-01`)
      assert.ok(periodo.hasta.startsWith(mes))
      assert.ok(periodo.hasta >= hoy())
      assert.equal(typeof indicadores.en_albergue, 'number')
      assert.equal(typeof indicadores.solicitudes_pendientes, 'number')
    })

    it('cuenta ingresos, adopciones, solicitudes y atenciones del rango elegido', async () => {
      const marzo = (await resumen('?desde=2021-03-01&hasta=2021-03-31')).periodo
      assert.deepEqual(marzo, {
        desde: '2021-03-01',
        hasta: '2021-03-31',
        ingresos: 2,
        adopciones: 0,
        solicitudes: 1,
        atenciones: 1,
      })

      const trimestre = (await resumen('?desde=2021-03-01&hasta=2021-05-31')).periodo
      assert.equal(trimestre.ingresos, 3)
      assert.equal(trimestre.adopciones, 1)
    })

    it('las fechas del rango están incluidas', async () => {
      const unDia = (await resumen('?desde=2021-03-05&hasta=2021-03-05')).periodo
      assert.equal(unDia.ingresos, 1)
    })

    it('con una sola fecha completa el mes de esa fecha', async () => {
      const { periodo } = await resumen('?desde=2021-03-10')
      assert.equal(periodo.desde, '2021-03-10')
      assert.equal(periodo.hasta, '2021-03-31')
    })

    it('rechaza fechas inválidas, un rango invertido o de más de 5 años', async () => {
      for (const query of ['?desde=2021-13-01', '?desde=2021-05-01&hasta=2021-04-01', '?desde=2015-01-01&hasta=2021-01-01']) {
        const respuesta = await dashboard.get(`/resumen${query}`)
        assert.equal(respuesta.status, 400, query)
        assert.ok(respuesta.body.detalles.length > 0)
      }
    })
  })

  describe('Evolución', () => {
    it('hasta 2 meses va por día, con todos los días del rango', async () => {
      const respuesta = await dashboard.get('/evolucion?desde=2021-03-01&hasta=2021-03-31')
      assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
      const { unidad, puntos, total_ingresos, total_adopciones } = respuesta.body
      assert.equal(unidad, 'dia')
      assert.equal(puntos.length, 31)
      assert.equal(puntos[0].periodo, '2021-03-01')
      assert.equal(puntos.at(-1).periodo, '2021-03-31')
      assert.equal(total_ingresos, 2)
      assert.equal(total_adopciones, 0)
      assert.deepEqual(puntos.find((p) => p.periodo === '2021-03-05'), { periodo: '2021-03-05', ingresos: 1, adopciones: 0 })
    })

    it('rangos más largos van por mes', async () => {
      const { unidad, puntos, total_ingresos, total_adopciones } = (await dashboard.get('/evolucion?desde=2021-01-01&hasta=2021-12-31')).body
      assert.equal(unidad, 'mes')
      assert.deepEqual(
        puntos.map((p) => p.periodo),
        Array.from({ length: 12 }, (_, i) => `2021-${String(i + 1).padStart(2, '0')}`),
      )
      assert.equal(total_ingresos, 3)
      assert.equal(total_adopciones, 1)
      assert.deepEqual(puntos.find((p) => p.periodo === '2021-04'), { periodo: '2021-04', ingresos: 0, adopciones: 1 })
    })

    it('por defecto muestra los días del mes actual', async () => {
      const { unidad, desde, puntos } = (await dashboard.get('/evolucion')).body
      assert.equal(unidad, 'dia')
      assert.equal(desde, `${hoy().slice(0, 7)}-01`)
      assert.ok(puntos.length >= 28 && puntos.length <= 31)
    })
  })

  it('solo el administrador ve la evolución', async () => {
    for (const correo of [PERSONAL, VETERINARIO]) {
      const otro = entorno.api('dashboard', await entorno.iniciarSesion(correo))
      assert.equal((await otro.get('/evolucion')).status, 403, correo)
    }
  })
})
