import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Lock, LoaderCircle } from 'lucide-react'
import { ErrorApi } from '@/api/http'
import type { Catalogos, DatosPerro, PerroDetalle, Sexo } from '@/api/tipos'
import Campo from '@/shared/components/Campo'
import FotoPerro from '@/shared/components/FotoPerro'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_INPUT, CLASE_SELECT, TARJETA } from '@/shared/utils/estilos'
import { hoy } from '@/shared/utils/formato'

type ModoEdad = 'fecha' | 'aproximada' | 'desconocida'

interface Formulario {
  nombre: string
  raza_id: string
  sexo: Sexo
  tamano: string
  color: string
  fecha_ingreso: string
  modoEdad: ModoEdad
  fecha_nacimiento: string
  anios: string
  meses: string
  foto_url: string
  estado: 'disponible' | 'en_tratamiento'
}

function formularioInicial(perro?: PerroDetalle): Formulario {
  if (!perro) {
    return {
      nombre: '',
      raza_id: '',
      sexo: 'macho',
      tamano: 'mediano',
      color: '',
      fecha_ingreso: hoy(),
      modoEdad: 'fecha',
      fecha_nacimiento: '',
      anios: '',
      meses: '',
      foto_url: '',
      estado: 'disponible',
    }
  }
  const meses = perro.edad_meses ?? 0
  return {
    nombre: perro.nombre,
    raza_id: String(perro.raza_id),
    sexo: perro.sexo,
    tamano: perro.tamano,
    color: perro.color ?? '',
    fecha_ingreso: perro.fecha_ingreso,
    modoEdad: !perro.fecha_nacimiento ? 'desconocida' : perro.fecha_nacimiento_estimada ? 'aproximada' : 'fecha',
    fecha_nacimiento: perro.fecha_nacimiento_estimada ? '' : (perro.fecha_nacimiento ?? ''),
    anios: perro.fecha_nacimiento_estimada ? String(Math.floor(meses / 12)) : '',
    meses: perro.fecha_nacimiento_estimada ? String(meses % 12) : '',
    foto_url: perro.foto_url ?? '',
    estado: perro.estado === 'en_tratamiento' ? 'en_tratamiento' : 'disponible',
  }
}

function aDatos(f: Formulario, incluirEstado: boolean): DatosPerro {
  return {
    nombre: f.nombre.trim(),
    raza_id: Number(f.raza_id),
    sexo: f.sexo,
    tamano: f.tamano,
    color: f.color.trim() || null,
    fecha_ingreso: f.fecha_ingreso,
    fecha_nacimiento: f.modoEdad === 'fecha' && f.fecha_nacimiento ? f.fecha_nacimiento : null,
    edad_aproximada:
      f.modoEdad === 'aproximada' ? { anios: Number(f.anios || 0), meses: Number(f.meses || 0) } : null,
    foto_url: f.foto_url.trim() || null,
    ...(incluirEstado ? { estado: f.estado } : {}),
  }
}

const MODOS_EDAD: { valor: ModoEdad; etiqueta: string }[] = [
  { valor: 'fecha', etiqueta: 'Fecha exacta' },
  { valor: 'aproximada', etiqueta: 'Edad aproximada' },
  { valor: 'desconocida', etiqueta: 'No se sabe' },
]

interface Props {
  catalogos: Catalogos
  perro?: PerroDetalle
  volverA: string
  onGuardar: (datos: DatosPerro) => Promise<void>
}

// HU-04 · Registrar perro  ·  HU-05 · Editar perro
export default function FormularioPerro({ catalogos, perro, volverA, onGuardar }: Props) {
  const [form, setForm] = useState<Formulario>(() => formularioInicial(perro))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const esEdicion = Boolean(perro)
  // RF-06: el estado de un perro en adopción o adoptado lo controla la adopción.
  const estadoBloqueado = perro ? perro.estado === 'en_adopcion' || perro.estado === 'adoptado' : false

  function cambiar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores(({ [campo]: _, ...resto }) => resto)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    setErrores({})
    if (form.modoEdad === 'aproximada' && Number(form.anios || 0) + Number(form.meses || 0) === 0) {
      setErrores({ edad: 'Indica cuántos años o meses tiene aproximadamente.' })
      return
    }
    setGuardando(true)
    try {
      await onGuardar(aDatos(form, !estadoBloqueado))
    } catch (err) {
      setGuardando(false)
      if (err instanceof ErrorApi && err.detalles.length > 0) {
        const porCampo = err.porCampo
        // Los errores de la edad pueden venir como edad_aproximada, edad_aproximada.anios, etc.
        const errorEdad = Object.entries(porCampo).find(([campo]) => campo.startsWith('edad_aproximada'))?.[1]
        setErrores({ ...porCampo, ...(errorEdad ? { edad: errorEdad } : {}) })
        setErrorGeneral('Revisa los campos marcados.')
      } else {
        setErrorGeneral((err as Error).message)
      }
    }
  }

  return (
    <form onSubmit={enviar} className="max-w-3xl space-y-5" noValidate>
      {errorGeneral && <MensajeError mensaje={errorGeneral} />}

      <section className={`${TARJETA} p-5 sm:p-6`}>
        <h2 className="font-bold text-gray-800 mb-5">Información básica</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo etiqueta="Nombre" obligatorio error={errores.nombre}>
            <input
              required
              maxLength={80}
              value={form.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
              className={CLASE_INPUT}
              placeholder="Nombre del perro"
            />
          </Campo>
          <Campo etiqueta="Raza" obligatorio error={errores.raza_id}>
            <select required value={form.raza_id} onChange={(e) => cambiar('raza_id', e.target.value)} className={CLASE_SELECT}>
              <option value="">Selecciona una raza</option>
              {/* Una raza desactivada sigue visible en la ficha que ya la usa. */}
              {perro && !catalogos.razas.some((r) => r.id === perro.raza_id) && (
                <option value={perro.raza_id}>{perro.raza}</option>
              )}
              {catalogos.razas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Sexo" obligatorio error={errores.sexo}>
            <select value={form.sexo} onChange={(e) => cambiar('sexo', e.target.value as Sexo)} className={CLASE_SELECT}>
              <option value="macho">Macho</option>
              <option value="hembra">Hembra</option>
            </select>
          </Campo>
          <Campo etiqueta="Tamaño" obligatorio error={errores.tamano}>
            <select value={form.tamano} onChange={(e) => cambiar('tamano', e.target.value)} className={CLASE_SELECT}>
              {catalogos.tamanos.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Color" error={errores.color}>
            <input
              maxLength={50}
              value={form.color}
              onChange={(e) => cambiar('color', e.target.value)}
              className={CLASE_INPUT}
              placeholder="Ej: Dorado, Tricolor, Negro…"
            />
          </Campo>
          <Campo etiqueta="Fecha de ingreso" obligatorio error={errores.fecha_ingreso}>
            <input
              required
              type="date"
              max={hoy()}
              value={form.fecha_ingreso}
              onChange={(e) => cambiar('fecha_ingreso', e.target.value)}
              className={CLASE_INPUT}
            />
          </Campo>
        </div>
      </section>

      <section className={`${TARJETA} p-5 sm:p-6`}>
        <h2 className="font-bold text-gray-800 mb-1">Edad</h2>
        <p className="text-sm text-gray-500 mb-4">Si no se conoce la fecha de nacimiento, puedes indicar una edad aproximada.</p>
        <div role="radiogroup" aria-label="Cómo indicar la edad" className="inline-flex flex-wrap gap-1 bg-warm-100 p-1 rounded-xl mb-4">
          {MODOS_EDAD.map((modo) => (
            <button
              key={modo.valor}
              type="button"
              role="radio"
              aria-checked={form.modoEdad === modo.valor}
              onClick={() => {
                cambiar('modoEdad', modo.valor)
                setErrores(({ edad: _e, fecha_nacimiento: _f, ...resto }) => resto)
              }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                form.modoEdad === modo.valor ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {modo.etiqueta}
            </button>
          ))}
        </div>

        {form.modoEdad === 'fecha' && (
          <Campo etiqueta="Fecha de nacimiento" error={errores.fecha_nacimiento} className="sm:max-w-xs">
            <input
              type="date"
              max={form.fecha_ingreso || hoy()}
              value={form.fecha_nacimiento}
              onChange={(e) => cambiar('fecha_nacimiento', e.target.value)}
              className={CLASE_INPUT}
            />
          </Campo>
        )}
        {form.modoEdad === 'aproximada' && (
          <div>
            <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
              <Campo etiqueta="Años">
                <input
                  type="number"
                  min={0}
                  max={30}
                  inputMode="numeric"
                  value={form.anios}
                  onChange={(e) => cambiar('anios', e.target.value)}
                  className={CLASE_INPUT}
                  placeholder="0"
                />
              </Campo>
              <Campo etiqueta="Meses">
                <input
                  type="number"
                  min={0}
                  max={11}
                  inputMode="numeric"
                  value={form.meses}
                  onChange={(e) => cambiar('meses', e.target.value)}
                  className={CLASE_INPUT}
                  placeholder="0"
                />
              </Campo>
            </div>
            {errores.edad && <p className="text-xs text-red-600 mt-1.5">{errores.edad}</p>}
          </div>
        )}
        {form.modoEdad === 'desconocida' && <p className="text-sm text-gray-400">La edad se mostrará como «Desconocida».</p>}
      </section>

      <section className={`${TARJETA} p-5 sm:p-6`}>
        <h2 className="font-bold text-gray-800 mb-4">Estado</h2>
        {estadoBloqueado ? (
          <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            <Lock size={16} className="flex-shrink-0 mt-0.5" />
            <p>
              <strong>{perro!.estado_nombre}.</strong> Este estado lo controla el proceso de adopción y no se puede cambiar
              desde aquí.
            </p>
          </div>
        ) : (
          <Campo
            etiqueta={esEdicion ? 'Estado actual' : 'Estado inicial'}
            obligatorio
            error={errores.estado}
            ayuda="Los estados de adopción se asignan solos al registrar o avanzar una adopción."
            className="sm:max-w-xs"
          >
            <select
              value={form.estado}
              onChange={(e) => cambiar('estado', e.target.value as Formulario['estado'])}
              className={CLASE_SELECT}
            >
              <option value="disponible">Disponible</option>
              <option value="en_tratamiento">En tratamiento</option>
            </select>
          </Campo>
        )}
      </section>

      <section className={`${TARJETA} p-5 sm:p-6`}>
        <h2 className="font-bold text-gray-800 mb-4">Foto</h2>
        <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
          <FotoPerro url={form.foto_url.trim() || null} nombre="Vista previa" className="size-28 rounded-xl flex-shrink-0" />
          <Campo etiqueta="URL de la foto" error={errores.foto_url} ayuda="Enlace público que empiece por http:// o https://" className="flex-1">
            <input
              type="url"
              maxLength={500}
              value={form.foto_url}
              onChange={(e) => cambiar('foto_url', e.target.value)}
              className={CLASE_INPUT}
              placeholder="https://…"
            />
          </Campo>
        </div>
      </section>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pb-4">
        <Link to={volverA} className={BOTON_SECUNDARIO}>
          Cancelar
        </Link>
        <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
          {guardando && <LoaderCircle size={16} className="animate-spin" />}
          {esEdicion ? 'Guardar cambios' : 'Registrar perro'}
        </button>
      </div>
    </form>
  )
}
