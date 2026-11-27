// Pruebas unitarias · Servicio de Adopción · perros (HU-04, HU-05, HU-06, HU-07).
import { after, before, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { crearPerrosService, restarEdad } from '../../services/adopcion/src/services/perros.service.js'
import { argumentos, congelarFecha, devuelve, liberarFecha, rechazaCon } from './utilidades/dobles.js'

describe('restarEdad (fecha de nacimiento estimada)', () => {
  it('resta años y meses a una fecha', () => {
    assert.equal(restarEdad('2026-11-15', 2, 3), '2024-08-15')
  })

  it('cruza al año anterior', () => {
    assert.equal(restarEdad('2026-01-10', 0, 1), '2025-12-10')
  })

  it('ajusta al último día cuando el mes destino es más corto', () => {
    assert.equal(restarEdad('2026-03-31', 0, 1), '2026-02-28')
    assert.equal(restarEdad('2024-03-31', 0, 1), '2024-02-29') // año bisiesto
  })
})

describe('Perros · servicio', () => {
  before(() => congelarFecha()) // "hoy" = 2026-11-15
  after(() => liberarFecha())

  const perroGuardado = { id: 10, nombre: 'Firulais', raza_id: 3, estado: 'disponible' }
  const usuario = { id: 1 }
  const valido = (cambios = {}) => ({
    nombre: ' Firulais ',
    raza_id: '3',
    sexo: 'macho',
    tamano: 'mediano',
    fecha_ingreso: '2026-10-01',
    ...cambios,
  })

  function armar({ perro = perroGuardado, razaActiva = true } = {}) {
    const perros = {
      listar: devuelve([perro]),
      obtener: devuelve(perro),
      crear: devuelve(10),
      actualizar: devuelve(undefined),
    }
    const adopciones = { vigenteDePerro: devuelve({ id: 77 }) }
    const catalogos = { razaActiva: devuelve(razaActiva) }
    return { perros, adopciones, catalogos, servicio: crearPerrosService({ perros, adopciones, catalogos }) }
  }

  describe('listar (HU-06)', () => {
    it('limpia los filtros antes de consultar', async () => {
      const { servicio, perros } = armar()
      await servicio.listar({ buscar: '  Fi ', estado: '' })
      assert.deepEqual(argumentos(perros.listar), [{ buscar: 'Fi', estado: null }])
    })
  })

  describe('obtener (HU-07)', () => {
    it('devuelve el perro con su adopción vigente', async () => {
      const { servicio } = armar()
      const perro = await servicio.obtener('10')
      assert.equal(perro.nombre, 'Firulais')
      assert.deepEqual(perro.adopcion_vigente, { id: 77 })
    })

    it('oculta la adopción a los roles que no ven ese módulo', async () => {
      const { servicio, adopciones } = armar()
      const perro = await servicio.obtener(10, { verAdopcion: false })
      assert.equal(perro.adopcion_vigente, null)
      assert.equal(adopciones.vigenteDePerro.mock.callCount(), 0)
    })

    it('id inválido → 400; perro inexistente → 404', async () => {
      await rechazaCon(armar().servicio.obtener('abc'), 400)
      await rechazaCon(armar({ perro: null }).servicio.obtener(99), 404, { mensaje: /El perro no existe/ })
    })
  })

  describe('crear (HU-04)', () => {
    it('registra con estado Disponible por defecto y sin fecha de nacimiento', async () => {
      const { servicio, perros } = armar()
      await servicio.crear(valido(), usuario)
      const [columnas, usuarioId] = argumentos(perros.crear)
      assert.equal(usuarioId, 1)
      assert.deepEqual(columnas, {
        nombre: 'Firulais',
        raza_id: 3,
        sexo: 'macho',
        tamano: 'mediano',
        color: null,
        foto_url: null,
        fecha_ingreso: '2026-10-01',
        fecha_nacimiento: null,
        fecha_nacimiento_estimada: false,
        estado: 'disponible',
      })
    })

    it('calcula la fecha de nacimiento estimada a partir de la edad aproximada', async () => {
      const { servicio, perros } = armar()
      await servicio.crear(valido({ edad_aproximada: { anios: 1, meses: 2 }, estado: 'en_tratamiento' }), usuario)
      const [columnas] = argumentos(perros.crear)
      assert.equal(columnas.fecha_nacimiento, '2025-09-15')
      assert.equal(columnas.fecha_nacimiento_estimada, true)
      assert.equal(columnas.estado, 'en_tratamiento')
    })

    it('acepta una foto con URL http(s) y la rechaza con otro protocolo', async () => {
      const { servicio, perros } = armar()
      await servicio.crear(valido({ foto_url: 'https://fotos.bo/toby.jpg' }), usuario)
      assert.equal(argumentos(perros.crear)[0].foto_url, 'https://fotos.bo/toby.jpg')
      await rechazaCon(servicio.crear(valido({ foto_url: 'ftp://fotos.bo/toby.jpg' }), usuario), 400, { campos: ['foto_url'] })
    })

    it('rechaza nacimiento posterior al ingreso (fecha o edad)', async () => {
      const { servicio } = armar()
      await rechazaCon(servicio.crear(valido({ fecha_nacimiento: '2026-10-02' }), usuario), 400, { campos: ['fecha_nacimiento'] })
      await rechazaCon(
        servicio.crear(valido({ fecha_ingreso: '2020-01-01', edad_aproximada: { anios: 1 } }), usuario),
        400,
        { campos: ['edad_aproximada'] },
      )
    })

    it('no permite fecha de nacimiento y edad aproximada a la vez, ni edad cero', async () => {
      const { servicio } = armar()
      await rechazaCon(
        servicio.crear(valido({ fecha_nacimiento: '2025-01-01', edad_aproximada: { anios: 1 } }), usuario),
        400,
        { mensaje: /Datos inválidos/, campos: ['edad_aproximada'] },
      )
      await rechazaCon(servicio.crear(valido({ edad_aproximada: { anios: 0, meses: 0 } }), usuario), 400)
    })

    it('valida campos obligatorios, sexo y estado manual', async () => {
      const { servicio, perros } = armar()
      await rechazaCon(servicio.crear({}, usuario), 400, { campos: ['nombre', 'raza_id', 'sexo', 'tamano', 'fecha_ingreso'] })
      await rechazaCon(servicio.crear(valido({ sexo: 'otro', estado: 'adoptado' }), usuario), 400, { campos: ['sexo', 'estado'] })
      assert.equal(perros.crear.mock.callCount(), 0)
    })

    it('rechaza una raza inexistente o inactiva', async () => {
      const { servicio, perros } = armar({ razaActiva: false })
      await rechazaCon(servicio.crear(valido(), usuario), 400, { campos: ['raza_id'] })
      assert.equal(perros.crear.mock.callCount(), 0)
    })
  })

  describe('actualizar (HU-05)', () => {
    it('perro inexistente → 404', async () => {
      await rechazaCon(armar({ perro: null }).servicio.actualizar(10, valido()), 404)
    })

    it('solo revisa la raza si cambió', async () => {
      const { servicio, catalogos } = armar()
      await servicio.actualizar(10, valido())
      assert.equal(catalogos.razaActiva.mock.callCount(), 0)
      await servicio.actualizar(10, valido({ raza_id: 4 }))
      assert.deepEqual(argumentos(catalogos.razaActiva), [4])
    })

    it('cambia el estado manual solo si es distinto al actual', async () => {
      const { servicio, perros } = armar()
      await servicio.actualizar(10, valido({ estado: 'en_tratamiento' }))
      assert.equal(argumentos(perros.actualizar)[1].estado, 'en_tratamiento')
      await servicio.actualizar(10, valido({ estado: 'disponible' }))
      assert.equal(argumentos(perros.actualizar, 1)[1].estado, null)
    })

    it('no deja cambiar a mano el estado de un perro en proceso de adopción', async () => {
      const { servicio, perros } = armar({ perro: { ...perroGuardado, estado: 'en_adopcion' } })
      await rechazaCon(servicio.actualizar(10, valido({ estado: 'disponible' })), 409, { mensaje: /proceso de adopción/ })
      assert.equal(perros.actualizar.mock.callCount(), 0)
    })

    it('respeta la opción verAdopcion al devolver el perro', async () => {
      const { servicio } = armar()
      const perro = await servicio.actualizar(10, valido(), { verAdopcion: false })
      assert.equal(perro.adopcion_vigente, null)
    })

    it('mock.fn registra cada llamada (ejemplo de verificación de interacción)', async () => {
      const { servicio, perros } = armar()
      perros.obtener = mock.fn(async () => perroGuardado)
      await servicio.actualizar('10', valido())
      assert.equal(perros.obtener.mock.callCount(), 2) // al validar y al devolver
    })
  })
})
