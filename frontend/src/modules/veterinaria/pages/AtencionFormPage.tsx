import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { ErrorApi } from '@/api/http'
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

// HU-09 · Registrar atención médica. El veterinario se elige de una lista
// (en el mockup era texto libre).
export default function AtencionFormPage() {
  const { id: perroId } = useParams()
  const navegar = useNavigate()
  const { usuario } = useSesion()
  const volverA = `/perros/${perroId}?pestana=historial`

  const { datos, error, recargar } = useCarga(
    () => Promise.all([adopcionApi.obtenerPerro(perroId!), veterinariaApi.listarVeterinarios()]),
    [perroId],
  )
  const [perro, respuestaVeterinarios] = datos ?? []
  const veterinarios = respuestaVeterinarios?.veterinarios ?? []

  // Si quien registra es veterinario, se propone a sí mismo como responsable.
  const [form, setForm] = useState({
    fecha: hoy(),
    veterinario_id: usuario?.rol === 'veterinario' ? String(usuario.id) : '',
    motivo: '',
    diagnostico: '',
    tratamiento: '',
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
    try {
      await veterinariaApi.registrarConsulta({
        perro_id: Number(perroId),
        veterinario_id: Number(form.veterinario_id),
        fecha: form.fecha,
        motivo: form.motivo.trim(),
        diagnostico: form.diagnostico.trim(),
        tratamiento: form.tratamiento.trim(),
        observaciones: form.observaciones.trim() || null,
      })
      navegar(volverA, { replace: true, state: { aviso: 'Atención médica registrada.' } })
    } catch (err) {
      setGuardando(false)
      if (err instanceof ErrorApi && err.detalles.length > 0) {
        setErrores(err.porCampo)
        setErrorGeneral('Revisa los campos marcados.')
      } else {
        setErrorGeneral((err as Error).message)
      }
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Registrar atención médica"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo etiqueta="Fecha de atención" obligatorio error={errores.fecha}>
                  <input
                    required
                    type="date"
                    max={hoy()}
                    value={form.fecha}
                    onChange={(e) => cambiar('fecha', e.target.value)}
                    className={CLASE_INPUT}
                  />
                </Campo>
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
              </div>
              <Campo etiqueta="Motivo de consulta" obligatorio error={errores.motivo}>
                <input
                  required
                  maxLength={200}
                  value={form.motivo}
                  onChange={(e) => cambiar('motivo', e.target.value)}
                  className={CLASE_INPUT}
                  placeholder="Ej: Revisión general, vacunación, herida…"
                />
              </Campo>
              <Campo etiqueta="Diagnóstico" obligatorio error={errores.diagnostico}>
                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  value={form.diagnostico}
                  onChange={(e) => cambiar('diagnostico', e.target.value)}
                  className={CLASE_TEXTAREA}
                  placeholder="Descripción del diagnóstico médico"
                />
              </Campo>
              <Campo etiqueta="Tratamiento" obligatorio error={errores.tratamiento}>
                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  value={form.tratamiento}
                  onChange={(e) => cambiar('tratamiento', e.target.value)}
                  className={CLASE_TEXTAREA}
                  placeholder="Medicamentos, procedimientos o indicaciones"
                />
              </Campo>
              <Campo etiqueta="Observaciones" error={errores.observaciones}>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.observaciones}
                  onChange={(e) => cambiar('observaciones', e.target.value)}
                  className={CLASE_TEXTAREA}
                  placeholder="Observaciones adicionales (opcional)"
                />
              </Campo>
            </section>
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pb-4">
              <Link to={volverA} className={BOTON_SECUNDARIO}>
                Cancelar
              </Link>
              <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
                {guardando && <LoaderCircle size={16} className="animate-spin" />}
                Registrar atención
              </button>
            </div>
          </form>
        )}
      </Contenido>
    </>
  )
}
