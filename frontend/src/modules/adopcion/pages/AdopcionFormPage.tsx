import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle, PawPrint } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { ErrorApi } from '@/api/http'
import { useCarga } from '@/shared/hooks/useCarga'
import Campo from '@/shared/components/Campo'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import FotoPerro from '@/shared/components/FotoPerro'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_INPUT, CLASE_SELECT, CLASE_TEXTAREA, TARJETA } from '@/shared/utils/estilos'
import { NOMBRE_SEXO, formatearEdad, hoy } from '@/shared/utils/formato'

// HU-10 · Registrar adopción. Solo perros disponibles; desde la ficha llega
// con el perro preseleccionado (?perro=<id>).
export default function AdopcionFormPage() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const perroPreseleccionado = parametros.get('perro')
  const volverA = perroPreseleccionado ? `/perros/${perroPreseleccionado}?pestana=adopcion` : '/adopciones'

  const { datos, error, recargar } = useCarga(() => adopcionApi.listarPerros({ estado: 'disponible' }))
  const disponibles = datos?.perros ?? []

  const [form, setForm] = useState({
    perro_id: perroPreseleccionado ?? '',
    nombre_completo: '',
    documento_identidad: '',
    telefono: '',
    direccion: '',
    fecha_solicitud: hoy(),
    observaciones: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const perroElegido = disponibles.find((p) => String(p.id) === form.perro_id)
  const preseleccionNoDisponible = Boolean(datos && perroPreseleccionado && !perroElegido)

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
      const adopcion = await adopcionApi.crearAdopcion({
        perro_id: Number(form.perro_id),
        adoptante: {
          nombre_completo: form.nombre_completo.trim(),
          documento_identidad: form.documento_identidad.trim() || null,
          telefono: form.telefono.trim(),
          direccion: form.direccion.trim(),
        },
        fecha_solicitud: form.fecha_solicitud,
        observaciones: form.observaciones.trim() || null,
      })
      navegar(`/adopciones/${adopcion.id}`, {
        replace: true,
        state: { aviso: `Adopción registrada. ${adopcion.perro.nombre} pasó a «En proceso de adopción».` },
      })
    } catch (err) {
      setGuardando(false)
      if (err instanceof ErrorApi && err.detalles.length > 0) {
        // Los campos del adoptante llegan como "adoptante.telefono".
        const porCampo = Object.fromEntries(Object.entries(err.porCampo).map(([campo, msj]) => [campo.replace('adoptante.', ''), msj]))
        setErrores(porCampo)
        setErrorGeneral('Revisa los campos marcados.')
      } else {
        setErrorGeneral((err as Error).message)
      }
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Registrar adopción"
        subtitulo="Datos del adoptante y de la solicitud"
        volverA={volverA}
      />
      <Contenido>
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {!datos && !error && <Cargando />}
        {datos && disponibles.length === 0 && (
          <div className={`${TARJETA} max-w-3xl`}>
            <EstadoVacio
              icono={PawPrint}
              titulo="No hay perros disponibles"
              descripcion="Solo se puede iniciar una adopción con un perro en estado «Disponible»."
              accion={
                <Link to="/perros" className={BOTON_SECUNDARIO}>
                  Ver perros
                </Link>
              }
            />
          </div>
        )}
        {datos && disponibles.length > 0 && (
          <form onSubmit={enviar} className="max-w-3xl space-y-5" noValidate>
            {errorGeneral && <MensajeError mensaje={errorGeneral} />}
            {preseleccionNoDisponible && (
              <MensajeError mensaje="El perro seleccionado ya no está disponible para adopción. Elige otro de la lista." />
            )}

            <section className={`${TARJETA} p-5 sm:p-6`}>
              <h2 className="font-bold text-gray-800 mb-4">Perro</h2>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                <Campo etiqueta="Perro disponible" obligatorio error={errores.perro_id} className="flex-1">
                  <select
                    required
                    value={perroElegido ? form.perro_id : ''}
                    onChange={(e) => cambiar('perro_id', e.target.value)}
                    disabled={Boolean(perroPreseleccionado && perroElegido)}
                    className={CLASE_SELECT}
                  >
                    <option value="">Selecciona un perro</option>
                    {disponibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {p.raza} ({NOMBRE_SEXO[p.sexo]})
                      </option>
                    ))}
                  </select>
                </Campo>
                {perroElegido && (
                  <div className="flex items-center gap-3 rounded-lg bg-warm-50 px-3 py-2">
                    <FotoPerro url={perroElegido.foto_url} nombre={perroElegido.nombre} className="size-10 rounded-full" tamanoIcono={16} />
                    <div className="text-sm">
                      <p className="font-bold text-gray-900">{perroElegido.nombre}</p>
                      <p className="text-gray-500 text-xs">
                        {perroElegido.tamano_nombre} · {formatearEdad(perroElegido.edad_meses, perroElegido.fecha_nacimiento_estimada)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className={`${TARJETA} p-5 sm:p-6`}>
              <h2 className="font-bold text-gray-800 mb-4">Datos del adoptante</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo etiqueta="Nombre completo" obligatorio error={errores.nombre_completo}>
                  <input
                    required
                    maxLength={150}
                    autoComplete="name"
                    value={form.nombre_completo}
                    onChange={(e) => cambiar('nombre_completo', e.target.value)}
                    className={CLASE_INPUT}
                    placeholder="Nombre y apellidos"
                  />
                </Campo>
                <Campo
                  etiqueta="Documento de identidad"
                  error={errores.documento_identidad}
                  ayuda="Opcional. Si ya existe, se reutilizan los datos del adoptante."
                >
                  <input
                    maxLength={30}
                    value={form.documento_identidad}
                    onChange={(e) => cambiar('documento_identidad', e.target.value)}
                    className={CLASE_INPUT}
                    placeholder="Ej: 1012345678"
                  />
                </Campo>
                <Campo etiqueta="Teléfono" obligatorio error={errores.telefono} ayuda="Entre 7 y 15 dígitos.">
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={form.telefono}
                    onChange={(e) => cambiar('telefono', e.target.value)}
                    className={CLASE_INPUT}
                    placeholder="Ej: 70123456"
                  />
                </Campo>
                <Campo etiqueta="Dirección" obligatorio error={errores.direccion}>
                  <input
                    required
                    maxLength={250}
                    autoComplete="street-address"
                    value={form.direccion}
                    onChange={(e) => cambiar('direccion', e.target.value)}
                    className={CLASE_INPUT}
                    placeholder="Dirección completa de residencia"
                  />
                </Campo>
              </div>
            </section>

            <section className={`${TARJETA} p-5 sm:p-6`}>
              <h2 className="font-bold text-gray-800 mb-1">Solicitud</h2>
              <p className="text-sm text-gray-500 mb-4">La adopción se registra «En proceso». Luego podrás aprobarla, rechazarla o finalizarla.</p>
              <div className="space-y-4">
                <Campo etiqueta="Fecha de solicitud" obligatorio error={errores.fecha_solicitud} className="sm:max-w-xs">
                  <input
                    required
                    type="date"
                    max={hoy()}
                    value={form.fecha_solicitud}
                    onChange={(e) => cambiar('fecha_solicitud', e.target.value)}
                    className={CLASE_INPUT}
                  />
                </Campo>
                <Campo etiqueta="Observaciones" error={errores.observaciones}>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={form.observaciones}
                    onChange={(e) => cambiar('observaciones', e.target.value)}
                    className={CLASE_TEXTAREA}
                    placeholder="Información adicional sobre el adoptante o el hogar (opcional)"
                  />
                </Campo>
              </div>
            </section>

            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pb-4">
              <Link to={volverA} className={BOTON_SECUNDARIO}>
                Cancelar
              </Link>
              <button type="submit" disabled={guardando || !perroElegido} className={BOTON_PRIMARIO}>
                {guardando && <LoaderCircle size={16} className="animate-spin" />}
                Registrar adopción
              </button>
            </div>
          </form>
        )}
      </Contenido>
    </>
  )
}
