import type { ReactNode } from 'react'

// Zona con scroll debajo del encabezado de cada pantalla.
export default function Contenido({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex-1 overflow-y-auto p-4 sm:p-7 ${className}`}>{children}</div>
}
