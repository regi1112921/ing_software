import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Cita } from '@/api/tipos'
import { veterinariaApi } from '@/api/veterinaria.api'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_SELECT, TARJETA } from '@/shared/utils/estilos'
import { hoy } from '@/shared/utils/formato'
import CancelarCitaDialogo from '../components/CancelarCitaDialogo'
import TarjetaCita from '../components/TarjetaCita'
import {
  diasDeSemana,
  inicioSemana,
  nombreDia,
  sumarDias,
  tituloSemana,
} from '../utils/citas'

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/

// HU-11 · Agenda de citas veterinarias (vista semanal, de lunes a domingo).
export default function AgendaPage() {
  const navegar = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const hoyTexto = hoy()
  const semanaParam = parametros.get('semana')
  const lunes = inicioSemana(semanaParam && FECHA_VALIDA.test(semanaParam) ? semanaParam : hoyTexto)
  const veterinarioId = parametros.get('veterinario') ?? ''
  const verCanceladas = parametros.get('canceladas') === '1'
  const dias = diasDeSemana(lunes)

  const { datos, error, cargando, recargar } = useCarga(
    () =>
      Promise.all([
        veterinariaApi.listarCitas({ desde: lunes, hasta: dias[6], veterinario_id: veterinarioId }),
        veterinariaApi.listarVeterinarios(),
      ]),
    [lunes, veterinarioId],
  )
  const [agenda, respuestaVeterinarios] = datos ?? []
  const veterinarios = respuestaVeterinarios?.veterinarios ?? []
  const citas = (agenda?.citas ?? []).filter((c) => verCanceladas || c.estado !== 'cancelada')
  const programadas = citas.filter((c) => c.estado === 'programada').length

  const [aCancelar, setACancelar] = useState<Cita | null>(null)

  function cambiarParametro(clave: string, valor: string | null) {
    const nuevos = new URLSearchParams(parametros)
    if (valor) nuevos.set(clave, valor)
    else nuevos.delete(clave)
    setParametros(nuevos, { replace: true })
  }

  const irASemana = (fecha: string) => cambiarParametro('semana', inicioSemana(fecha) === inicioSemana(hoyTexto) ? null : fecha)

  return (
    <>
      <EncabezadoPagina
        titulo="Agenda de citas"
        subtitulo={`${tituloSemana(lunes)} · ${programadas} ${programadas === 1 ? 'cita programada' : 'citas programadas'}`}
        acciones={
          <Link to={`/agenda/nueva?fecha=${lunes > hoyTexto ? lunes : hoyTexto}`} className={BOTON_PRIMARIO}>
            <Plus size={16} /> Nueva cita
          </Link>
        }
      />
      <Contenido>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-1" role="group" aria-label="Cambiar de semana">
            <button type="button" onClick={() => irASemana(sumarDias(lunes, -7))} aria-label="Semana anterior" className={`${BOTON_SECUNDARIO} !px-2.5`}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => irASemana(hoyTexto)} className={BOTON_SECUNDARIO}>
              Hoy
            </button>
            <button type="button" onClick={() => irASemana(sumarDias(lunes, 7))} aria-label="Semana siguiente" className={`${BOTON_SECUNDARIO} !px-2.5`}>
              <ChevronRight size={16} />
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="sr-only sm:not-sr-only">Veterinario:</span>
            <select
              value={veterinarioId}
              onChange={(e) => cambiarParametro('veterinario', e.target.value || null)}
              className={`${CLASE_SELECT} !w-auto !py-2`}
            >
              <option value="">Todos</option>
              {veterinarios.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre_completo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={verCanceladas}
              onChange={(e) => cambiarParametro('canceladas', e.target.checked ? '1' : null)}
              className="size-4 accent-forest-600"
            />
            Mostrar canceladas
          </label>
        </div>

        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos && <Cargando />}
        {datos && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
            {dias.map((dia) => {
              const delDia = citas.filter((c) => c.fecha === dia)
              const { corto, numero, mes } = nombreDia(dia)
              const esHoy = dia === hoyTexto
              const pasado = dia < hoyTexto
              return (
                <section
                  key={dia}
                  aria-label={`${corto} ${numero} ${mes}`}
                  className={`${TARJETA} flex flex-col min-h-[8rem] ${esHoy ? 'ring-2 ring-forest-500' : ''} ${pasado ? 'bg-warm-50' : ''}`}
                >
                  <header className="flex items-center justify-between px-3 py-2 border-b border-warm-100">
                    <p className="text-sm">
                      <span className="font-semibold text-gray-500 capitalize">{corto}</span>{' '}
                      <span className={`font-bold ${esHoy ? 'text-forest-700' : 'text-gray-900'}`}>{numero}</span>{' '}
                      <span className="text-gray-400">{mes}</span>
                    </p>
                    {!pasado && (
                      <Link
                        to={`/agenda/nueva?fecha=${dia}`}
                        aria-label={`Nueva cita el ${corto} ${numero}`}
                        className="text-gray-400 hover:text-forest-700 p-1 rounded"
                      >
                        <Plus size={15} />
                      </Link>
                    )}
                  </header>
                  <div className="flex-1 p-2 space-y-2">
                    {delDia.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Sin citas</p>}
                    {delDia.map((cita) => (
                      <TarjetaCita
                        key={cita.id}
                        cita={cita}
                        hoyTexto={hoyTexto}
                        onCancelar={() => setACancelar(cita)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
        {datos && citas.length === 0 && (
          <p className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-6">
            <CalendarDays size={16} /> No hay citas esta semana.
          </p>
        )}
      </Contenido>

      {aCancelar && (
        <CancelarCitaDialogo
          cita={aCancelar}
          onCerrar={() => setACancelar(null)}
          onCancelada={() => {
            setACancelar(null)
            recargar()
            navegar({ search: parametros.toString() }, { replace: true, state: { aviso: 'Cita cancelada. El horario quedó libre.' } })
          }}
        />
      )}
    </>
  )
}

