import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import BarraLateral from './BarraLateral'
import Logo from './Logo'
import Aviso from './Aviso'

// Estructura de las pantallas internas: menú lateral + contenido.
export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex h-full bg-warm-50 overflow-hidden">
      <BarraLateral abierta={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Barra superior solo en pantallas pequeñas */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-forest-950">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="text-forest-200 hover:text-white p-1 -ml-1"
          >
            <Menu size={22} />
          </button>
          <Link to="/" aria-label="Ir al inicio" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-400">
            <Logo />
          </Link>
        </div>
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
      <Aviso />
    </div>
  )
}
