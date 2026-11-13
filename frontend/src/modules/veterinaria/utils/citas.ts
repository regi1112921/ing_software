import type { EstadoCita, TipoCita } from '@/api/tipos'
import { aFecha } from '@/shared/utils/formato'

// HU-11 · Agenda de citas: nombres, colores y cálculo de semanas.

export const NOMBRE_TIPO_CITA: Record<TipoCita, string> = {
  consulta: 'Consulta',
  vacuna: 'Vacuna',
  cirugia: 'Cirugía',
}

export const NOMBRE_ESTADO_CITA: Record<EstadoCita, string> = {
  programada: 'Programada',
  atendida: 'Atendida',
  cancelada: 'Cancelada',
}

export const ESTILO_TIPO_CITA: Record<TipoCita, string> = {
  consulta: 'bg-sky-50 text-sky-700 border-sky-200',
  vacuna: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cirugia: 'bg-purple-50 text-purple-700 border-purple-200',
}

export const ESTILO_ESTADO_CITA: Record<EstadoCita, string> = {
  programada: 'bg-blue-50 text-blue-700 border-blue-200',
  atendida: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelada: 'bg-red-50 text-red-700 border-red-200',
}

// Horarios que se pueden elegir: bloques de 30 minutos de 07:00 a 20:30.
export const HORAS_CITA: string[] = Array.from({ length: 28 }, (_, i) => {
  const minutos = 7 * 60 + i * 30
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
})

// Date local → 'AAAA-MM-DD'.
export function aTexto(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

export function sumarDias(fecha: string, dias: number): string {
  const d = aFecha(fecha)
  d.setDate(d.getDate() + dias)
  return aTexto(d)
}

// Lunes de la semana de la fecha dada.
export function inicioSemana(fecha: string): string {
  const d = aFecha(fecha)
  const desdeLunes = (d.getDay() + 6) % 7
  return sumarDias(fecha, -desdeLunes)
}

// Los 7 días (lunes a domingo) de la semana que empieza en `lunes`.
export function diasDeSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

export function nombreDia(fecha: string): { corto: string; numero: string; mes: string } {
  const d = aFecha(fecha)
  return {
    corto: d.toLocaleDateString('es', { weekday: 'short' }).replace('.', ''),
    numero: String(d.getDate()),
    mes: d.toLocaleDateString('es', { month: 'short' }).replace('.', ''),
  }
}

export function tituloSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6)
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const inicio = aFecha(lunes).toLocaleDateString('es', opciones)
  const fin = aFecha(domingo).toLocaleDateString('es', { ...opciones, year: 'numeric' })
  return `${inicio} – ${fin}`
}
