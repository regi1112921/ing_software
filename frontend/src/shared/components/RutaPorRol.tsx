import { Navigate, Outlet } from 'react-router-dom'
import { usePermiso, type Permiso } from '@/shared/sesion/permisos'

interface Props {
  permiso: Permiso
  // A dónde se manda a quien no tiene el permiso.
  redirigirA: string
}

// Va dentro de RutaProtegida (ya hay usuario). El backend también lo valida (403).
export default function RutaPorRol({ permiso, redirigirA }: Props) {
  if (!usePermiso(permiso)) return <Navigate to={redirigirA} replace />
  return <Outlet />
}
