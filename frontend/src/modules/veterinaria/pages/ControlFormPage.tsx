import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { ErrorApi } from '@/api/http'
import type { TipoDesparasitacion } from '@/api/tipos'
import { veterinariaApi } from '@/api/veterinaria.api'
import { useSesion } from '@/shared/sesion/SesionContext'
import { useCarga } from '@/shared/hooks/useCarga'
import Campo from '@/shared/components/Campo'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_INPUT, CLASE_SELECT, CLASE_TEXTAREA, TARJETA } from '@/shared/utils/estilos'
import { hoy } from '@/shared/utils/formato'

type TipoControl = 'vacuna' | 'desparasitacion'

const TIPOS: { id: TipoControl; etiqueta: string }[] = [
  { id: 'vacuna', etiqueta: 'Vacuna' },
  { id: 'desparasitacion', etiqueta: 'Desparasitación' },
]

// HU-08 · Registrar una vacuna o una desparasitación. Al guardarla, el control
// pendiente del mismo tipo (y misma vacuna) sale de la lista de pendientes.
// Desde la lista llega con ?desde=controles&tipo=…&nombre=… (o &subtipo=…).
export default function ControlFormPage() {
  const { id: perroId } = useParams()
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const { usuario } = useSesion()
  const volverA = parametros.get('desde') === 'controles' ? '/controles' : `/perros/${perroId}?pestana=historial`

  const { datos, error, recargar } = useCarga(
    () => Promise.all([adopcionApi.obtenerPerro(perroId!), veterinariaApi.listarVeterinarios()]),
    [perroId],
  )
  const [perro, respuestaVeterinarios] = datos ?? []
  const veterinarios = respuestaVeterinarios?.veterinarios ?? []

  const [tipo, setTipo] = useState<TipoControl>(parametros.get('tipo') === 'desparasitacion' ? 'desparasitacion' : 'vacuna')
  const [form, setForm] = useState({
    nombre: parametros.get('nombre') ?? '',
    subtipo: (parametros.get('subtipo') === 'externa' ? 'externa' : 'interna') as TipoDesparasitacion,
    producto: '',
    fecha_aplicacion: hoy(),
    fecha_proxima: '',
    // Si quien registra es veterinario, se propone a sí mismo como responsable.
    veterinario_id: usuario?.rol === 'veterinario' ? String(usuario.id) : '',
    observaciones: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function cambiar(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores(({ [campo]: _, ...resto }) => resto)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    setErrores({})
    setGuardando(true)
    const comunes = {
      perro_id: Number(perroId),
      veterinario_id: Number(form.veterinario_id),
      fecha_aplicacion: form.fecha_aplicacion,
      observaciones: form.observaciones.trim() || null,
    }
    try {
      if (tipo === 'vacuna') {
        await veterinariaApi.registrarVacuna({ ...comunes, nombre: form.nombre.trim(), fecha_proxima_dosis: form.fecha_proxima || null })
      } else {
        await veterinariaApi.registrarDesparasitacion({
          ...comunes,
          tipo: form.subtipo,
          producto: form.producto.trim(),
          fecha_proxima: form.fecha_proxima || null,
        })
      }
      navegar(volverA, {
        replace: true,
        state: { aviso: tipo === 'vacuna' ? 'Vacuna registrada.' : 'Desparasitación registrada.' },
      })
    } catch (err) {
      setGuardando(false)
      if (err instanceof ErrorApi && err.detalles.length > 0) {
        // La API usa fecha_proxima_dosis (vacunas) y fecha_proxima (desparasitaciones): un solo campo aquí.
        const { fecha_proxima_dosis, tipo: errorTipo, ...resto } = err.porCampo
        setErrores({ ...resto, fecha_proxima: resto.fecha_proxima ?? fecha_proxima_dosis, subtipo: errorTipo })
        setErrorGeneral('Revisa los campos marcados.')
      } else {
        setErrorGeneral((err as Error).message)
      }
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Registrar vacuna o desparasitación"
        subtitulo={perro ? `Para: ${perro.nombre} · ${perro.raza}` : undefined}
        volverA={volverA}
      />
      <Contenido>
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {!datos && !error && <Cargando />}
        {datos && (
          <form onSubmit={enviar} className="max-w-3xl space-y-5" noValidate>
            {errorGeneral && <MensajeError mensaje={errorGeneral} />}
            <section className={`${TARJETA} p-5 sm:p-6 space-y-4`}>
              <div role="radiogroup" aria-label="Tipo de control" className="flex gap-1 bg-warm-100 p-1 rounded-xl w-full sm:w-fit">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={tipo === t.id}
                    onClick={() => setTipo(t.id)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tipo === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.etiqueta}
                  </button>
                ))}
              </div>

              {tipo === 'vacuna' ? (
                <Campo etiqueta="Vacuna" obligatorio error={errores.nombre} ayuda="Usa el mismo nombre que la dosis anterior para que la alerta se cierre.">
                  <input
                    required
                    maxLength={100}
                    value={form.nombre}
                    onChange={(e) => cambiar('nombre', e.target.value)}
                    className={CLASE_INPUT}
                    placeholder="Ej: Antirrábica, Múltiple (DHPPi+L)…"
                  />
                </Campo>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo etiqueta="Tipo de desparasitación" obligatorio error={errores.subtipo}>
                    <select
                      required
                      value={form.subtipo}
                      onChange={(e) => cambiar('subtipo', e.target.value)}
                      className={CLASE_SELECT}
                    >
                      <option value="interna">Interna</option>
                      <option value="externa">Externa</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="Producto" obligatorio error={errores.producto}>
                    <input
                      required
                      maxLength={100}
                      value={form.producto}
                      onChange={(e) => cambiar('producto', e.target.value)}
                      className={CLASE_INPUT}
                      placeholder="Ej: Praziquantel, pipeta de fipronil…"
                    />
                  </Campo>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo etiqueta="Fecha de aplicación" obligatorio error={errores.fecha_aplicacion}>
                  <input
                    required
                    type="date"
                    max={hoy()}
                    value={form.fecha_aplicacion}
                    onChange={(e) => cambiar('fecha_aplicacion', e.target.value)}
                    className={CLASE_INPUT}
                  />
                </Campo>
                <Campo
                  etiqueta={tipo === 'vacuna' ? 'Próxima dosis' : 'Próximo control'}
                  error={errores.fecha_proxima}
                  ayuda="Opcional. Con fecha, aparecerá en Controles pendientes cuando se acerque."
                >
                  <input
                    type="date"
                    min={form.fecha_aplicacion || undefined}
                    value={form.fecha_proxima}
                    onChange={(e) => cambiar('fecha_proxima', e.target.value)}
                    className={CLASE_INPUT}
                  />
                </Campo>
              </div>

              <Campo
                etiqueta="Veterinario responsable"
                obligatorio
                error={errores.veterinario_id}
                ayuda={veterinarios.length === 0 ? 'No hay veterinarios activos registrados.' : undefined}
              >
                <select
                  required
                  value={form.veterinario_id}
                  onChange={(e) => cambiar('veterinario_id', e.target.value)}
                  className={CLASE_SELECT}
                >
                  <option value="">Selecciona un veterinario</option>
                  {veterinarios.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre_completo}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo etiqueta="Observaciones" error={errores.observaciones}>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.observaciones}
                  onChange={(e) => cambiar('observaciones', e.target.value)}
                  className={CLASE_TEXTAREA}
                  placeholder="Lote, reacciones, indicaciones (opcional)"
                />
              </Campo>
            </section>
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pb-4">
              <Link to={volverA} className={BOTON_SECUNDARIO}>
                Cancelar
              </Link>
              <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
                {guardando && <LoaderCircle size={16} className="animate-spin" />}
                {tipo === 'vacuna' ? 'Registrar vacuna' : 'Registrar desparasitación'}
              </button>
            </div>
          </form>
        )}
      </Contenido>
    </>
  )
}
