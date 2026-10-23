import type { AdopcionesPorMes } from '@/api/tipos'
import { TARJETA } from '@/shared/utils/estilos'

// 'AAAA-MM' → 'oct' / 'oct 2026'
function nombreMes(mes: string, conAnio = false): string {
  const [anio, numero] = mes.split('-').map(Number)
  return new Date(anio, numero - 1, 1).toLocaleDateString('es', conAnio ? { month: 'long', year: 'numeric' } : { month: 'short' })
}

// HU-13 · Adopciones finalizadas por mes (últimos 12 meses)
export default function GraficoAdopciones({ datos }: { datos: AdopcionesPorMes }) {
  const maximo = Math.max(1, ...datos.meses.map((m) => m.cantidad))
  const total = datos.meses.reduce((suma, m) => suma + m.cantidad, 0)

  return (
    <section aria-labelledby="titulo-grafico-adopciones">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 id="titulo-grafico-adopciones" className="font-bold text-gray-800">
          Adopciones por mes
        </h2>
        <span className="text-xs font-semibold text-gray-500">
          {total} en los últimos 12 meses
        </span>
      </div>
      <div className={`${TARJETA} p-5`}>
        {/* Las barras son decorativas; la tabla oculta da los mismos datos a lectores de pantalla. */}
        <div aria-hidden="true" className="flex items-end gap-1.5 sm:gap-2 h-48">
          {datos.meses.map((m, i) => {
            const actual = i === datos.meses.length - 1
            return (
              <div key={m.mes} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1" title={`${nombreMes(m.mes, true)}: ${m.cantidad}`}>
                <span className={`text-xs font-bold ${m.cantidad > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{m.cantidad}</span>
                <div
                  className={`w-full max-w-10 rounded-t-md transition-all ${actual ? 'bg-forest-600' : 'bg-forest-300'}`}
                  style={{ height: `${(m.cantidad / maximo) * 100}%`, minHeight: m.cantidad > 0 ? 4 : 2 }}
                />
              </div>
            )
          })}
        </div>
        <div aria-hidden="true" className="flex gap-1.5 sm:gap-2 mt-2 border-t border-warm-100 pt-2">
          {datos.meses.map((m) => (
            <span key={m.mes} className="flex-1 min-w-0 text-center text-[10px] sm:text-xs text-gray-400 capitalize truncate">
              {nombreMes(m.mes).replace('.', '')}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>Adopciones finalizadas por mes</caption>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Adopciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.meses.map((m) => (
              <tr key={m.mes}>
                <td>{nombreMes(m.mes, true)}</td>
                <td>{m.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
