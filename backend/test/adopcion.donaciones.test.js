// HU-18 · Registro de donaciones recibidas.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PERSONAL, crearEntorno } from './utilidades/entorno.js'

const ADMINISTRADOR = 'admin@peluchin.test'
const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Adopción · donaciones (HU-18)', () => {
  let entorno, admin, dashboard
  let donacionDinero, donacionAlimento

  before(async () => {
    entorno = await crearEntorno()
    await entorno.pool.query(
      'update usuarios set password_hash = (select password_hash from usuarios where correo = $2) where correo = $1',
      [ADMINISTRADOR, PERSONAL],
    )
    const tokenAdmin = await entorno.iniciarSesion(ADMINISTRADOR)
    admin = entorno.api('adopcion', tokenAdmin)
    dashboard = entorno.api('dashboard', tokenAdmin)

    const dinero = await admin.post('/donaciones').send({
      fecha: '2021-03-05', donante: 'Empresa Solidaria', contacto: '71234567', tipo: 'dinero', monto_bs: 75.5,
    })
    assert.equal(dinero.status, 201, JSON.stringify(dinero.body))
    donacionDinero = dinero.body

    const alimento = await admin.post('/donaciones').send({
      fecha: '2021-03-20', donante: 'Familia Pérez', tipo: 'alimento', cantidad: 12,
      descripcion: '12 kg de alimento para perros',
    })
    assert.equal(alimento.status, 201, JSON.stringify(alimento.body))
    donacionAlimento = alimento.body

    const abril = await admin.post('/donaciones').send({
      fecha: '2021-04-02', donante: 'Donante de abril', tipo: 'insumos', cantidad: 4,
      descripcion: '4 mantas',
    })
    assert.equal(abril.status, 201, JSON.stringify(abril.body))
  })

  after(() => entorno.cerrar())

  it('registra una donación de dinero en Bs y conserva al usuario que la registró', () => {
    assert.equal(donacionDinero.tipo, 'dinero')
    assert.equal(Number(donacionDinero.monto_bs), 75.5)
    assert.equal(donacionDinero.cantidad, null)
    assert.equal(donacionDinero.registrado_por_nombre, 'Patricia Gómez')
  })

  it('registra alimentos, insumos u otros con cantidad y descripción', () => {
    assert.equal(donacionAlimento.tipo, 'alimento')
    assert.equal(Number(donacionAlimento.cantidad), 12)
    assert.equal(donacionAlimento.monto_bs, null)
    assert.equal(donacionAlimento.descripcion, '12 kg de alimento para perros')
  })

  it('lista las donaciones de la más reciente a la más antigua', async () => {
    const respuesta = await admin.get('/donaciones')
    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
    assert.equal(respuesta.body.total, 3)
    assert.equal(respuesta.body.donaciones[0].fecha, '2021-04-02')
  })

  it('rechaza datos incompletos o incompatibles con el tipo de donación', async () => {
    const casos = [
      { donante: 'A', tipo: 'dinero', cantidad: 3 },
      { donante: 'A', tipo: 'alimento', monto_bs: 20 },
      { donante: 'A', tipo: 'insumos', cantidad: 2 },
      { donante: 'A', tipo: 'otro', cantidad: -1, descripcion: 'Material' },
      { donante: 'A', tipo: 'efectivo', monto_bs: 20 },
    ]
    for (const datos of casos) {
      const respuesta = await admin.post('/donaciones').send(datos)
      assert.equal(respuesta.status, 400, JSON.stringify({ datos, respuesta: respuesta.body }))
    }
  })

  it('solo permite consultar o registrar donaciones a administración', async () => {
    for (const correo of [PERSONAL, VETERINARIO]) {
      const api = entorno.api('adopcion', await entorno.iniciarSesion(correo))
      assert.equal((await api.get('/donaciones')).status, 403, correo)
      assert.equal((await api.post('/donaciones').send({})).status, 403, correo)
    }
  })

  it('el dashboard cuenta donaciones y suma solo el dinero del periodo elegido', async () => {
    const respuesta = await dashboard.get('/resumen?desde=2021-03-01&hasta=2021-03-31')
    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
    assert.equal(Number(respuesta.body.periodo.donaciones), 2)
    assert.equal(Number(respuesta.body.periodo.dinero_donado_bs), 75.5)
  })
})