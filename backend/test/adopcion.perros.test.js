// HU-04 (RF-05), HU-05 (RF-06), HU-06 (RF-07, RF-08, RF-09), HU-07 (RF-10)
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearEntorno, idPerro } from './utilidades/entorno.js'
import { restarEdad } from '../services/adopcion/src/services/perros.service.js'

describe('Servicio de Adopción · perros', () => {
  let entorno, api, mestizo

  before(async () => {
    entorno = await crearEntorno()
    api = entorno.api('adopcion', await entorno.iniciarSesion())
    mestizo = (await entorno.pool.query("select id from razas where nombre = 'Mestizo'")).rows[0].id
  })
  after(() => entorno.cerrar())

  const perroValido = (cambios = {}) => ({
    nombre: 'Firulais',
    raza_id: mestizo,
    sexo: 'macho',
    tamano: 'mediano',
    fecha_ingreso: '2026-10-01',
    ...cambios,
  })

  describe('GET /catalogos', () => {
    it('devuelve razas activas, tamaños y estados para los formularios', async () => {
      const respuesta = await api.get('/catalogos')
      assert.equal(respuesta.status, 200)
      assert.ok(respuesta.body.razas.some((r) => r.nombre === 'Mestizo'))
      assert.deepEqual(respuesta.body.tamanos.map((t) => t.codigo), ['pequeno', 'mediano', 'grande'])
      assert.equal(respuesta.body.estados_perro.length, 4)
      assert.equal(respuesta.body.estados_solicitud.length, 4)
    })
  })

  describe('HU-04 · Registrar perro', () => {
    it('registra con los datos obligatorios; el estado inicial por defecto es Disponible', async () => {
      const respuesta = await api.post('/perros').send(perroValido())
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.nombre, 'Firulais')
      assert.equal(respuesta.body.raza, 'Mestizo')
      assert.equal(respuesta.body.estado, 'disponible')
      assert.equal(respuesta.body.fecha_nacimiento, null)
      assert.equal(respuesta.body.adopcion_vigente, null)
      assert.equal(respuesta.body.registrado_por > 0, true)
    })

    it('acepta estado inicial En tratamiento, color y foto', async () => {
      const respuesta = await api.post('/perros').send(perroValido({
        estado: 'en_tratamiento', color: 'Negro', foto_url: 'https://ejemplo.com/f.jpg', fecha_nacimiento: '2025-01-15',
      }))
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.estado, 'en_tratamiento')
      assert.equal(respuesta.body.fecha_nacimiento, '2025-01-15')
      assert.equal(respuesta.body.fecha_nacimiento_estimada, false)
    })

    it('una edad aproximada se guarda como fecha de nacimiento estimada', async () => {
      const respuesta = await api.post('/perros').send(perroValido({ edad_aproximada: { anios: 2, meses: 3 }, fecha_ingreso: '2026-10-20' }))
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.fecha_nacimiento_estimada, true)
      assert.ok(respuesta.body.edad_meses >= 27 && respuesta.body.edad_meses <= 28)
    })

    it('restarEdad respeta los fines de mes', () => {
      assert.equal(restarEdad('2026-03-31', 0, 1), '2026-02-28')
      assert.equal(restarEdad('2026-10-22', 2, 3), '2024-07-22')
    })

    it('no se puede registrar como En proceso de adopción ni Adoptado', async () => {
      for (const estado of ['en_adopcion', 'adoptado']) {
        const respuesta = await api.post('/perros').send(perroValido({ estado }))
        assert.equal(respuesta.status, 400, estado)
        assert.equal(respuesta.body.detalles[0].campo, 'estado')
      }
    })

    it('sin datos obligatorios responde 400 con un detalle por campo', async () => {
      const respuesta = await api.post('/perros').send({ nombre: '  ' })
      assert.equal(respuesta.status, 400)
      const camposConError = respuesta.body.detalles.map((d) => d.campo).sort()
      assert.deepEqual(camposConError, ['fecha_ingreso', 'nombre', 'raza_id', 'sexo', 'tamano'])
    })

    it('rechaza fecha de nacimiento posterior al ingreso, fecha y edad a la vez, y foto sin http', async () => {
      const posterior = await api.post('/perros').send(perroValido({ fecha_nacimiento: '2026-10-05' }))
      assert.equal(posterior.status, 400)
      assert.equal(posterior.body.detalles[0].campo, 'fecha_nacimiento')

      const ambas = await api.post('/perros').send(perroValido({ fecha_nacimiento: '2020-01-01', edad_aproximada: { anios: 3 } }))
      assert.equal(ambas.status, 400)
      assert.equal(ambas.body.detalles[0].campo, 'edad_aproximada')

      const foto = await api.post('/perros').send(perroValido({ foto_url: 'C:/fotos/x.jpg' }))
      assert.equal(foto.status, 400)
      assert.equal(foto.body.detalles[0].campo, 'foto_url')
    })

    it('rechaza una raza o un tamaño que no existen en el catálogo', async () => {
      const raza = await api.post('/perros').send(perroValido({ raza_id: 99999 }))
      assert.equal(raza.status, 400)
      assert.equal(raza.body.detalles[0].campo, 'raza_id')

      const tamano = await api.post('/perros').send(perroValido({ tamano: 'gigante' }))
      assert.equal(tamano.status, 400)
      assert.equal(tamano.body.error, 'El tamaño seleccionado no existe.')
    })
  })

  describe('HU-06 · Listar, buscar y filtrar perros', () => {
    it('lista con los datos de la tarjeta y el total', async () => {
      const respuesta = await api.get('/perros')
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, respuesta.body.perros.length)
      const luna = respuesta.body.perros.find((p) => p.nombre === 'Luna')
      for (const campo of ['id', 'foto_url', 'raza', 'sexo', 'edad_meses', 'tamano_nombre', 'estado', 'estado_nombre']) {
        assert.ok(campo in luna, campo)
      }
    })

    it('busca por nombre o por raza sin distinguir mayúsculas', async () => {
      const porNombre = await api.get('/perros?buscar=LUN')
      assert.deepEqual(porNombre.body.perros.map((p) => p.nombre), ['Luna'])

      const porRaza = await api.get('/perros?buscar=beagle')
      assert.deepEqual(porRaza.body.perros.map((p) => p.nombre), ['Bella'])
    })

    it('trata % y _ como texto, no como comodines', async () => {
      const respuesta = await api.get('/perros?buscar=%25')
      assert.equal(respuesta.body.total, 0)
    })

    it('filtra por cada estado y combina filtro con búsqueda', async () => {
      const esperados = { en_tratamiento: ['Max', 'Nina'], en_adopcion: ['Bella'], adoptado: ['Rocky'] }
      for (const [estado, nombres] of Object.entries(esperados)) {
        const { perros } = (await api.get(`/perros?estado=${estado}`)).body
        assert.ok(perros.every((p) => p.estado === estado), estado)
        // Otras pruebas de este archivo pueden haber registrado más perros en ese estado.
        for (const nombre of nombres) assert.ok(perros.some((p) => p.nombre === nombre), `${estado}: ${nombre}`)
      }
      const combinado = await api.get('/perros?estado=disponible&buscar=mestiz')
      assert.ok(combinado.body.perros.every((p) => p.estado === 'disponible' && p.raza === 'Mestizo'))
      assert.ok(combinado.body.total >= 2)

      const vacio = await api.get('/perros?estado=adoptado&buscar=Luna')
      assert.equal(vacio.body.total, 0)
    })
  })

  describe('HU-07 · Ver detalle de un perro', () => {
    it('incluye la adopción vigente con su adoptante', async () => {
      const respuesta = await api.get(`/perros/${await idPerro(entorno.pool, 'Bella')}`)
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.estado, 'en_adopcion')
      assert.equal(respuesta.body.adopcion_vigente.estado, 'en_proceso')
      assert.equal(respuesta.body.adopcion_vigente.adoptante.nombre_completo, 'Carlos Mendoza Vargas')
    })

    it('no muestra una adopción rechazada como vigente', async () => {
      const respuesta = await api.get(`/perros/${await idPerro(entorno.pool, 'Luna')}`)
      assert.equal(respuesta.body.adopcion_vigente, null)
    })

    it('perro inexistente → 404; id no numérico → 400', async () => {
      assert.equal((await api.get('/perros/99999')).status, 404)
      assert.equal((await api.get('/perros/abc')).status, 400)
    })
  })

  describe('HU-05 · Editar perro', () => {
    it('edita los datos y cambia Disponible → En tratamiento', async () => {
      const coco = await idPerro(entorno.pool, 'Coco')
      const actual = (await api.get(`/perros/${coco}`)).body
      const respuesta = await api.put(`/perros/${coco}`).send({
        nombre: 'Coco Editado', raza_id: actual.raza_id, sexo: actual.sexo, tamano: actual.tamano,
        fecha_ingreso: actual.fecha_ingreso, fecha_nacimiento: actual.fecha_nacimiento, color: 'Café', estado: 'en_tratamiento',
      })
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.nombre, 'Coco Editado')
      assert.equal(respuesta.body.estado, 'en_tratamiento')
    })

    it('no permite cambiar a mano el estado de un perro en adopción o adoptado', async () => {
      for (const nombre of ['Bella', 'Rocky']) {
        const id = await idPerro(entorno.pool, nombre)
        const actual = (await api.get(`/perros/${id}`)).body
        const respuesta = await api.put(`/perros/${id}`).send({
          nombre: actual.nombre, raza_id: actual.raza_id, sexo: actual.sexo, tamano: actual.tamano,
          fecha_ingreso: actual.fecha_ingreso, estado: 'disponible',
        })
        assert.equal(respuesta.status, 409, nombre)
        assert.match(respuesta.body.error, /proceso de adopción/)
      }
    })

    it('sí permite editar los demás datos de un perro adoptado sin tocar su estado', async () => {
      const rocky = await idPerro(entorno.pool, 'Rocky')
      const actual = (await api.get(`/perros/${rocky}`)).body
      const respuesta = await api.put(`/perros/${rocky}`).send({
        nombre: actual.nombre, raza_id: actual.raza_id, sexo: actual.sexo, tamano: actual.tamano,
        fecha_ingreso: actual.fecha_ingreso, fecha_nacimiento: actual.fecha_nacimiento, color: 'Negro y fuego',
      })
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.color, 'Negro y fuego')
      assert.equal(respuesta.body.estado, 'adoptado')
    })

    it('perro inexistente → 404', async () => {
      const respuesta = await api.put('/perros/99999').send(perroValido())
      assert.equal(respuesta.status, 404)
    })
  })
})
