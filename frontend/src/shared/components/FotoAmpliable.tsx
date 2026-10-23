import { useRef } from 'react'
import { X, ZoomIn } from 'lucide-react'
import FotoPerro from './FotoPerro'

interface Props {
  url: string | null | undefined
  nombre: string
  className?: string
  tamanoIcono?: number
}

// Foto del perro que al tocarla se abre completa (sin recortar) en un visor.
// Usa <dialog>: Esc lo cierra y el foco queda dentro mientras está abierto.
export default function FotoAmpliable({ url, nombre, className = '', tamanoIcono }: Props) {
  const visor = useRef<HTMLDialogElement>(null)

  if (!url) return <FotoPerro url={url} nombre={nombre} className={className} tamanoIcono={tamanoIcono} />

  return (
    <>
      <button
        type="button"
        onClick={() => visor.current?.showModal()}
        aria-label={`Ver la foto de ${nombre} completa`}
        className={`group relative block overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 ${className}`}
      >
        <FotoPerro url={url} nombre={nombre} className="w-full h-full" tamanoIcono={tamanoIcono} />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <ZoomIn size={14} />
        </span>
      </button>

      <dialog
        ref={visor}
        aria-label={`Foto de ${nombre}`}
        // Clic fuera de la foto (en el fondo) cierra el visor.
        onClick={(e) => e.target === e.currentTarget && visor.current?.close()}
        className="m-auto max-w-[95vw] max-h-[95vh] bg-transparent p-0 backdrop:bg-black/80"
      >
        <figure className="relative">
          <img src={url} alt={nombre} className="block max-w-[95vw] max-h-[85vh] w-auto h-auto rounded-lg object-contain" />
          <figcaption className="mt-2 text-center text-sm font-semibold text-white">{nombre}</figcaption>
          <button
            type="button"
            onClick={() => visor.current?.close()}
            aria-label="Cerrar"
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X size={18} />
          </button>
        </figure>
      </dialog>
    </>
  )
}
