import { useState, type FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Mail, Phone, Plus, UsersRound } from 'lucide-react'
import { voluntariadoApi } from '@/api/voluntariado.api'
import type { TurnoVoluntariado, Voluntario } from '@/api/voluntariado.api'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, CLASE_INPUT, CLASE_TEXTAREA, TARJETA } from '@/shared/utils/estilos'

function fechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function lunesDe(fecha: Date): Date {
  const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  return lunes
}

function desplazar(fecha: Date, dias: number): Date {
  const nueva = new Date(fecha)
  nueva.setDate(nueva.getDate() + dias)
  return nueva
}

function fechaLegible(fecha: string, opciones?: Intl.DateTimeFormatOptions): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es', opciones ?? { weekday: 'long', day: 'numeric', month: 'long' })
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}

export default function VoluntariadoPage() {
  const [lunes, setLunes] = useState(() => lunesDe(new Date()))
  const [mes, setMes] = useState(() => fechaLocal(new Date()).slice(0, 7))
  const desde = fechaLocal(lunes)
  const hasta = fechaLocal(desplazar(lunes, 6))
  const { datos, error, cargando, recargar } = useCarga(
    () =>
      Promise.all([
        voluntariadoApi.listarVoluntarios(),
        voluntariadoApi.calendario(desde, hasta),
        voluntariadoApi.horasMensuales(mes),
      ]),
    [desde, hasta, mes],
  )
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [disponibilidad, setDisponibilidad] = useState('')
  const [voluntarioId, setVoluntarioId] = useState('')
  const [fechaTurno, setFechaTurno] = useState(() => fechaLocal(new Date()))
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('12:00')
  const [actividad, setActividad] = useState('')

  const [lista, calendario, horas] = datos ?? []

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setErrorAccion(null)
    try {
      await voluntariadoApi.registrarVoluntario({
        nombre_completo: nombre,
        telefono,
        correo,
        disponibilidad,
      })
      setNombre('')
      setTelefono('')
      setCorreo('')
      setDisponibilidad('')
      recargar()
    } catch (error) {
      setErrorAccion(mensajeDe(error))
    } finally {
      setGuardando(false)
    }
  }

  async function asignar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setErrorAccion(null)
    try {
      await voluntariadoApi.asignarTurno({
        voluntario_id: Number(voluntarioId),
        fecha: fechaTurno,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        actividad,
      })
      setActividad('')
      recargar()
    } catch (error) {
      setErrorAccion(mensajeDe(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Voluntariado" subtitulo="Registra personas voluntarias y organiza sus turnos de apoyo" />
      <Contenido className="space-y-6">
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {errorAccion && <MensajeError mensaje={errorAccion} />}
        {cargando && !datos && <Cargando />}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className={`${TARJETA} p-5`}>
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <UsersRound size={18} className="text-forest-600" /> Registrar voluntario
            </h2>
            <form onSubmit={registrar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
                Nombre completo
                <input required maxLength={150} value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${CLASE_INPUT} mt-1`} />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Teléfono
                <input required type="tel" maxLength={20} value={telefono} onChange={(e) => setTelefono(e.target.value)} className={`${CLASE_INPUT} mt-1`} />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Correo (opcional)
                <input type="email" maxLength={254} value={correo} onChange={(e) => setCorreo(e.target.value)} className={`${CLASE_INPUT} mt-1`} />
              </label>
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
                Disponibilidad
                <textarea
                  required
                  maxLength={500}
                  value={disponibilidad}
                  onChange={(e) => setDisponibilidad(e.target.value)}
                  placeholder="Ej. Lunes y miércoles por la mañana"
                  className={`${CLASE_TEXTAREA} mt-1`}
                />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
                  <Plus size={16} /> Registrar voluntario
                </button>
              </div>
            </form>
          </section>

          <section className={`${TARJETA} p-5`}>
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <CalendarDays size={18} className="text-forest-600" /> Asignar turno
            </h2>
            <form onSubmit={asignar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
                Voluntario
                <select required value={voluntarioId} onChange={(e) => setVoluntarioId(e.target.value)} className={`${CLASE_INPUT} mt-1`}>
                  <option value="">Selecciona un voluntario</option>
                  {lista?.voluntarios.map((voluntario: Voluntario) => (
                    <option key={voluntario.id} value={voluntario.id}>{voluntario.nombre_completo}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
                Fecha
                <input required type="date" value={fechaTurno} onChange={(e) => setFechaTurno(e.target.value)} className={`${CLASE_INPUT} mt-1`} />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Desde
                <input required type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={`${CLASE_INPUT} mt-1`} />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Hasta
                <input required type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={`${CLASE_INPUT} mt-1`} />
              </label>
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
                Actividad
                <input required maxLength={300} value={actividad} onChange={(e) => setActividad(e.target.value)} placeholder="Ej. Paseo y alimentación" className={`${CLASE_INPUT} mt-1`} />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={guardando || !lista?.voluntarios.length} className={BOTON_PRIMARIO}>
                  <Plus size={16} /> Asignar turno
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className={`${TARJETA} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <CalendarDays size={18} className="text-forest-600" /> Calendario semanal
            </h2>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Semana anterior" onClick={() => setLunes((actual) => desplazar(actual, -7))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-gray-700">{fechaLegible(desde, { day: 'numeric', month: 'short' })} – {fechaLegible(hasta, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <button type="button" aria-label="Semana siguiente" onClick={() => setLunes((actual) => desplazar(actual, 7))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {calendario?.total === 0 && (
            <EstadoVacio icono={CalendarDays} titulo="No hay turnos esta semana" descripcion="Los turnos que asignes aparecerán aquí." />
          )}
          {calendario && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {Array.from({ length: 7 }, (_, indice) => {
                const fecha = fechaLocal(desplazar(lunes, indice))
                const turnosDia = calendario.turnos.filter((turno: TurnoVoluntariado) => turno.fecha === fecha)
                return (
                  <div key={fecha} className="rounded-lg border border-warm-200 p-3 min-h-32">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">{fechaLegible(fecha)}</h3>
                    {turnosDia.length === 0 && <p className="text-xs text-gray-400">Sin turnos</p>}
                    <ul className="space-y-2">
                      {turnosDia.map((turno: TurnoVoluntariado) => (
                        <li key={turno.id} className="rounded-md bg-forest-50 p-2 text-xs">
                          <p className="font-bold text-forest-800">{turno.hora_inicio}–{turno.hora_fin}</p>
                          <p className="font-semibold text-gray-800 mt-1">{turno.voluntario_nombre}</p>
                          <p className="text-gray-600">{turno.actividad}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className={`${TARJETA} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Clock3 size={18} className="text-forest-600" /> Horas por voluntario
            </h2>
            <label className="text-sm font-semibold text-gray-700">
              Mes
              <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={`${CLASE_INPUT} mt-1`} />
            </label>
          </div>
          {horas?.total === 0 && <p className="text-sm text-gray-500">Aún no hay voluntarios registrados.</p>}
          {horas && horas.total > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-gray-500 border-b border-gray-200">
                  <tr><th className="py-2 pr-4">Voluntario</th><th className="py-2 text-right">Horas en {mes}</th></tr>
                </thead>
                <tbody>
                  {horas.voluntarios.map((voluntario) => (
                    <tr key={voluntario.voluntario_id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-800">{voluntario.nombre_completo}</td>
                      <td className="py-3 text-right font-bold text-forest-700">{Number(voluntario.horas).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${TARJETA} p-5`}>
          <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <UsersRound size={18} className="text-forest-600" /> Voluntarios registrados
          </h2>
          {!lista?.total && <p className="text-sm text-gray-500">Todavía no hay voluntarios registrados.</p>}
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {lista?.voluntarios.map((voluntario: Voluntario) => (
              <li key={voluntario.id} className="rounded-lg border border-warm-200 p-4">
                <p className="font-bold text-gray-900">{voluntario.nombre_completo}</p>
                <p className="mt-2 text-sm text-gray-600 flex items-center gap-2"><Phone size={14} /> {voluntario.telefono}</p>
                {voluntario.correo && <p className="mt-1 text-sm text-gray-600 flex items-center gap-2"><Mail size={14} /> {voluntario.correo}</p>}
                <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{voluntario.disponibilidad}</p>
              </li>
            ))}
          </ul>
        </section>
      </Contenido>
    </>
  )
}
