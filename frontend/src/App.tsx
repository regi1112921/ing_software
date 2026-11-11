import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SesionProvider from '@/shared/sesion/SesionProvider'
import Layout from '@/shared/components/Layout'
import NoEncontradoPage from '@/shared/components/NoEncontradoPage'
import RutaPorRol from '@/shared/components/RutaPorRol'
import RutaProtegida from '@/shared/components/RutaProtegida'
import LoginPage from '@/modules/autenticacion/pages/LoginPage'
import RegistroPage from '@/modules/autenticacion/pages/RegistroPage'
import DashboardPage from '@/modules/dashboard/pages/DashboardPage'
import PerrosPage from '@/modules/adopcion/pages/PerrosPage'
import PerroFormPage from '@/modules/adopcion/pages/PerroFormPage'
import PerroDetallePage from '@/modules/adopcion/pages/PerroDetallePage'
import AdopcionesPage from '@/modules/adopcion/pages/AdopcionesPage'
import AdopcionFormPage from '@/modules/adopcion/pages/AdopcionFormPage'
import AdopcionDetallePage from '@/modules/adopcion/pages/AdopcionDetallePage'
import SolicitudesWebPage from '@/modules/adopcion/pages/SolicitudesWebPage'
import SeguimientosPage from '@/modules/adopcion/pages/SeguimientosPage'
import HistorialMedico from '@/modules/veterinaria/components/HistorialMedico'
import AtencionFormPage from '@/modules/veterinaria/pages/AtencionFormPage'
import ControlesPendientesPage from '@/modules/veterinaria/pages/ControlesPendientesPage'
import ControlFormPage from '@/modules/veterinaria/pages/ControlFormPage'

export default function App() {
  return (
    <BrowserRouter>
      <SesionProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />

          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              {/* Solo la administración ve el dashboard; el resto empieza en Perros (HU-07). */}
              <Route element={<RutaPorRol permiso="dashboard" redirigirA="/perros" />}>
                <Route index element={<DashboardPage />} />
              </Route>

              <Route path="perros" element={<PerrosPage />} />
              <Route path="perros/nuevo" element={<PerroFormPage />} />
              <Route
                path="perros/:id"
                element={<PerroDetallePage pestanaHistorial={(perro) => <HistorialMedico perroId={perro.id} />} />}
              />
              <Route path="perros/:id/editar" element={<PerroFormPage />} />
              <Route element={<RutaPorRol permiso="registrarAtencion" redirigirA="/perros" />}>
                <Route path="perros/:id/atenciones/nueva" element={<AtencionFormPage />} />
              </Route>

              {/* HU-08: controles pendientes y registro de vacunas y desparasitaciones. */}
              <Route element={<RutaPorRol permiso="controles" redirigirA="/perros" />}>
                <Route path="controles" element={<ControlesPendientesPage />} />
                <Route path="perros/:id/controles/nuevo" element={<ControlFormPage />} />
              </Route>

              {/* HU-07: Adopciones es de administración y de responsables de adopciones. */}
              <Route element={<RutaPorRol permiso="adopciones" redirigirA="/perros" />}>
                <Route path="adopciones" element={<AdopcionesPage />} />
                <Route path="adopciones/nueva" element={<AdopcionFormPage />} />
                <Route path="adopciones/:id" element={<AdopcionDetallePage />} />
                <Route path="solicitudes-web" element={<SolicitudesWebPage />} />
                {/* HU-10 (sprint 2): seguimiento después de la adopción. */}
                <Route path="seguimientos" element={<SeguimientosPage />} />
              </Route>

              <Route path="*" element={<NoEncontradoPage />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </BrowserRouter>
  )
}
