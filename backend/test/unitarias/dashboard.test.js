// Pruebas unitarias · Servicio de Dashboard: indicadores (HU-13, HU-14), filtro por
// periodo (HU-12) y reportes descargables en PDF / Excel (HU-15).
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearIndicadoresService, mesDe } from '../../services/dashboard/src/services/indicadores.service.js'
import { argumentos, congelarFecha, devuelve, liberarFecha, rechazaCon } from './utilidades/dobles.js'

before(() => congelarFecha()) // "hoy" = 2026-11-15
after(() => liberarFecha())

function armar({ reporte = { columnas: ['Nombre', 'Nota'], filas: [['Toby', 'ok']] }, puntos = [] } = {}) {
  const indicadores = {
    conteoPorEstado: devuelve([
      { codigo: 'disponible', cantidad: 4 },
      { codigo: 'en_adopcion', cantidad: 2 },
      { codigo: 'adoptado', cantidad: 3 },
    ]),
    conteoSolicitudes: devuelve({ adopciones_mes: 1, pendientes: 5 }),
    indicadoresPeriodo: devuelve({ ingresos: 2, adopciones: 1 }),
    perrosEnTratamiento: devuelve([{ id: 1 }, { id: 2 }]),
    adopcionesPorMes: devuelve([{ mes: '2026-11', cantidad: 1 }]),
    evolucion: devuelve(puntos),
    reporte: devuelve(reporte),
  }
  return { indicadores, servicio: crearIndicadoresService({ indicadores }) }
}

describe('mesDe', () => {
  it('devuelve el primer y el último día del mes', () => {
    assert.deepEqual(mesDe('2026-11-15'), { desde: '2026-11-01', hasta: '2026-11-30' })
    assert.deepEqual(mesDe('2026-12-31'), { desde: '2026-12-01', hasta: '2026-12-31' })
    assert.deepEqual(mesDe('2026-02-10'), { desde: '2026-02-01', hasta: '2026-02-28' })
    assert.deepEqual(mesDe('2024-02-10'), { desde: '2024-02-01', hasta: '2024-02-29' }) // bisiesto
  })
})

describe('resumen', () => {
  it('calcula totales e indicadores; los estados sin perros cuentan 0', async () => {
    const resumen = await armar().servicio.resumen()
    assert.equal(resumen.total, 9)
    assert.deepEqual(resumen.indicadores, {
      en_albergue: 6, // los adoptados ya no están en el albergue
      disponibles: 4,
      en_tratamiento: 0,
      adopciones_mes: 1,
      solicitudes_pendientes: 5,
    })
  })

  it('sin fechas usa el mes actual (HU-12)', async () => {
    const { servicio, indicadores } = armar()
    const resumen = await servicio.resumen({})
    assert.deepEqual(argumentos(indicadores.indicadoresPeriodo), ['2026-11-01', '2026-11-30'])
    assert.deepEqual(resumen.periodo, { desde: '2026-11-01', hasta: '2026-11-30', ingresos: 2, adopciones: 1 })
  })

  it('con una sola fecha completa la otra con el mes de esa fecha', async () => {
    const { servicio, indicadores } = armar()
    await servicio.resumen({ desde: '2026-10-10' })
    await servicio.resumen({ hasta: '2026-09-20', desde: '' })
    assert.deepEqual(argumentos(indicadores.indicadoresPeriodo, 0), ['2026-10-10', '2026-10-31'])
    assert.deepEqual(argumentos(indicadores.indicadoresPeriodo, 1), ['2026-09-01', '2026-09-20'])
  })

  it('rechaza rangos invertidos o de más de 5 años', async () => {
    const { servicio } = armar()
    await rechazaCon(servicio.resumen({ desde: '2026-11-10', hasta: '2026-11-01' }), 400, { campos: ['hasta'] })
    await rechazaCon(servicio.resumen({ desde: '2020-01-01', hasta: '2026-01-01' }), 400, { mensaje: /Datos inválidos/, campos: ['hasta'] })
    await rechazaCon(servicio.resumen({ desde: '15/11/2026' }), 400, { campos: ['desde'] })
  })
})

describe('listados del dashboard', () => {
  it('perros en tratamiento con su total (HU-14)', async () => {
    assert.deepEqual(await armar().servicio.perrosEnTratamiento(), { total: 2, perros: [{ id: 1 }, { id: 2 }] })
  })

  it('adopciones por mes de los últimos 12 meses (HU-13)', async () => {
    const { servicio, indicadores } = armar()
    assert.deepEqual(await servicio.adopcionesPorMes(), { meses: [{ mes: '2026-11', cantidad: 1 }] })
    assert.deepEqual(argumentos(indicadores.adopcionesPorMes), [12])
  })
})

describe('evolucion (HU-12)', () => {
  const puntos = [
    { ingresos: 2, adopciones: 1 },
    { ingresos: 3, adopciones: 0 },
  ]

  it('agrupa por día en rangos cortos y suma los totales', async () => {
    const { servicio, indicadores } = armar({ puntos })
    const resultado = await servicio.evolucion({ desde: '2026-11-01', hasta: '2026-11-30' })
    assert.equal(resultado.unidad, 'dia')
    assert.equal(argumentos(indicadores.evolucion)[2], 'day')
    assert.equal(resultado.total_ingresos, 5)
    assert.equal(resultado.total_adopciones, 1)
  })

  it('agrupa por mes a partir de 62 días', async () => {
    const { servicio, indicadores } = armar({ puntos })
    const resultado = await servicio.evolucion({ desde: '2026-01-01', hasta: '2026-03-04' })
    assert.equal(resultado.unidad, 'mes')
    assert.equal(argumentos(indicadores.evolucion)[2], 'month')
  })

  it('sin parámetros usa el mes actual', async () => {
    const resultado = await armar().servicio.evolucion()
    assert.equal(resultado.desde, '2026-11-01')
    assert.equal(resultado.total_ingresos, 0)
  })
})

describe('reportes descargables (HU-15)', () => {
  it('Excel: CSV con BOM, comillas donde hacen falta y celdas vacías para null', async () => {
    const reporte = { columnas: ['Nombre', 'Nota'], filas: [['Toby', 'a,b'], ['Luna', 'dice "hola"'], ['Rex', null]] }
    const { servicio, indicadores } = armar({ reporte })
    const archivo = await servicio.reporte({ tipo: 'perros', formato: 'excel', desde: '2026-01-01', hasta: '2026-11-15' })
    assert.equal(archivo.nombre, 'perros.csv')
    assert.equal(archivo.tipo, 'text/csv; charset=utf-8')
    assert.equal(archivo.contenido.toString('utf8'), '\ufeffNombre,Nota\r\nToby,"a,b"\r\nLuna,"dice ""hola"""\r\nRex,')
    assert.deepEqual(argumentos(indicadores.reporte), ['perros', '2026-01-01', '2026-11-15'])
  })

  it('PDF: documento válido con las filas y los paréntesis escapados', async () => {
    const reporte = { columnas: ['Nombre', 'Nota'], filas: [['Rex (viejo)', 'C:\\ruta']] }
    const archivo = await armar({ reporte }).servicio.reporte({ tipo: 'adopciones', formato: 'pdf' })
    const pdf = archivo.contenido.toString('ascii')
    assert.equal(archivo.nombre, 'adopciones.pdf')
    assert.equal(archivo.tipo, 'application/pdf')
    assert.ok(pdf.startsWith('%PDF-1.4\n'))
    assert.ok(pdf.endsWith('%%EOF'))
    assert.ok(pdf.includes('(Nombre | Nota) Tj'))
    assert.ok(pdf.includes('(Rex \\(viejo\\) | C:\\\\ruta) Tj'))
    // startxref debe apuntar exactamente al byte donde empieza la tabla xref.
    const inicioXref = Number(pdf.match(/startxref\n(\d+)/)[1])
    assert.equal(pdf.slice(inicioXref, inicioXref + 4), 'xref')
  })

  it('valida tipo, formato y orden de las fechas', async () => {
    const { servicio, indicadores } = armar()
    await rechazaCon(servicio.reporte({ tipo: 'gatos', formato: 'word' }), 400, { campos: ['tipo', 'formato'] })
    await rechazaCon(servicio.reporte({ tipo: 'perros', formato: 'pdf', desde: '2026-11-15', hasta: '2026-11-01' }), 400, {
      mensaje: /La fecha inicial no puede ser posterior/,
    })
    assert.equal(indicadores.reporte.mock.callCount(), 0)
  })
})
