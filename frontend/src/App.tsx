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
import HistorialMedico from '@/modules/veterinaria/components/HistorialMedico'
import AtencionFormPage from '@/modules/veterinaria/pages/AtencionFormPage'

export default function App() {
  return (
    <BrowserRouter>
      <SesionProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />

          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              {/* Solo la administración ve el dashboard; el resto empieza en Perros. */}
              <Route element={<RutaPorRol roles={['administrador']} redirigirA="/perros" />}>
                <Route index element={<DashboardPage />} />
              </Route>

              <Route path="perros" element={<PerrosPage />} />
              <Route path="perros/nuevo" element={<PerroFormPage />} />
              <Route
                path="perros/:id"
                element={<PerroDetallePage pestanaHistorial={(perro) => <HistorialMedico perroId={perro.id} />} />}
              />
              <Route path="perros/:id/editar" element={<PerroFormPage />} />
              <Route path="perros/:id/atenciones/nueva" element={<AtencionFormPage />} />

              <Route path="adopciones" element={<AdopcionesPage />} />
              <Route path="adopciones/nueva" element={<AdopcionFormPage />} />
              <Route path="adopciones/:id" element={<AdopcionDetallePage />} />

              <Route path="*" element={<NoEncontradoPage />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </BrowserRouter>
  )
}
