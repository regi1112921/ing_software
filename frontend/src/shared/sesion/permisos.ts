import type { Rol } from '@/api/tipos'
import { useSesion } from './SesionContext'

// HU-07: qué roles pueden usar cada módulo o acción. El backend aplica las mismas
// reglas (403); aquí solo se ocultan menús, pestañas y botones que no corresponden.
export const PERMISOS = {
  dashboard: ['administrador'],
  adopciones: ['administrador', 'responsable_adopciones'],
  registrarAtencion: ['administrador', 'veterinario'],
} as const satisfies Record<string, readonly Rol[]>

export type Permiso = keyof typeof PERMISOS

export function tienePermiso(rol: Rol | undefined, permiso: Permiso): boolean {
  return !!rol && (PERMISOS[permiso] as readonly Rol[]).includes(rol)
}

export function usePermiso(permiso: Permiso): boolean {
  return tienePermiso(useSesion().usuario?.rol, permiso)
}
