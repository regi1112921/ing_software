import { useState } from 'react'
import { PawPrint } from 'lucide-react'

interface Props {
  url: string | null
  nombre: string
  className?: string
  tamanoIcono?: number
}

// Foto del perro con un marcador si no tiene foto o la URL no carga.
export default function FotoPerro({ url, nombre, className = '', tamanoIcono = 32 }: Props) {
  const [fallida, setFallida] = useState<string | null>(null)

  if (!url || url === fallida) {
    return (
      <div className={`bg-warm-100 flex items-center justify-center ${className}`} role="img" aria-label={`${nombre} (sin foto)`}>
        <PawPrint size={tamanoIcono} className="text-warm-300" />
      </div>
    )
  }
  return <img src={url} alt={nombre} loading="lazy" onError={() => setFallida(url)} className={`object-cover ${className}`} />
}
