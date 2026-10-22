import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Heart, LayoutDashboard, LoaderCircle, LogOut, PawPrint, X } from 'lucide-react'
import { useSesion } from '@/shared/sesion/SesionContext'
import { NOMBRE_ROL, iniciales } from '@/shared/utils/formato'
import Logo from './Logo'

const ENLACES = [
  { a: '/', etiqueta: 'Dashboard', icono: LayoutDashboard, exacto: true },
  { a: '/perros', etiqueta: 'Perros', icono: PawPrint, exacto: false },
  { a: '/adopciones', etiqueta: 'Adopciones', icono: Heart, exacto: false },
]

interface Props {
  abierta: boolean
  onCerrar: () => void
}

export default function BarraLateral({ abierta, onCerrar }: Props) {
  const { usuario, cerrarSesion } = useSesion()
  const [saliendo, setSaliendo] = useState(false)

  async function salir() {
    setSaliendo(true)
    await cerrarSesion()
  }

  return (
    <>
      {/* Fondo oscuro detrás del menú en pantallas pequeñas */}
      <div
        onClick={onCerrar}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden transition-opacity ${abierta ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-forest-950 flex flex-col transition-transform lg:static lg:translate-x-0 lg:w-60 lg:flex-shrink-0 ${
          abierta ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-forest-900 flex items-center justify-between">
          <Logo subtitulo="Gestión del albergue" />
          <button type="button" onClick={onCerrar} aria-label="Cerrar menú" className="lg:hidden text-forest-300 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Principal" className="flex-1 p-3 pt-4 space-y-0.5">
          {ENLACES.map(({ a, etiqueta, icono: Icono, exacto }) => (
            <NavLink
              key={a}
              to={a}
              end={exacto}
              onClick={onCerrar}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive ? 'bg-forest-700 text-white' : 'text-forest-300 hover:bg-forest-800 hover:text-white'
                }`
              }
            >
              <Icono size={17} />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        {usuario && (
          <div className="p-4 border-t border-forest-900">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="size-8 rounded-full bg-forest-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {iniciales(usuario.nombre_completo)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate" title={usuario.nombre_completo}>
                  {usuario.nombre_completo}
                </p>
                <p className="text-forest-400 text-xs truncate">{NOMBRE_ROL[usuario.rol] ?? usuario.rol}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={salir}
              disabled={saliendo}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-forest-300 hover:text-white hover:bg-forest-800 text-sm transition-colors disabled:opacity-60"
            >
              {saliendo ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
