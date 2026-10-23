import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSesion } from '@/shared/sesion/SesionContext'
import Cargando from './Cargando'

// Deja pasar solo con sesión iniciada; si no, manda al inicio de sesión
// recordando a qué pantalla se quería entrar.
export default function RutaProtegida() {
  const { usuario, verificando } = useSesion()
  const ubicacion = useLocation()

  if (verificando) {
    return (
      <div className="h-full flex items-center justify-center">
        <Cargando texto="Verificando sesión…" />
      </div>
    )
  }
  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />
  }
  return <Outlet />
}
