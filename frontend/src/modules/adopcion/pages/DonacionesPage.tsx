import { useState, type FormEvent } from 'react'
import { HandCoins, LoaderCircle, Plus } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { ErrorApi } from '@/api/http'
import type { TipoDonacion } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Campo from '@/shared/components/Campo'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, CLASE_INPUT, CLASE_SELECT, CLASE_TEXTAREA, TARJETA } from '@/shared/utils/estilos'
import { formatearFecha, hoy } from '@/shared/utils/formato'

const TIPOS: { valor: TipoDonacion; etiqueta: string }[] = [
  { valor: 'dinero', etiqueta: 'Dinero' },
  { valor: 'alimento', etiqueta: 'Alimento' },
  { valor: 'insumos', etiqueta: 'Insumos' },
  { valor: 'otro', etiqueta: 'Otro' },
]

const formularioInicial = () => ({
  fecha: hoy(),
  donante: '',
  contacto: '',
  tipo: 'dinero' as TipoDonacion,
  monto_bs: '',
  cantidad: '',
  descripcion: '',
})

const moneda = (monto: number) =>
  `Bs ${monto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// HU-18 · Solo registra donaciones ya recibidas. No procesa pagos ni modifica inventario.
export default function DonacionesPage() {
  const { datos, error, cargando, recargar } = useCarga(() => adopcionApi.listarDonaciones())
  const [form, setForm] = useState(formularioInicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  type FormDonacion = ReturnType<typeof formularioInicial>

  function cambiar<K extends keyof FormDonacion>(campo: K, valor: FormDonacion[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => {
      const { [campo]: _, ...resto } = actual
      return resto
    })
    setErrorGeneral(null)
    setAviso(null)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    setAviso(null)
    setErrores({})
    setGuardando(true)
    try {
      await adopcionApi.crearDonacion({
        fecha: form.fecha,
        donante: form.donante.trim(),
        contacto: form.contacto.trim() || null,
        tipo: form.tipo,
        ...(form.tipo === 'dinero'
          ? { monto_bs: Number(form.monto_bs) }
          : { cantidad: Number(form.cantidad), descripcion: form.descripcion.trim() }),
      })
      setForm(formularioInicial())
      setAviso('La donación se registró correctamente.')
      recargar()
    } catch (err) {
      if (err instanceof ErrorApi && err.detalles.length > 0) {
        setErrores(err.porCampo)
        setErrorGeneral('Revisa los campos marcados.')
      } else {
        setErrorGeneral((err as Error).message)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Donaciones recibidas"
        subtitulo="Registro de aportes que recibe el albergue"
      />
      <Contenido className="space-y-6">
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {errorGeneral && <MensajeError mensaje={errorGeneral} />}
        {aviso && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{aviso}</p>}

        <form onSubmit={enviar} className={`${TARJETA} p-5 sm:p-6 space-y-5 max-w-4xl`} noValidate>
          <div>
            <h2 className="font-bold text-gray-800">Registrar donación</h2>
            <p className="text-sm text-gray-500 mt-1">Registra únicamente las donaciones que el albergue ya recibió.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo etiqueta="Fecha de recepción" obligatorio error={errores.fecha}>
              <input required type="date" value={form.fecha} onChange={(e) => cambiar('fecha', e.target.value)} className={CLASE_INPUT} />
            </Campo>
            <Campo etiqueta="Donante" obligatorio error={errores.donante}>
              <input required maxLength={150} value={form.donante} onChange={(e) => cambiar('donante', e.target.value)} className={CLASE_INPUT} placeholder="Nombre de la persona o institución" />
            </Campo>
            <Campo etiqueta="Contacto" error={errores.contacto} ayuda="Opcional: teléfono, correo u otro medio de contacto.">
              <input maxLength={150} value={form.contacto} onChange={(e) => cambiar('contacto', e.target.value)} className={CLASE_INPUT} placeholder="Teléfono o correo" />
            </Campo>
            <Campo etiqueta="Tipo de donación" obligatorio error={errores.tipo}>
              <select value={form.tipo} onChange={(e) => cambiar('tipo', e.target.value as TipoDonacion)} className={CLASE_SELECT}>
                {TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}
              </select>
            </Campo>
          </div>

          {form.tipo === 'dinero' ? (
            <div className="max-w-sm">
              <Campo etiqueta="Monto recibido (Bs)" obligatorio error={errores.monto_bs}>
                <input required type="number" min="0.01" step="0.01" value={form.monto_bs} onChange={(e) => cambiar('monto_bs', e.target.value)} className={CLASE_INPUT} placeholder="0.00" />
              </Campo>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo etiqueta="Cantidad recibida" obligatorio error={errores.cantidad} ayuda="Puedes usar decimales; indica la unidad en la descripción.">
                <input required type="number" min="0.01" step="0.01" value={form.cantidad} onChange={(e) => cambiar('cantidad', e.target.value)} className={CLASE_INPUT} placeholder="Ej. 10" />
              </Campo>
              <Campo etiqueta="Descripción" obligatorio error={errores.descripcion} className="sm:col-span-2">
                <textarea required rows={3} maxLength={500} value={form.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} className={CLASE_TEXTAREA} placeholder="Ej. 10 kg de alimento para perros" />
              </Campo>
            </div>
          )}

          <div className="flex justify-end border-t border-warm-100 pt-4">
            <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
              {guardando ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
              Registrar donación
            </button>
          </div>
        </form>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-800">Historial de donaciones</h2>
              <p className="text-sm text-gray-500">{datos ? `${datos.total} ${datos.total === 1 ? 'registro' : 'registros'}` : 'Donaciones registradas'}</p>
            </div>
          </div>
          {cargando && !datos && <Cargando />}
          {datos && datos.total === 0 && (
            <div className={TARJETA}>
              <EstadoVacio icono={HandCoins} titulo="Todavía no hay donaciones" descripcion="Cuando registres una donación recibida, aparecerá en este historial." />
            </div>
          )}
          {datos && datos.total > 0 && (
            <div className={`${TARJETA} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px]">
                  <thead>
                    <tr className="border-b border-warm-100 bg-warm-50">
                      {['Fecha', 'Donante', 'Contacto', 'Tipo', 'Detalle', 'Registrado por'].map((columna) => (
                        <th key={columna} scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{columna}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {datos.donaciones.map((donacion) => (
                      <tr key={donacion.id} className="hover:bg-warm-50 transition-colors">
                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{formatearFecha(donacion.fecha)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">{donacion.donante}</td>
                        <td className="px-5 py-4 text-sm text-gray-500">{donacion.contacto || '—'}</td>
                        <td className="px-5 py-4 text-sm text-gray-700">{TIPOS.find((tipo) => tipo.valor === donacion.tipo)?.etiqueta ?? donacion.tipo}</td>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {donacion.tipo === 'dinero'
                            ? moneda(Number(donacion.monto_bs))
                            : `${Number(donacion.cantidad).toLocaleString('es-BO')} · ${donacion.descripcion}`}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{donacion.registrado_por_nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </Contenido>
    </>
  )
}