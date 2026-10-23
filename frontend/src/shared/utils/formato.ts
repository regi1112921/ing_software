import type { Rol, Sexo } from '@/api/tipos'

// 'AAAA-MM-DD' → Date local. new Date('AAAA-MM-DD') la toma como UTC y en
// zonas horarias negativas (Bolivia, Colombia) muestra el día anterior.
export function aFecha(fecha: string): Date {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  return aFecha(fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Fecha de hoy en 'AAAA-MM-DD' (hora local).
export function hoy(): string {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

export function formatearEdad(edadMeses: number | null | undefined, estimada = false): string {
  if (edadMeses === null || edadMeses === undefined) return 'Desconocida'
  const prefijo = estimada ? '≈ ' : ''
  if (edadMeses < 12) return `${prefijo}${edadMeses} ${edadMeses === 1 ? 'mes' : 'meses'}`
  const anios = Math.floor(edadMeses / 12)
  return `${prefijo}${anios} ${anios === 1 ? 'año' : 'años'}`
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]!.toUpperCase())
    .join('')
}

export const NOMBRE_SEXO: Record<Sexo, string> = { macho: 'Macho', hembra: 'Hembra' }

export const NOMBRE_ROL: Record<Rol, string> = {
  administrador: 'Administración',
  veterinario: 'Veterinaria',
  personal: 'Personal del albergue',
}
