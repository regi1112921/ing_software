// Configuración común: lee el .env de la raíz del repositorio (si existe)
// y expone los valores que usan todos los servicios.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const rutaEnv = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(rutaEnv)) {
  dotenv.config({ path: rutaEnv, quiet: true })
}

function entero(nombre, porDefecto) {
  const valor = process.env[nombre]
  if (valor === undefined || valor === '') return porDefecto
  const numero = Number.parseInt(valor, 10)
  if (Number.isNaN(numero)) throw new Error(`La variable ${nombre} debe ser un número (recibido: ${valor}).`)
  return numero
}

function obligatoria(nombre) {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Revisa el archivo .env (ver .env.example).`)
  return valor
}

export const puertos = {
  veterinaria: () => entero('VETERINARIA_PORT', 3001),
  adopcion: () => entero('ADOPCION_PORT', 3002),
  dashboard: () => entero('DASHBOARD_PORT', 3003),
  autenticacion: () => entero('AUTENTICACION_PORT', 3004),
}

export function configBaseDatos() {
  return {
    connectionString: obligatoria('DATABASE_URL'),
    ssl: process.env.DB_SSL !== 'false',
    max: entero('DB_POOL_MAX', 5),
  }
}

export function urlAutenticacion() {
  return process.env.AUTENTICACION_URL || `http://localhost:${puertos.autenticacion()}`
}

export function origenesCors() {
  const valor = process.env.CORS_ORIGENES
  if (!valor || valor === '*') return '*'
  return valor.split(',').map((origen) => origen.trim()).filter(Boolean)
}

export function horasSesion() {
  return entero('SESION_HORAS', 8)
}
