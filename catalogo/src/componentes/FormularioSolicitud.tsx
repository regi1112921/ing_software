import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { ErrorApi, api, type PerroPublico } from '@/api'
import { BOTON_PRIMARIO, CLASE_INPUT } from '@/utilidades'

// HU-09 · Iniciar la solicitud de adopción desde la ficha del perro.
// Queda como pre-solicitud: el responsable de adopciones la revisa y contacta a la persona.
export default function FormularioSolicitud({ perro }: { perro: PerroPublico }) {
  const [form, setForm] = useState({ nombre_completo: '', telefono: '', correo: '', mensaje: '', sitio_web: '' })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  function cambiar(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores(({ [campo]: _, ...resto }) => resto)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setErrores({})
    setEnviando(true)
    try {
      const { mensaje } = await api.enviarSolicitud({
        perro_id: perro.id,
        nombre_completo: form.nombre_completo.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim() || null,
        mensaje: form.mensaje.trim() || null,
        sitio_web: form.sitio_web,
      })
      setConfirmacion(mensaje)
    } catch (err) {
      if (err instanceof ErrorApi && Object.keys(err.porCampo).length > 0) {
        setErrores(err.porCampo)
        setError('Revisa los campos marcados.')
      } else {
        setError((err as Error).message)
      }
    } finally {
      setEnviando(false)
    }
  }

  if (confirmacion) {
    return (
      <div role="status" className="bg-forest-50 border border-forest-200 rounded-2xl p-6 text-center">
        <CheckCircle2 size={36} className="mx-auto text-forest-600 mb-3" />
        <p className="font-bold text-forest-900 mb-1">Solicitud enviada</p>
        <p className="text-sm text-forest-800">{confirmacion}</p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} noValidate className="bg-white border border-warm-200 rounded-2xl p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-serif text-2xl text-gray-900">Quiero adoptar a {perro.nombre}</h2>
        <p className="text-sm text-gray-500 mt-1">Déjanos tus datos y el albergue se comunicará contigo para continuar el proceso.</p>
      </div>
      {error && (
        <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </p>
      )}
      <Campo etiqueta="Nombre completo" obligatorio error={errores.nombre_completo}>
        {(props) => (
          <input {...props} required maxLength={150} autoComplete="name" value={form.nombre_completo} onChange={(e) => cambiar('nombre_completo', e.target.value)} className={CLASE_INPUT} />
        )}
      </Campo>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo etiqueta="Teléfono" obligatorio error={errores.telefono}>
          {(props) => (
            <input {...props} required type="tel" autoComplete="tel" placeholder="Ej: 70012345" value={form.telefono} onChange={(e) => cambiar('telefono', e.target.value)} className={CLASE_INPUT} />
          )}
        </Campo>
        <Campo etiqueta="Correo" error={errores.correo}>
          {(props) => (
            <input {...props} type="email" autoComplete="email" placeholder="Opcional" value={form.correo} onChange={(e) => cambiar('correo', e.target.value)} className={CLASE_INPUT} />
          )}
        </Campo>
      </div>
      <Campo etiqueta="Cuéntanos sobre tu hogar" error={errores.mensaje}>
        {(props) => (
          <textarea
            {...props}
            rows={4}
            maxLength={1000}
            placeholder="¿Tienes patio? ¿Otras mascotas? ¿Quiénes viven contigo? (opcional)"
            value={form.mensaje}
            onChange={(e) => cambiar('mensaje', e.target.value)}
            className={`${CLASE_INPUT} resize-y min-h-[96px]`}
          />
        )}
      </Campo>
      {/* Campo trampa para bots: oculto para las personas y para los lectores de pantalla. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>
          Sitio web
          <input tabIndex={-1} autoComplete="off" value={form.sitio_web} onChange={(e) => cambiar('sitio_web', e.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={enviando} className={`${BOTON_PRIMARIO} w-full`}>
        {enviando && <LoaderCircle size={16} className="animate-spin" />}
        {enviando ? 'Enviando…' : 'Enviar solicitud de adopción'}
      </button>
      <p className="text-xs text-gray-400 text-center">Usamos tus datos solo para contactarte sobre esta adopción.</p>
    </form>
  )
}

interface PropsCampo {
  etiqueta: string
  obligatorio?: boolean
  error?: string
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
}

function Campo({ etiqueta, obligatorio, error, children }: PropsCampo) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
        {etiqueta} {obligatorio && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined })}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  )
}
