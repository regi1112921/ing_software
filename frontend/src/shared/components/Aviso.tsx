import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, X } from 'lucide-react'

// Muestra el mensaje que otra pantalla dejó al navegar:
//   navigate('/perros/5', { state: { aviso: 'Perro registrado.' } })
export default function Aviso() {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    const aviso = (ubicacion.state as { aviso?: string } | null)?.aviso
    if (!aviso) return
    setMensaje(aviso)
    // Se limpia del historial para que no reaparezca al recargar.
    navegar(ubicacion.pathname + ubicacion.search, { replace: true, state: null })
  }, [ubicacion, navegar])

  useEffect(() => {
    if (!mensaje) return
    const temporizador = window.setTimeout(() => setMensaje(null), 4000)
    return () => window.clearTimeout(temporizador)
  }, [mensaje])

  if (!mensaje) return null
  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 left-5 sm:left-auto z-50 flex items-center gap-3 rounded-xl bg-forest-950 text-white px-4 py-3 shadow-lg text-sm"
    >
      <CheckCircle2 size={18} className="text-forest-300 flex-shrink-0" />
      <p className="flex-1">{mensaje}</p>
      <button type="button" onClick={() => setMensaje(null)} aria-label="Cerrar aviso" className="text-forest-300 hover:text-white">
        <X size={16} />
      </button>
    </div>
  )
}
