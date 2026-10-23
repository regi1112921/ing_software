import { Navigate, Outlet } from 'react-router-dom'
import type { Rol } from '@/api/tipos'
import { useSesion } from '@/shared/sesion/SesionContext'

interface Props {
  roles: Rol[]
  // A dónde se manda a quien no tiene el rol.
  redirigirA: string
}

// Va dentro de RutaProtegida (ya hay usuario). El backend también lo valida (403).
export default function RutaPorRol({ roles, redirigirA }: Props) {
  const { usuario } = useSesion()
  if (!usuario || !roles.includes(usuario.rol)) return <Navigate to={redirigirA} replace />
  return <Outlet />
}
