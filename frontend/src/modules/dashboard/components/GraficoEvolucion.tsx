import type { Evolucion } from '@/api/tipos'
import { TARJETA } from '@/shared/utils/estilos'
import { etiquetaPunto, nombrePunto } from '../utils/periodos'

// Con muchos puntos (días de un mes) se rotula solo uno de cada `paso`.
const MAXIMO_ETIQUETAS = 16

// HU-12 · Ingresos y adopciones del periodo, por día o por mes.
export default function GraficoEvolucion({ datos }: { datos: Evolucion }) {
  const maximo = Math.max(1, ...datos.puntos.flatMap((p) => [p.ingresos, p.adopciones]))
  const paso = Math.ceil(datos.puntos.length / MAXIMO_ETIQUETAS)
  const variosAnios = datos.desde.slice(0, 4) !== datos.hasta.slice(0, 4)

  return (
    <section aria-labelledby="titulo-grafico-evolucion">
      <div className="flex flex-wrap items-center justify-between mb-3 gap-3">
        <h2 id="titulo-grafico-evolucion" className="font-bold text-gray-800">
          Ingresos y adopciones por {datos.unidad === 'dia' ? 'día' : 'mes'}
        </h2>
        <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-amber-400" /> {datos.total_ingresos} ingresos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-forest-600" /> {datos.total_adopciones} adopciones
          </span>
        </div>
      </div>
      <div className={`${TARJETA} p-5`}>
        {/* Las barras son decorativas; la tabla oculta da los mismos datos a lectores de pantalla. */}
        <div aria-hidden="true" className="flex items-end gap-0.5 sm:gap-1 h-48">
          {datos.puntos.map((p) => (
            <div
              key={p.periodo}
              className="flex-1 min-w-0 h-full flex items-end justify-center gap-px"
              title={`${nombrePunto(p.periodo)}: ${p.ingresos} ingresos, ${p.adopciones} adopciones`}
            >
              {[
                { valor: p.ingresos, clase: 'bg-amber-400' },
                { valor: p.adopciones, clase: 'bg-forest-600' },
              ].map(({ valor, clase }, i) => (
                <div
                  key={i}
                  className={`flex-1 max-w-5 rounded-t-sm ${valor > 0 ? clase : 'bg-gray-100'}`}
                  style={{ height: `${(valor / maximo) * 100}%`, minHeight: 2 }}
                />
              ))}
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="flex gap-0.5 sm:gap-1 mt-2 border-t border-warm-100 pt-2">
          {datos.puntos.map((p, i) => (
            <span key={p.periodo} className="flex-1 min-w-0 text-center text-[10px] sm:text-xs text-gray-400 capitalize truncate">
              {i % paso === 0 ? etiquetaPunto(p.periodo, variosAnios) : ''}
            </span>
          ))}
        </div>
        {datos.total_ingresos + datos.total_adopciones === 0 && (
          <p className="text-sm text-gray-400 text-center mt-3">No hubo ingresos ni adopciones en este periodo.</p>
        )}
        <table className="sr-only">
          <caption>Ingresos y adopciones finalizadas por {datos.unidad === 'dia' ? 'día' : 'mes'}</caption>
          <thead>
            <tr>
              <th scope="col">{datos.unidad === 'dia' ? 'Día' : 'Mes'}</th>
              <th scope="col">Ingresos</th>
              <th scope="col">Adopciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.puntos.map((p) => (
              <tr key={p.periodo}>
                <td>{nombrePunto(p.periodo)}</td>
                <td>{p.ingresos}</td>
                <td>{p.adopciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
