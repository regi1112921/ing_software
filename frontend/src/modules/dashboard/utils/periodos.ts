import type { Periodo } from '@/api/tipos'
import { aFecha, hoy } from '@/shared/utils/formato'

// HU-12 · Atajos del filtro de fechas del dashboard.

export type Atajo = 'mes' | 'trimestre' | 'anio' | 'personalizado'

export const NOMBRE_ATAJO: Record<Exclude<Atajo, 'personalizado'>, string> = {
  mes: 'Este mes',
  trimestre: 'Últimos 3 meses',
  anio: 'Este año',
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')
const texto = (anio: number, mes: number, dia: number) => `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`
const ultimoDia = (anio: number, mes: number) => new Date(anio, mes, 0).getDate()

// Rango de cada atajo, calculado desde hoy (hora local). Los meses van completos.
export function rangoDeAtajo(atajo: Exclude<Atajo, 'personalizado'>, referencia = hoy()): Periodo {
  const [anio, mes] = referencia.split('-').map(Number)
  const finDeMes = texto(anio, mes, ultimoDia(anio, mes))
  if (atajo === 'mes') return { desde: texto(anio, mes, 1), hasta: finDeMes }
  if (atajo === 'trimestre') {
    const inicio = new Date(anio, mes - 3, 1)
    return { desde: texto(inicio.getFullYear(), inicio.getMonth() + 1, 1), hasta: finDeMes }
  }
  return { desde: texto(anio, 1, 1), hasta: texto(anio, 12, 31) }
}

// Qué atajo corresponde a un rango (para marcar el botón activo).
export function atajoDe(periodo: Periodo): Atajo {
  for (const atajo of Object.keys(NOMBRE_ATAJO) as Exclude<Atajo, 'personalizado'>[]) {
    const rango = rangoDeAtajo(atajo)
    if (rango.desde === periodo.desde && rango.hasta === periodo.hasta) return atajo
  }
  return 'personalizado'
}

// '1 nov – 30 nov 2026'
export function describirPeriodo({ desde, hasta }: Periodo): string {
  const inicio = aFecha(desde)
  const fin = aFecha(hasta)
  const mismoAnio = inicio.getFullYear() === fin.getFullYear()
  const textoInicio = inicio.toLocaleDateString('es', mismoAnio ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
  const textoFin = fin.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
  return desde === hasta ? textoFin : `${textoInicio} – ${textoFin}`
}

// Etiqueta del eje del gráfico: '5' para un día, 'nov' o 'nov 26' para un mes.
export function etiquetaPunto(periodo: string, conAnio = false): string {
  if (periodo.length === 10) return String(aFecha(periodo).getDate())
  const [anio, mes] = periodo.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, 1)
  const nombre = fecha.toLocaleDateString('es', { month: 'short' }).replace('.', '')
  return conAnio ? `${nombre} ${String(anio).slice(2)}` : nombre
}

// Nombre completo para la tabla accesible y los tooltips.
export function nombrePunto(periodo: string): string {
  if (periodo.length === 10) return aFecha(periodo).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  const [anio, mes] = periodo.split('-').map(Number)
  return new Date(anio, mes - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
}
