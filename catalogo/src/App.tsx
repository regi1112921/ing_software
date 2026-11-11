import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Marco from '@/componentes/Marco'
import CatalogoPage from '@/paginas/CatalogoPage'
import PerroPage from '@/paginas/PerroPage'
import NoEncontradoPage from '@/paginas/NoEncontradoPage'

// HU-09 · Catálogo público de perros en adopción (sin inicio de sesión).
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Marco />}>
          <Route index element={<CatalogoPage />} />
          <Route path="perros/:id" element={<PerroPage />} />
          <Route path="*" element={<NoEncontradoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
