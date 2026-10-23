import { PawPrint } from 'lucide-react'

interface Props {
  // 'claro' sobre fondo oscuro (menú), 'oscuro' sobre fondo claro.
  variante?: 'claro' | 'oscuro'
  subtitulo?: string
}

export default function Logo({ variante = 'claro', subtitulo }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-9 rounded-xl bg-forest-600 flex items-center justify-center flex-shrink-0">
        <PawPrint size={18} className="text-white" />
      </div>
      <div>
        <p className={`font-serif text-lg leading-tight ${variante === 'claro' ? 'text-white' : 'text-forest-800'}`}>Huellas</p>
        {subtitulo && <p className={`text-xs ${variante === 'claro' ? 'text-forest-400' : 'text-gray-500'}`}>{subtitulo}</p>}
      </div>
    </div>
  )
}
