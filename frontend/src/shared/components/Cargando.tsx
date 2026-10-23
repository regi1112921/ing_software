import { LoaderCircle } from 'lucide-react'

export default function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
      <LoaderCircle size={18} className="animate-spin" />
      {texto}
    </div>
  )
}
