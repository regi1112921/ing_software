import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { ErrorApi } from '@/api/http'
import type { Cita, TipoCita } from '@/api/tipos'
import { veterinariaApi } from '@/api/veterinaria.api'
import { useSesion } from '@/shared/sesion/SesionContext'
import { useCarga } from '@/shared/hooks/useCarga'
import Campo from '@/shared/components/Campo'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_INPUT, CLASE_SELECT, TARJETA } from '@/shared/utils/estilos'
import { hoy } from '@/shared/utils/formato'
import { HORAS_CITA, NOMBRE_TIPO_CITA, inicioSemana } from '../utils/citas'

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/
const TIPOS = Object.keys(NOMBRE_TIPO_CITA) as TipoCita[]

type Formulario = { perro_id: string; veterinario_id: string; fecha: string; hora: string; tipo: TipoCita | ''; motivo: string }

function horaActual(): string {
  const ahora = new Date()
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
}

// HU-11 · Agendar o editar una cita veterinaria.
export default function CitaFormPage() {
  const { id } = useParams()
  const editando = Boolean(id)
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const { usuario } = useSesion()

  const { datos, error, recargar } = useCarga(
    () =>
      Promise.all([
        adopcionApi.listarPerros(),
        veterinariaApi.listarVeterinarios(),
        id ? veterinariaApi.obtenerCita(id) : Promise.resolve(null),
      ]),
    [id],
  )
  const [respuestaPerros, respuestaVeterinarios, citaActual] = datos ?? []
  const perros = (respuestaPerros?.perros ?? []).filter((p) => p.estado !== 'adoptado' || p.id === citaActual?.perro_id)
  const veterinarios = respuestaVeterinarios?.veterinarios ?? []

  const fechaInicial = parametros.get('fecha')
  const [form, setForm] = useState<Formulario>({
    perro_id: parametros.get('perro') ?? '',
    veterinario_id: usuario?.rol === 'veterinario' ? String(usuario.id) : '',
    fecha: fechaInicial && FECHA_VALIDA.test(fechaInicial) && fechaInicial >= hoy() ? fechaInicial : hoy(),
    hora: '',
    tipo: 'consulta',
    motivo: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Al editar, el formulario arranca con los datos de la cita.
  useEffect(() => {
    if (!citaActual) return
    setForm({
      perro_id: String(citaActual.perro_id),
      veterinario_id: String(citaActual.veterinario_id),
      fecha: citaActual.fecha,
      hora: citaActual.hora,
      tipo: citaActual.tipo,
      motivo: citaActual.motivo,
    })
  }, [citaActual])

  // Horarios ya ocupados ese día (no se puede agendar dos citas a la misma hora).
  const { datos: delDia } = useCarga(
    () => (FECHA_VALIDA.test(form.fecha) ? veterinariaApi.listarCitas({ desde: form.fecha, hasta: form.fecha }) : Promise.resolve(null)),
    [form.fecha],
  )
  const ocupadas = new Map<string, Cita>(
    (delDia?.citas ?? []).filter((c) => c.estado !== 'cancelada' && c.id !== citaActual?.id).map((c) => [c.hora, c]),
  )
  const esHoy = form.fecha === hoy()
  const ahora = horaActual()

  function cambiar(campo: keyof Formulario, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores(({ [campo]: _, ...resto }) => resto)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    setErrores({})
    setGuardando(true)
    const cita = {
      perro_id: Number(form.perro_id),
      veterinario_id: Number(form.veterinario_id),
      fecha: form.fecha,
      hora: form.hora,
      tipo: form.tipo as TipoCita,
      motivo: form.motivo.trim(),
    }
    try {
      const guardada = editando ? await veterinariaApi.editarCita(id!, cita) : await veterinariaApi.crearCita(cita)
      navegar(`/agenda?semana=${inicioSemana(guardada.fecha)}`, {
        replace: true,
        state: { aviso: editando ? 'Cita actualizada.' : `Cita agendada para ${guardada.perro_nombre} a las ${guardada.hora}.` },
      })
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

  const noEditable = citaActual && citaActual.estado !== 'programada'

  return (
    <>
      <EncabezadoPagina
        titulo={editando ? 'Editar cita' : 'Nueva cita'}
        subtitulo="Las citas se agendan en bloques de 30 minutos"
        volverA="/agenda"
      />
      <Contenido>
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {!datos && !error && <Cargando />}
        {noEditable && <MensajeError mensaje={`Esta cita está ${citaActual.estado} y ya no se puede editar.`} />}
        {datos && !noEditable && (
          <form onSubmit={enviar} className="max-w-3xl space-y-5" noValidate>
            {errorGeneral && <MensajeError mensaje={errorGeneral} />}
            <section className={`${TARJETA} p-5 sm:p-6 space-y-4`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo etiqueta="Perro" obligatorio error={errores.perro_id}>
                  <select required value={form.perro_id} onChange={(e) => cambiar('perro_id', e.target.value)} className={CLASE_SELECT}>
                    <option value="">Selecciona un perro</option>
                    {perros.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · {p.raza}
                      </option>
                    ))}
                  </select>
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
                <Campo etiqueta="Fecha" obligatorio error={errores.fecha}>
                  <input
                    required
                    type="date"
                    min={hoy()}
                    value={form.fecha}
                    onChange={(e) => cambiar('fecha', e.target.value)}
                    className={CLASE_INPUT}
                  />
                </Campo>
                <Campo
                  etiqueta="Hora"
                  obligatorio
                  error={errores.hora}
                  ayuda={ocupadas.size > 0 ? 'Los horarios ocupados ese día aparecen deshabilitados.' : undefined}
                >
                  <select required value={form.hora} onChange={(e) => cambiar('hora', e.target.value)} className={CLASE_SELECT}>
                    <option value="">Selecciona una hora</option>
                    {HORAS_CITA.map((hora) => {
                      const ocupante = ocupadas.get(hora)
                      const pasada = esHoy && hora < ahora
                      return (
                        <option key={hora} value={hora} disabled={Boolean(ocupante) || pasada}>
                          {hora}
                          {ocupante ? ` — ocupado (${ocupante.perro_nombre})` : pasada ? ' — ya pasó' : ''}
                        </option>
                      )
                    })}
                  </select>
                </Campo>
              </div>
              <Campo etiqueta="Tipo de cita" obligatorio error={errores.tipo}>
                <div role="radiogroup" className="flex flex-wrap gap-2">
                  {TIPOS.map((tipo) => {
                    const activo = form.tipo === tipo
                    return (
                      <button
                        key={tipo}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => cambiar('tipo', tipo)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          activo ? 'bg-forest-600 border-forest-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {NOMBRE_TIPO_CITA[tipo]}
                      </button>
                    )
                  })}
                </div>
              </Campo>
              <Campo etiqueta="Motivo" obligatorio error={errores.motivo}>
                <input
                  required
                  maxLength={200}
                  value={form.motivo}
                  onChange={(e) => cambiar('motivo', e.target.value)}
                  className={CLASE_INPUT}
                  placeholder="Ej: Control de la otitis, refuerzo de vacuna, esterilización…"
                />
              </Campo>
            </section>
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pb-4">
              <Link to="/agenda" className={BOTON_SECUNDARIO}>
                Cancelar
              </Link>
              <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
                {guardando && <LoaderCircle size={16} className="animate-spin" />}
                {editando ? 'Guardar cambios' : 'Agendar cita'}
              </button>
            </div>
          </form>
        )}
      </Contenido>
    </>
  )
}
