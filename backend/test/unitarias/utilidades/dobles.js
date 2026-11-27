// "Dobles de prueba" compartidos por las pruebas unitarias.
// Un doble reemplaza a una dependencia real (base de datos, red, reloj) para que
// cada prueba ejercite SOLO la lógica de la función bajo prueba.
import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { ErrorHttp } from '@huellas/shared'

// Fecha fija para que las pruebas que usan "hoy" no cambien según el día en que se corren.
// 15 de noviembre de 2026, 10:00 en la hora local de quien corre las pruebas.
export const HOY = '2026-11-15'
export function congelarFecha(fecha = new Date(2026, 10, 15, 10, 0, 0)) {
  mock.timers.enable({ apis: ['Date'], now: fecha })
}
export function liberarFecha() {
  mock.timers.reset()
}

// Pool falso de PostgreSQL: registra begin / commit / rollback sin conectarse a nada.
export function poolFalso() {
  const sentencias = []
  const cliente = {
    query: async (sql) => {
      sentencias.push(sql)
    },
    release: () => sentencias.push('release'),
  }
  return { sentencias, cliente, connect: async () => cliente }
}

// Función falsa asíncrona que devuelve `valor` y recuerda con qué se la llamó.
export const devuelve = (valor) => mock.fn(async () => valor)

// Comprueba que la promesa (o función) falle con un ErrorHttp del estado indicado.
//   mensaje: RegExp que debe cumplir el mensaje.
//   campos:  campos que deben aparecer en los detalles (sin importar el orden).
export async function rechazaCon(accion, estado, { mensaje, campos } = {}) {
  // async () => … convierte también los errores síncronos (throw) en una promesa rechazada.
  await assert.rejects(async () => (typeof accion === 'function' ? accion() : accion), (error) => {
    assert.ok(error instanceof ErrorHttp, `se esperaba un ErrorHttp y llegó: ${error}`)
    assert.equal(error.estado, estado, `estado esperado ${estado}, recibido ${error.estado}: ${error.message}`)
    if (mensaje) assert.match(error.message, mensaje)
    if (campos) {
      const recibidos = (error.detalles ?? []).map((detalle) => detalle.campo).sort()
      assert.deepEqual(recibidos, [...campos].sort())
    }
    return true
  })
}

// Argumentos de la llamada número `n` (por defecto la primera) de una función falsa.
export const argumentos = (falsa, n = 0) => falsa.mock.calls[n].arguments
