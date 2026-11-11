import { Home, Phone } from 'lucide-react'
import type { TipoSeguimiento } from '@/api/tipos'
import { aFecha, hoy } from '@/shared/utils/formato'

// HU-10 · Mismo plazo que GET /seguimientos/pendientes por defecto.
export const DIAS_SIN_SEGUIMIENTO = 30

export const TIPOS_SEGUIMIENTO: Record<TipoSeguimiento, { nombre: string; icono: typeof Home }> = {
  visita: { nombre: 'Visita', icono: Home },
  llamada: { nombre: 'Llamada', icono: Phone },
}

// Días completos entre una fecha 'AAAA-MM-DD' y hoy.
export const diasDesde = (fecha: string) => Math.round((aFecha(hoy()).getTime() - aFecha(fecha).getTime()) / 86_400_000)
