import { Link } from 'react-router-dom'
import { PawPrint } from 'lucide-react'

export default function NoEncontradoPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <PawPrint size={40} className="mx-auto text-warm-300 mb-4" />
      <h1 className="font-serif text-3xl text-gray-900 mb-2">Página no encontrada</h1>
      <Link to="/" className="text-sm font-bold text-forest-600 hover:text-forest-700">
        Ver los perros en adopción
      </Link>
    </div>
  )
}
