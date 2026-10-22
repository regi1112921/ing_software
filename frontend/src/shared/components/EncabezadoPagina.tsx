import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface Props {
  titulo: ReactNode
  subtitulo?: ReactNode
  // Ruta a la que vuelve la flecha (si se omite, no se muestra).
  volverA?: string
  // Elemento junto al título (por ejemplo, la insignia de estado).
  insignia?: ReactNode
  acciones?: ReactNode
}

export default function EncabezadoPagina({ titulo, subtitulo, volverA, insignia, acciones }: Props) {
  return (
    <header className="px-4 sm:px-8 py-5 border-b border-warm-200 bg-white flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {volverA && (
          <Link
            to={volverA}
            aria-label="Volver"
            className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">{titulo}</h1>
            {insignia}
          </div>
          {subtitulo && <p className="text-gray-500 text-sm mt-0.5">{subtitulo}</p>}
        </div>
      </div>
      {acciones && <div className="flex items-center gap-2 flex-wrap">{acciones}</div>}
    </header>
  )
}
