import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { ErrorApi } from '@/api/http'
import { veterinariaApi } from '@/api/veterinaria.api'
import { useCarga } from '@/shared/hooks/useCarga'
import Campo from '@/shared/components/Campo'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import DatoInfo from '@/shared/components/DatoInfo'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_TEXTAREA, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha, hoy } from '@/shared/utils/formato'
import { NOMBRE_TIPO_CITA, inicioSemana } from '../utils/citas'

// HU-11 · Atender una cita: registra la atención en el historial médico del perro
// (con el motivo, la fecha y el veterinario de la cita) y la marca como atendida.
export default function AtenderCitaPage() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { datos: cita, error, recargar } = useCarga(() => veterinariaApi.obtenerCita(id!), [id])

  const [form, setForm] = useState({ diagnostico: '', tratamiento: '', observaciones: '' })
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
      const { cita: atendida } = await veterinariaApi.atenderCita(id!, {
        diagnostico: form.diagnostico.trim(),
        tratamiento: form.tratamiento.trim(),
        observaciones: form.observaciones.trim() || null,
      })
      navegar(`/perros/${atendida.perro_id}?pestana=historial`, {
        replace: true,
        state: { aviso: 'Cita atendida. La atención quedó registrada en el historial médico.' },
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

  const volverA = cita ? `/agenda?semana=${inicioSemana(cita.fecha)}` : '/agenda'
  const noAtendible =
    cita &&
    (cita.estado !== 'programada'
      ? `Esta cita está ${cita.estado} y ya no se puede atender.`
      : cita.fecha > hoy()
        ? 'Solo se pueden atender citas de hoy o de días anteriores.'
        : null)

  return (
    <>
      <EncabezadoPagina
        titulo="Atender cita"
        subtitulo={cita ? `${NOMBRE_TIPO_CITA[cita.tipo]} de ${cita.perro_nombre}` : undefined}
        volverA={volverA}
      />
      <Contenido>
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {!cita && !error && <Cargando />}
        {cita && (
          <div className="max-w-3xl space-y-5">
            <section className={`${TARJETA} p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4`}>
              <DatoInfo etiqueta="Perro" valor={cita.perro_nombre} />
              <DatoInfo etiqueta="Fecha y hora" valor={`${formatearFecha(cita.fecha)} · ${cita.hora}`} />
              <DatoInfo etiqueta="Veterinario" valor={cita.veterinario_nombre} />
              <DatoInfo etiqueta="Motivo" valor={cita.motivo} />
            </section>
            {noAtendible && <MensajeError mensaje={noAtendible} />}
            {!noAtendible && (
              <form onSubmit={enviar} className="space-y-5" noValidate>
                {errorGeneral && <MensajeError mensaje={errorGeneral} />}
                <section className={`${TARJETA} p-5 sm:p-6 space-y-4`}>
                  <p className="text-sm text-gray-500">
                    Se registra una atención médica en el historial de {cita.perro_nombre} con el motivo, la fecha y el
                    veterinario de la cita.
                  </p>
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
                    Volver
                  </Link>
                  <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
                    {guardando && <LoaderCircle size={16} className="animate-spin" />}
                    Registrar atención
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Contenido>
    </>
  )
}
