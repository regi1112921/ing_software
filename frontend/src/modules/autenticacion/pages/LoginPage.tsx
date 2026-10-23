import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useSesion } from '@/shared/sesion/SesionContext'
import Campo from '@/shared/components/Campo'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, CLASE_INPUT } from '@/shared/utils/estilos'
import MarcoAcceso from '../components/MarcoAcceso'

// HU-02 · Iniciar sesión
export default function LoginPage() {
  const { usuario, aviso, iniciarSesion } = useSesion()
  const navegar = useNavigate()
  const destino = (useLocation().state as { desde?: string } | null)?.desde ?? '/'

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (usuario) return <Navigate to={destino} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await iniciarSesion(correo.trim(), contrasena)
      navegar(destino, { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <MarcoAcceso titulo="Iniciar sesión" subtitulo="Ingresa con tu correo y contraseña del albergue.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {(error || aviso) && <MensajeError mensaje={error ?? aviso!} />}
        <Campo etiqueta="Correo">
          <input
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="usuario@albergue.com"
            className={CLASE_INPUT}
          />
        </Campo>
        <Campo etiqueta="Contraseña">
          <div className="relative">
            <input
              type={verContrasena ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              className={`${CLASE_INPUT} pr-10`}
            />
            <button
              type="button"
              onClick={() => setVerContrasena((v) => !v)}
              aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              {verContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Campo>
        <button type="submit" disabled={enviando || !correo || !contrasena} className={`${BOTON_PRIMARIO} w-full mt-2`}>
          {enviando && <LoaderCircle size={16} className="animate-spin" />}
          {enviando ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="text-sm text-gray-500 text-center mt-6">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-bold text-forest-600 hover:text-forest-700">
          Crear cuenta
        </Link>
      </p>
    </MarcoAcceso>
  )
}
