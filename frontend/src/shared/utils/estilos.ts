import type { EstadoAdopcion, EstadoPerro } from '@/api/tipos'

// Clases de Tailwind reutilizadas en formularios y botones.

export const CLASE_INPUT =
  'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent ' +
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed ' +
  'aria-[invalid=true]:border-red-300 aria-[invalid=true]:ring-red-200'
export const CLASE_SELECT = `${CLASE_INPUT} appearance-none pr-9`
export const CLASE_TEXTAREA = `${CLASE_INPUT} resize-y min-h-[84px]`

const BOTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'
export const BOTON_PRIMARIO = `${BOTON_BASE} px-4 py-2.5 bg-forest-600 hover:bg-forest-700 text-white`
export const BOTON_SECUNDARIO = `${BOTON_BASE} px-4 py-2.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`
export const BOTON_PELIGRO = `${BOTON_BASE} px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white`
export const ENLACE_ACCION = 'inline-flex items-center gap-1 text-forest-600 hover:text-forest-700 text-xs font-bold whitespace-nowrap'

export const TARJETA = 'bg-white rounded-xl border border-warm-200'

export const ESTILO_ESTADO_PERRO: Record<EstadoPerro, string> = {
  disponible: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  en_tratamiento: 'bg-amber-50 text-amber-700 border-amber-200',
  en_adopcion: 'bg-blue-50 text-blue-700 border-blue-200',
  adoptado: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const ESTILO_ESTADO_ADOPCION: Record<EstadoAdopcion, string> = {
  en_proceso: 'bg-blue-50 text-blue-700 border-blue-200',
  aprobada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rechazada: 'bg-red-50 text-red-700 border-red-200',
  finalizada: 'bg-gray-100 text-gray-600 border-gray-200',
}

// Color de las barras y tarjetas del dashboard por estado del perro.
export const COLOR_ESTADO_PERRO: Record<EstadoPerro, { barra: string; tarjeta: string; icono: string }> = {
  disponible: { barra: 'bg-emerald-500', tarjeta: 'bg-emerald-50 border-emerald-200', icono: 'text-emerald-600' },
  en_tratamiento: { barra: 'bg-amber-500', tarjeta: 'bg-amber-50 border-amber-200', icono: 'text-amber-600' },
  en_adopcion: { barra: 'bg-blue-500', tarjeta: 'bg-blue-50 border-blue-200', icono: 'text-blue-600' },
  adoptado: { barra: 'bg-gray-400', tarjeta: 'bg-gray-50 border-gray-200', icono: 'text-gray-500' },
}
