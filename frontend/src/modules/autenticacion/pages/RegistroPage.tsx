import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { ErrorApi } from '@/api/http'
import { useSesion } from '@/shared/sesion/SesionContext'
import Campo from '@/shared/components/Campo'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, CLASE_INPUT } from '@/shared/utils/estilos'
import MarcoAcceso from '../components/MarcoAcceso'

// Crear cuenta. Siempre como personal del albergue; al terminar queda la sesión iniciada.
export default function RegistroPage() {
  const { usuario, registrarse } = useSesion()
  const navegar = useNavigate()

  const [form, setForm] = useState({ nombre_completo: '', correo: '', contrasena: '', confirmacion: '' })
  const [verContrasena, setVerContrasena] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  function cambiar(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores(({ [campo]: _, ...resto }) => resto)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    if (form.contrasena !== form.confirmacion) {
      setErrores({ confirmacion: 'Las contraseñas no coinciden.' })
      return
    }
    setErrores({})
    setEnviando(true)
    try {
      await registrarse({ nombre_completo: form.nombre_completo.trim(), correo: form.correo.trim(), contrasena: form.contrasena })
      // El personal empieza en Perros (no ve el dashboard).
      navegar('/perros', { replace: true, state: { aviso: '¡Cuenta creada! Ya puedes usar el sistema.' } })
    } catch (err) {
      setEnviando(false)
      if (err instanceof ErrorApi && err.detalles.length > 0) {
        setErrores(err.porCampo)
        setErrorGeneral(err.estado === 409 ? err.message : 'Revisa los campos marcados.')
      } else {
        setErrorGeneral((err as Error).message)
      }
    }
  }

  const completo = form.nombre_completo && form.correo && form.contrasena && form.confirmacion

  return (
    <MarcoAcceso titulo="Crear cuenta" subtitulo="Regístrate como personal del albergue para iniciar sesión.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {errorGeneral && <MensajeError mensaje={errorGeneral} />}
        <Campo etiqueta="Nombre completo" obligatorio error={errores.nombre_completo}>
          <input
            required
            autoFocus
            maxLength={150}
            autoComplete="name"
            value={form.nombre_completo}
            onChange={(e) => cambiar('nombre_completo', e.target.value)}
            placeholder="Nombre y apellidos"
            className={CLASE_INPUT}
          />
        </Campo>
        <Campo etiqueta="Correo" obligatorio error={errores.correo}>
          <input
            required
            type="email"
            autoComplete="email"
            value={form.correo}
            onChange={(e) => cambiar('correo', e.target.value)}
            placeholder="usuario@albergue.com"
            className={CLASE_INPUT}
          />
        </Campo>
        <Campo etiqueta="Contraseña" obligatorio error={errores.contrasena} ayuda="Al menos 8 caracteres.">
          <div className="relative">
            <input
              required
              type={verContrasena ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={form.contrasena}
              onChange={(e) => cambiar('contrasena', e.target.value)}
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
        <Campo etiqueta="Repite la contraseña" obligatorio error={errores.confirmacion}>
          <input
            required
            type={verContrasena ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={72}
            value={form.confirmacion}
            onChange={(e) => cambiar('confirmacion', e.target.value)}
            placeholder="••••••••"
            className={CLASE_INPUT}
          />
        </Campo>
        <button type="submit" disabled={enviando || !completo} className={`${BOTON_PRIMARIO} w-full mt-2`}>
          {enviando && <LoaderCircle size={16} className="animate-spin" />}
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="text-sm text-gray-500 text-center mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-bold text-forest-600 hover:text-forest-700">
          Iniciar sesión
        </Link>
      </p>
    </MarcoAcceso>
  )
}
