import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useSesion } from '@/shared/sesion/SesionContext'
import Campo from '@/shared/components/Campo'
import Logo from '@/shared/components/Logo'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, CLASE_INPUT } from '@/shared/utils/estilos'

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
    <div className="h-full flex">
      <section className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-forest-950 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542715234-bd0adb4249b7?w=800&h=1000&fit=crop&auto=format"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative">
          <p className="text-forest-400 text-xs uppercase tracking-widest font-semibold mb-4">Gestión del albergue</p>
          <h2 className="font-serif text-white text-4xl leading-snug mb-4">
            Cada perro merece
            <br />
            un hogar seguro.
          </h2>
          <p className="text-forest-300 text-sm leading-relaxed max-w-xs">
            Registro, seguimiento médico y adopciones. Todo el albergue en un solo lugar.
          </p>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center bg-warm-50 p-6 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <Logo variante="oscuro" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
          <p className="text-gray-500 text-sm mb-8">Ingresa con tu correo y contraseña del albergue.</p>

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
        </div>
      </section>
    </div>
  )
}
