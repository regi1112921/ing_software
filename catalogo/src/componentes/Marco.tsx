import { Link, NavLink, Outlet } from 'react-router-dom'
import { Heart, PawPrint, Sparkles } from 'lucide-react'

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-semibold flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${
    isActive ? 'bg-forest-800 text-white' : 'text-forest-100 hover:text-white'
  }`

// Encabezado y pie comunes del catálogo público.
export default function Marco() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-forest-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="size-9 rounded-xl bg-forest-600 flex items-center justify-center">
              <PawPrint size={18} />
            </span>
            <span>
              <span className="block font-serif text-xl leading-none">Huellas</span>
              <span className="block text-xs text-forest-300">Albergue Peluchín</span>
            </span>
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/" end className={claseEnlace}>
              <Heart size={15} /> <span className="hidden sm:inline">Perros en adopción</span>
              <span className="sm:hidden">Perros</span>
            </NavLink>
            {/* HU-14: historias de adopciones exitosas. */}
            <NavLink to="/historias" className={claseEnlace}>
              <Sparkles size={15} /> <span>Historias</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-warm-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-sm text-gray-500 flex flex-wrap gap-2 justify-between">
          <p>Albergue de perros Peluchín · Cada adopción cambia una vida.</p>
          <p>Las solicitudes las revisa el equipo del albergue antes de contactarte.</p>
        </div>
      </footer>
    </div>
  )
}
