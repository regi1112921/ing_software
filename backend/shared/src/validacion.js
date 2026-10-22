// Validación de datos de entrada con zod y piezas reutilizables.
import { z } from 'zod'
import { solicitudInvalida } from './errores.js'

z.config(z.locales.es())

export { z }

// Lanza 400 con un detalle por campo si los datos no cumplen el esquema.
export function validar(esquema, datos) {
  const resultado = esquema.safeParse(datos ?? {})
  if (resultado.success) return resultado.data
  const detalles = resultado.error.issues.map((issue) => ({
    campo: issue.path.join('.') || null,
    mensaje: issue.message,
  }))
  throw solicitudInvalida('Datos inválidos.', detalles)
}

// Fecha de hoy en formato AAAA-MM-DD (hora local del servidor).
export function hoy() {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

export const campos = {
  id: (nombre) =>
    z.coerce.number({ error: `${nombre} debe ser un número.` }).int().positive(`${nombre} no es válido.`),

  texto: (nombre, max = 200) =>
    z
      .string({ error: `${nombre} es obligatorio.` })
      .trim()
      .min(1, `${nombre} es obligatorio.`)
      .max(max, `${nombre} no puede superar ${max} caracteres.`),

  // Texto opcional: '' o solo espacios se guardan como null.
  textoOpcional: (nombre, max = 1000) =>
    z
      .string()
      .trim()
      .max(max, `${nombre} no puede superar ${max} caracteres.`)
      .nullish()
      .transform((valor) => (valor ? valor : null)),

  fecha: (nombre) =>
    z.iso.date({ error: `${nombre} debe ser una fecha válida (AAAA-MM-DD).` }),
}
