import { useState, type ComponentType, type FormEvent } from 'react'
import {
  LayoutDashboard, PawPrint, Heart, LogOut, Search, Plus,
  ArrowLeft, Pencil, Calendar, User, Phone, MapPin, Stethoscope,
  FileText, Clock, AlertTriangle, CheckCircle, Activity,
  ChevronRight, Filter,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type View =
  | 'login' | 'dashboard' | 'dogs' | 'dog-new' | 'dog-edit'
  | 'dog-detail' | 'medical-new' | 'adoptions' | 'adoption-new' | 'adoption-detail'

type DogStatus = 'available' | 'treatment' | 'adoption' | 'adopted'
type Sex = 'male' | 'female'
type DogSize = 'small' | 'medium' | 'large'
type AdoptionStatus = 'in_process' | 'approved' | 'rejected' | 'completed'
type DogDetailTab = 'info' | 'medical' | 'adoption'

interface Dog {
  id: string; name: string; photo: string; sex: Sex; birthDate: string
  breed: string; color: string; size: DogSize; entryDate: string; status: DogStatus
}

interface MedicalRecord {
  id: string; dogId: string; date: string; reason: string
  diagnosis: string; treatment: string; observations: string; vet: string
}

interface Adoption {
  id: string; dogId: string; adopterName: string; adopterPhone: string
  adopterAddress: string; date: string; observations: string; status: AdoptionStatus
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const INITIAL_DOGS: Dog[] = [
  {
    id: 'd1', name: 'Luna',
    photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&auto=format',
    sex: 'female', birthDate: '2021-03-15', breed: 'Labrador Retriever',
    color: 'Dorado', size: 'large', entryDate: '2023-11-10', status: 'available',
  },
  {
    id: 'd2', name: 'Max',
    photo: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop&auto=format',
    sex: 'male', birthDate: '2020-07-22', breed: 'Border Collie',
    color: 'Negro y blanco', size: 'medium', entryDate: '2023-09-05', status: 'treatment',
  },
  {
    id: 'd3', name: 'Bella',
    photo: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400&h=400&fit=crop&auto=format',
    sex: 'female', birthDate: '2022-01-10', breed: 'Beagle',
    color: 'Tricolor', size: 'small', entryDate: '2024-01-20', status: 'adoption',
  },
  {
    id: 'd4', name: 'Rocky',
    photo: 'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=400&h=400&fit=crop&auto=format',
    sex: 'male', birthDate: '2019-06-05', breed: 'Pastor Alemán',
    color: 'Negro y café', size: 'large', entryDate: '2023-05-14', status: 'adopted',
  },
  {
    id: 'd5', name: 'Coco',
    photo: 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&h=400&fit=crop&auto=format',
    sex: 'male', birthDate: '2023-02-28', breed: 'Chihuahua',
    color: 'Café claro', size: 'small', entryDate: '2024-03-01', status: 'available',
  },
  {
    id: 'd6', name: 'Nina',
    photo: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop&auto=format',
    sex: 'female', birthDate: '2020-11-12', breed: 'Poodle',
    color: 'Blanco', size: 'medium', entryDate: '2024-02-15', status: 'treatment',
  },
]

const INITIAL_MEDICAL: MedicalRecord[] = [
  {
    id: 'm1', dogId: 'd2', date: '2024-03-22',
    reason: 'Seguimiento de tratamiento',
    diagnosis: 'Dermatitis crónica con mejora moderada',
    treatment: 'Continuar con antibióticos tópicos y baños medicados cada 3 días',
    observations: 'El animal muestra mejoría en las áreas afectadas. Continuar con el plan de tratamiento.',
    vet: 'Dr. Andrés Ramírez',
  },
  {
    id: 'm2', dogId: 'd2', date: '2024-03-15',
    reason: 'Revisión general',
    diagnosis: 'Infección cutánea bacteriana (dermatitis)',
    treatment: 'Amoxicilina 500mg cada 12h por 10 días + champú medicado semanal',
    observations: 'Lesiones evidentes en lomo y cuello. Iniciar tratamiento de forma inmediata.',
    vet: 'Dr. Andrés Ramírez',
  },
  {
    id: 'm3', dogId: 'd6', date: '2024-02-28',
    reason: 'Tos persistente y pérdida de apetito',
    diagnosis: 'Bronquitis leve',
    treatment: 'Reposo, broncodilatador y antiinflamatorio por 7 días',
    observations: 'Mejorar ventilación en el área de alojamiento. Seguimiento en 10 días.',
    vet: 'Dra. Lucía Torres',
  },
  {
    id: 'm4', dogId: 'd1', date: '2024-01-05',
    reason: 'Vacunación anual',
    diagnosis: 'Animal sano',
    treatment: 'Vacuna múltiple + antiparasitario oral y externo',
    observations: 'Sin observaciones. Animal en excelente estado general.',
    vet: 'Dr. Andrés Ramírez',
  },
  {
    id: 'm5', dogId: 'd3', date: '2024-02-10',
    reason: 'Chequeo previo a proceso de adopción',
    diagnosis: 'Animal sano, apta para adopción',
    treatment: 'Desparasitación interna y externa preventiva',
    observations: 'Todos los parámetros dentro de lo normal. Lista para iniciar proceso de adopción.',
    vet: 'Dra. Lucía Torres',
  },
]

const INITIAL_ADOPTIONS: Adoption[] = [
  {
    id: 'a1', dogId: 'd3',
    adopterName: 'Carlos Mendoza Vargas',
    adopterPhone: '3001234567',
    adopterAddress: 'Calle 45 #12-30, Bogotá',
    date: '2024-03-01',
    observations: 'Familia con casa propia y jardín amplio. Sin otros animales. Experiencia previa con perros de raza similar.',
    status: 'in_process',
  },
  {
    id: 'a2', dogId: 'd4',
    adopterName: 'Ana García López',
    adopterPhone: '3109876543',
    adopterAddress: 'Carrera 7 #85-22, Medellín',
    date: '2023-12-15',
    observations: 'Adoptante evaluada positivamente. Condiciones del hogar adecuadas para perros de talla grande. Visita domiciliaria aprobada.',
    status: 'completed',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(birthDate: string): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now = new Date()
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (totalMonths < 12) return `${Math.max(0, totalMonths)} meses`
  const years = Math.floor(totalMonths / 12)
  return years === 1 ? '1 año' : `${years} años`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const DOG_STATUS_LABELS: Record<DogStatus, string> = {
  available: 'Disponible',
  treatment: 'En tratamiento',
  adoption: 'En proceso de adopción',
  adopted: 'Adoptado',
}

const ADOPTION_STATUS_LABELS: Record<AdoptionStatus, string> = {
  in_process: 'En proceso',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  completed: 'Finalizada',
}

const DOG_STATUS_STYLES: Record<DogStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  treatment: 'bg-amber-50 text-amber-700 border border-amber-200',
  adoption: 'bg-blue-50 text-blue-700 border border-blue-200',
  adopted: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const ADOPTION_STATUS_STYLES: Record<AdoptionStatus, string> = {
  in_process: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  completed: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const SEX_LABEL: Record<Sex, string> = { male: 'Macho', female: 'Hembra' }
const SIZE_LABEL: Record<DogSize, string> = { small: 'Pequeño', medium: 'Mediano', large: 'Grande' }

const INPUT_CLS = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent'
const SELECT_CLS = `${INPUT_CLS} appearance-none`
const TEXTAREA_CLS = `${INPUT_CLS} resize-none`

// ── Reusable Components ───────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
    </div>
  )
}

function PageHeader({
  title, subtitle, onBack, action,
}: {
  title: string; subtitle?: string; onBack?: () => void
  action?: { label: string; icon?: ComponentType<{ size?: number }>; onClick: () => void; variant?: 'primary' | 'secondary' }
}) {
  return (
    <div className="px-8 py-5 border-b border-warm-200 bg-white flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            action.variant === 'secondary'
              ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-forest-600 hover:bg-forest-700 text-white'
          }`}
        >
          {action.icon && <action.icon size={15} />}
          {action.label}
        </button>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={44} className="text-gray-300 mb-3" />
      <p className="font-semibold text-gray-500">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function SideNavItem({
  icon: Icon, label, active, onClick,
}: { icon: ComponentType<{ size?: number; className?: string }>; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        active
          ? 'bg-forest-700 text-white'
          : 'text-forest-300 hover:bg-forest-800 hover:text-white'
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  )
}

function Sidebar({ view, onNavigate, onLogout }: { view: View; onNavigate: (v: View) => void; onLogout: () => void }) {
  const isDogsActive = ['dogs', 'dog-new', 'dog-edit', 'dog-detail', 'medical-new'].includes(view)
  const isAdoptionsActive = ['adoptions', 'adoption-new', 'adoption-detail'].includes(view)

  return (
    <aside className="w-60 flex-shrink-0 bg-forest-950 flex flex-col">
      <div className="p-5 border-b border-forest-900">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-forest-600 flex items-center justify-center flex-shrink-0">
            <PawPrint size={17} className="text-white" />
          </div>
          <div>
            <p className="font-serif text-white text-base leading-tight">PawShelter</p>
            <p className="text-forest-400 text-xs">Sistema de Gestión</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 pt-4">
        <SideNavItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => onNavigate('dashboard')} />
        <SideNavItem icon={PawPrint} label="Perros" active={isDogsActive} onClick={() => onNavigate('dogs')} />
        <SideNavItem icon={Heart} label="Adopciones" active={isAdoptionsActive} onClick={() => onNavigate('adoptions')} />
      </nav>

      <div className="p-4 border-t border-forest-900">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="size-8 rounded-full bg-forest-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            MA
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">María Alvarado</p>
            <p className="text-forest-400 text-xs">Personal del albergue</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-forest-400 hover:text-white hover:bg-forest-800 text-sm transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onLogin()
  }

  return (
    <div className="h-full flex">
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-forest-950 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542715234-bd0adb4249b7?w=800&h=1000&fit=crop&auto=format"
          alt="Perros en el albergue"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-forest-600 flex items-center justify-center">
            <PawPrint size={20} className="text-white" />
          </div>
          <span className="font-serif text-white text-xl">PawShelter</span>
        </div>
        <div className="relative z-10">
          <p className="text-forest-400 text-xs uppercase tracking-widest font-semibold mb-4">Sistema de Gestión</p>
          <h2 className="font-serif text-white text-4xl leading-snug mb-4">
            Cada perro merece<br />un hogar seguro.
          </h2>
          <p className="text-forest-300 text-sm leading-relaxed max-w-xs">
            Registro, seguimiento médico y adopciones. Todo el albergue en un solo lugar.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-warm-50 p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="size-9 rounded-xl bg-forest-600 flex items-center justify-center">
              <PawPrint size={17} className="text-white" />
            </div>
            <span className="font-serif text-forest-800 text-xl">PawShelter</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
          <p className="text-gray-500 text-sm mb-8">Ingresa tus credenciales para continuar</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Usuario</label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="usuario@albergue.com"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                className={INPUT_CLS}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-forest-600 hover:bg-forest-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors mt-2"
            >
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, bgClass, colorClass, icon: Icon,
}: { label: string; value: number; bgClass: string; colorClass: string; icon: ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className={`rounded-xl border p-5 ${bgClass}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-snug">{label}</p>
        <Icon size={16} className={colorClass} />
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function DashboardScreen({ dogs, onNavigate }: { dogs: Dog[]; onNavigate: (v: View, p?: { dogId?: string }) => void }) {
  const stats = {
    total: dogs.length,
    available: dogs.filter(d => d.status === 'available').length,
    treatment: dogs.filter(d => d.status === 'treatment').length,
    adoption: dogs.filter(d => d.status === 'adoption').length,
    adopted: dogs.filter(d => d.status === 'adopted').length,
  }
  const treatmentDogs = dogs.filter(d => d.status === 'treatment')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Dashboard" subtitle="Resumen general del albergue" />
      <div className="flex-1 overflow-y-auto p-7 space-y-7">
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Total de perros" value={stats.total} bgClass="bg-white border-gray-200" colorClass="text-gray-400" icon={PawPrint} />
          <StatCard label="Disponibles" value={stats.available} bgClass="bg-emerald-50 border-emerald-200" colorClass="text-emerald-500" icon={CheckCircle} />
          <StatCard label="En tratamiento" value={stats.treatment} bgClass="bg-amber-50 border-amber-200" colorClass="text-amber-500" icon={AlertTriangle} />
          <StatCard label="En adopción" value={stats.adoption} bgClass="bg-blue-50 border-blue-200" colorClass="text-blue-500" icon={Heart} />
          <StatCard label="Adoptados" value={stats.adopted} bgClass="bg-gray-50 border-gray-200" colorClass="text-gray-400" icon={Activity} />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">Perros que requieren atención</h2>
              {treatmentDogs.length > 0 && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  {treatmentDogs.length} en tratamiento
                </span>
              )}
            </div>
            <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
              {treatmentDogs.length === 0 ? (
                <EmptyState icon={CheckCircle} title="Sin perros en tratamiento" description="Todos los animales están en buen estado" />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-100 bg-warm-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Perro</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Raza</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingreso</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatmentDogs.map((dog, i) => (
                      <tr key={dog.id} className={i < treatmentDogs.length - 1 ? 'border-b border-warm-100' : ''}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img src={dog.photo} alt={dog.name} className="size-9 rounded-full object-cover bg-gray-100 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{dog.name}</p>
                              <p className="text-xs text-gray-400">{SEX_LABEL[dog.sex]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{dog.breed}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(dog.entryDate)}</td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => onNavigate('dog-detail', { dogId: dog.id })}
                            className="text-forest-600 hover:text-forest-700 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                          >
                            Ver <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <h2 className="font-bold text-gray-800 mb-3">Distribución por estado</h2>
            <div className="bg-white rounded-xl border border-warm-200 p-5 space-y-4">
              {[
                { label: 'Disponibles', count: stats.available, barClass: 'bg-emerald-500' },
                { label: 'En tratamiento', count: stats.treatment, barClass: 'bg-amber-500' },
                { label: 'En adopción', count: stats.adoption, barClass: 'bg-blue-500' },
                { label: 'Adoptados', count: stats.adopted, barClass: 'bg-gray-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.barClass} rounded-full transition-all`}
                      style={{ width: stats.total > 0 ? `${(item.count / stats.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dogs List ─────────────────────────────────────────────────────────────────

function DogCard({ dog, onClick }: { dog: Dog; onClick: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-warm-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      <div className="relative h-44 bg-gray-100 overflow-hidden" onClick={onClick}>
        <img src={dog.photo} alt={dog.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${DOG_STATUS_STYLES[dog.status]}`}>
            {DOG_STATUS_LABELS[dog.status]}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg leading-tight">{dog.name}</h3>
        <p className="text-gray-500 text-sm mb-3">{dog.breed}</p>
        <div className="grid grid-cols-3 gap-1 mb-4 bg-warm-50 rounded-lg p-2.5">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-0.5">Sexo</p>
            <p className="text-xs font-bold text-gray-700">{SEX_LABEL[dog.sex]}</p>
          </div>
          <div className="text-center border-x border-warm-200">
            <p className="text-xs text-gray-400 mb-0.5">Edad</p>
            <p className="text-xs font-bold text-gray-700">{calcAge(dog.birthDate)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-0.5">Tamaño</p>
            <p className="text-xs font-bold text-gray-700">{SIZE_LABEL[dog.size]}</p>
          </div>
        </div>
        <button
          onClick={onClick}
          className="w-full bg-forest-50 hover:bg-forest-100 text-forest-700 py-2 rounded-lg text-sm font-bold transition-colors border border-forest-200"
        >
          Ver detalle
        </button>
      </div>
    </div>
  )
}

function DogsListScreen({ dogs, onNavigate }: { dogs: Dog[]; onNavigate: (v: View, p?: { dogId?: string }) => void }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DogStatus | 'all'>('all')

  const filtered = dogs.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = d.name.toLowerCase().includes(q) || d.breed.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Perros"
        subtitle={`${dogs.length} perros registrados en el albergue`}
        action={{ label: 'Registrar perro', icon: Plus, onClick: () => onNavigate('dog-new') }}
      />
      <div className="flex-1 overflow-y-auto p-7">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o raza..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as DogStatus | 'all')}
              className="pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-500 appearance-none"
            >
              <option value="all">Todos los estados</option>
              <option value="available">Disponible</option>
              <option value="treatment">En tratamiento</option>
              <option value="adoption">En proceso de adopción</option>
              <option value="adopted">Adoptado</option>
            </select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={PawPrint} title="No se encontraron perros" description="Intenta ajustar los filtros de búsqueda" />
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filtered.map(dog => (
              <DogCard key={dog.id} dog={dog} onClick={() => onNavigate('dog-detail', { dogId: dog.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Dog Form ──────────────────────────────────────────────────────────────────

function DogFormScreen({ dog, onSave, onCancel, isEdit = false }: {
  dog?: Dog; isEdit?: boolean
  onSave: (d: Omit<Dog, 'id'>) => void; onCancel: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    name: dog?.name ?? '', photo: dog?.photo ?? '',
    sex: dog?.sex ?? ('male' as Sex), birthDate: dog?.birthDate ?? '',
    breed: dog?.breed ?? '', color: dog?.color ?? '',
    size: dog?.size ?? ('medium' as DogSize),
    entryDate: dog?.entryDate ?? today,
    status: dog?.status ?? ('available' as DogStatus),
  })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title={isEdit ? 'Editar perro' : 'Registrar perro'}
        subtitle={isEdit ? 'Modifica la información del perro' : 'Completa los datos del nuevo ingreso'}
        onBack={onCancel}
      />
      <div className="flex-1 overflow-y-auto p-7">
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="max-w-2xl space-y-5">
          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <h2 className="font-bold text-gray-800 mb-5">Información básica</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre *</label>
                <input required type="text" value={form.name} onChange={e => set('name', e.target.value)} className={INPUT_CLS} placeholder="Nombre del perro" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Raza *</label>
                <input required type="text" value={form.breed} onChange={e => set('breed', e.target.value)} className={INPUT_CLS} placeholder="Ej: Labrador Retriever" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sexo *</label>
                <select required value={form.sex} onChange={e => set('sex', e.target.value as Sex)} className={SELECT_CLS}>
                  <option value="male">Macho</option>
                  <option value="female">Hembra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de nacimiento</label>
                <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Color</label>
                <input type="text" value={form.color} onChange={e => set('color', e.target.value)} className={INPUT_CLS} placeholder="Ej: Dorado, Tricolor, Negro..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tamaño *</label>
                <select required value={form.size} onChange={e => set('size', e.target.value as DogSize)} className={SELECT_CLS}>
                  <option value="small">Pequeño</option>
                  <option value="medium">Mediano</option>
                  <option value="large">Grande</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de ingreso *</label>
                <input required type="date" value={form.entryDate} onChange={e => set('entryDate', e.target.value)} className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                <select required value={form.status} onChange={e => set('status', e.target.value as DogStatus)} className={SELECT_CLS}>
                  <option value="available">Disponible</option>
                  <option value="treatment">En tratamiento</option>
                  <option value="adoption">En proceso de adopción</option>
                  <option value="adopted">Adoptado</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Foto</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">URL de la foto</label>
              <input type="url" value={form.photo} onChange={e => set('photo', e.target.value)} className={INPUT_CLS} placeholder="https://..." />
            </div>
            <div className="mt-4">
              {form.photo ? (
                <img src={form.photo} alt="Vista previa" className="size-28 rounded-xl object-cover bg-gray-100" />
              ) : (
                <div className="size-28 rounded-xl bg-warm-100 border-2 border-dashed border-warm-300 flex items-center justify-center">
                  <div className="text-center">
                    <PawPrint size={22} className="mx-auto text-warm-300 mb-1" />
                    <p className="text-xs text-gray-400">Sin foto</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pb-4">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-lg text-sm font-bold transition-colors">
              {isEdit ? 'Guardar cambios' : 'Registrar perro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Medical History (tab content) ─────────────────────────────────────────────

function MedicalHistoryTab({ records, onNew }: { records: MedicalRecord[]; onNew: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{records.length} atenciones registradas</p>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          <Plus size={14} /> Registrar atención
        </button>
      </div>
      {records.length === 0 ? (
        <div className="bg-white rounded-xl border border-warm-200">
          <EmptyState icon={Stethoscope} title="Sin historial médico" description="Registra la primera atención médica del animal" />
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-warm-200 p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="size-9 rounded-full bg-forest-50 border border-forest-200 flex items-center justify-center flex-shrink-0">
                  <Stethoscope size={15} className="text-forest-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{r.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.date)} · {r.vet}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Diagnóstico</p>
                  <p className="text-sm text-gray-700">{r.diagnosis}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tratamiento</p>
                  <p className="text-sm text-gray-700">{r.treatment}</p>
                </div>
                {r.observations && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observaciones</p>
                    <p className="text-sm text-gray-600">{r.observations}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Adoption Tab (inside dog detail) ─────────────────────────────────────────

function AdoptionTab({ dog, adoption, onNewAdoption, onViewAdoption }: {
  dog: Dog; adoption: Adoption | undefined
  onNewAdoption: () => void; onViewAdoption: (id: string) => void
}) {
  if (adoption) {
    return (
      <div className="bg-white rounded-xl border border-warm-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Proceso de adopción</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ADOPTION_STATUS_STYLES[adoption.status]}`}>
            {ADOPTION_STATUS_LABELS[adoption.status]}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <InfoRow label="Adoptante" value={adoption.adopterName} />
          <InfoRow label="Teléfono" value={adoption.adopterPhone} />
          <InfoRow label="Fecha" value={formatDate(adoption.date)} />
          <InfoRow label="Dirección" value={adoption.adopterAddress} />
          {adoption.observations && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Observaciones</p>
              <p className="text-sm text-gray-700">{adoption.observations}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => onViewAdoption(adoption.id)}
          className="text-forest-600 hover:text-forest-700 text-sm font-bold flex items-center gap-1 transition-colors"
        >
          Ver detalle completo <ChevronRight size={14} />
        </button>
      </div>
    )
  }

  if (dog.status !== 'available') {
    return (
      <div className="bg-white rounded-xl border border-warm-200">
        <EmptyState
          icon={Heart}
          title="Sin proceso de adopción"
          description={dog.status === 'treatment' ? 'El perro está en tratamiento médico' : 'El perro no está disponible para adopción'}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-warm-200 p-8 text-center">
      <div className="size-14 rounded-full bg-forest-50 flex items-center justify-center mx-auto mb-4">
        <Heart size={24} className="text-forest-500" />
      </div>
      <p className="font-bold text-gray-900 mb-1">Este perro está disponible para adopción</p>
      <p className="text-sm text-gray-400 mb-6">Puedes iniciar un proceso de adopción registrando los datos del adoptante.</p>
      <button
        onClick={onNewAdoption}
        className="bg-forest-600 hover:bg-forest-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
      >
        Iniciar proceso de adopción
      </button>
    </div>
  )
}

// ── Dog Detail ────────────────────────────────────────────────────────────────

function DogDetailScreen({ dog, medicalRecords, adoption, onBack, onEdit, onNewMedical, onNewAdoption, onNavigateAdoption }: {
  dog: Dog; medicalRecords: MedicalRecord[]; adoption: Adoption | undefined
  onBack: () => void; onEdit: (id: string) => void
  onNewMedical: (id: string) => void; onNewAdoption: (id: string) => void
  onNavigateAdoption: (id: string) => void
}) {
  const [tab, setTab] = useState<DogDetailTab>('info')
  const dogRecords = medicalRecords
    .filter(r => r.dogId === dog.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const tabs: { id: DogDetailTab; label: string }[] = [
    { id: 'info', label: 'Información' },
    { id: 'medical', label: `Historial médico${dogRecords.length > 0 ? ` (${dogRecords.length})` : ''}` },
    { id: 'adoption', label: 'Adopción' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-5 border-b border-warm-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{dog.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${DOG_STATUS_STYLES[dog.status]}`}>
                {DOG_STATUS_LABELS[dog.status]}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{dog.breed} · {SEX_LABEL[dog.sex]} · {calcAge(dog.birthDate)}</p>
          </div>
        </div>
        <button
          onClick={() => onEdit(dog.id)}
          className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          <Pencil size={14} /> Editar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-7">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
              <div className="h-52 bg-gray-100">
                {dog.photo
                  ? <img src={dog.photo} alt={dog.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><PawPrint size={40} className="text-gray-300" /></div>
                }
              </div>
              <div className="p-4 space-y-0">
                {[
                  { label: 'Color', value: dog.color || '—' },
                  { label: 'Tamaño', value: SIZE_LABEL[dog.size] },
                  { label: 'Ingreso', value: formatDate(dog.entryDate) },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-bold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="flex gap-1 bg-warm-100 p-1 rounded-xl mb-5 w-fit">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === t.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'info' && (
              <div className="bg-white rounded-xl border border-warm-200 p-6">
                <h3 className="font-bold text-gray-800 mb-5">Información general</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: 'Nombre', value: dog.name },
                    { label: 'Raza', value: dog.breed },
                    { label: 'Sexo', value: SEX_LABEL[dog.sex] },
                    { label: 'Edad', value: calcAge(dog.birthDate) },
                    { label: 'Fecha de nacimiento', value: dog.birthDate ? formatDate(dog.birthDate) : '—' },
                    { label: 'Color', value: dog.color || '—' },
                    { label: 'Tamaño', value: SIZE_LABEL[dog.size] },
                    { label: 'Fecha de ingreso', value: formatDate(dog.entryDate) },
                    { label: 'Estado actual', value: DOG_STATUS_LABELS[dog.status] },
                  ].map(item => (
                    <div key={item.label} className="pb-3 border-b border-gray-50">
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-bold text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'medical' && (
              <MedicalHistoryTab records={dogRecords} onNew={() => onNewMedical(dog.id)} />
            )}

            {tab === 'adoption' && (
              <AdoptionTab
                dog={dog}
                adoption={adoption}
                onNewAdoption={() => onNewAdoption(dog.id)}
                onViewAdoption={onNavigateAdoption}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Medical Form ──────────────────────────────────────────────────────────────

function MedicalFormScreen({ dogId, dogs, onSave, onCancel }: {
  dogId: string; dogs: Dog[]
  onSave: (r: Omit<MedicalRecord, 'id'>) => void; onCancel: () => void
}) {
  const dog = dogs.find(d => d.id === dogId)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ date: today, reason: '', diagnosis: '', treatment: '', observations: '', vet: '' })

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Registrar atención médica"
        subtitle={dog ? `Para: ${dog.name} · ${dog.breed}` : undefined}
        onBack={onCancel}
      />
      <div className="flex-1 overflow-y-auto p-7">
        <form onSubmit={e => { e.preventDefault(); onSave({ dogId, ...form }) }} className="max-w-2xl space-y-5">
          <div className="bg-white rounded-xl border border-warm-200 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de atención *</label>
                <input required type="date" value={form.date} onChange={e => set('date', e.target.value)} className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Veterinario responsable *</label>
                <input required type="text" value={form.vet} onChange={e => set('vet', e.target.value)} className={INPUT_CLS} placeholder="Dr. / Dra. Nombre Apellido" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Motivo de consulta *</label>
              <input required type="text" value={form.reason} onChange={e => set('reason', e.target.value)} className={INPUT_CLS} placeholder="Ej: Revisión general, vacunación, herida..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Diagnóstico *</label>
              <textarea required rows={3} value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} className={TEXTAREA_CLS} placeholder="Descripción del diagnóstico médico" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tratamiento *</label>
              <textarea required rows={3} value={form.treatment} onChange={e => set('treatment', e.target.value)} className={TEXTAREA_CLS} placeholder="Medicamentos, procedimientos o indicaciones" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observaciones</label>
              <textarea rows={3} value={form.observations} onChange={e => set('observations', e.target.value)} className={TEXTAREA_CLS} placeholder="Observaciones adicionales (opcional)" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pb-4">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-lg text-sm font-bold transition-colors">
              Registrar atención
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Adoptions List ────────────────────────────────────────────────────────────

function AdoptionsListScreen({ adoptions, dogs, onNavigate }: {
  adoptions: Adoption[]; dogs: Dog[]
  onNavigate: (v: View, p?: { adoptionId?: string }) => void
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Adopciones"
        subtitle={`${adoptions.length} procesos registrados`}
        action={{ label: 'Registrar adopción', icon: Plus, onClick: () => onNavigate('adoption-new') }}
      />
      <div className="flex-1 overflow-y-auto p-7">
        {adoptions.length === 0 ? (
          <EmptyState icon={Heart} title="No hay adopciones registradas" description="Registra el primer proceso de adopción" />
        ) : (
          <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50">
                  {['Perro', 'Adoptante', 'Teléfono', 'Fecha', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adoptions.map((a, i) => {
                  const dog = dogs.find(d => d.id === a.dogId)
                  return (
                    <tr key={a.id} className={i < adoptions.length - 1 ? 'border-b border-warm-100 hover:bg-warm-50 transition-colors' : 'hover:bg-warm-50 transition-colors'}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {dog && (
                            <img src={dog.photo} alt={dog.name} className="size-9 rounded-full object-cover bg-gray-100 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{dog?.name ?? '—'}</p>
                            <p className="text-xs text-gray-400">{dog?.breed ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">{a.adopterName}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{a.adopterPhone}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{formatDate(a.date)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ADOPTION_STATUS_STYLES[a.status]}`}>
                          {ADOPTION_STATUS_LABELS[a.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => onNavigate('adoption-detail', { adoptionId: a.id })}
                          className="text-forest-600 hover:text-forest-700 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                        >
                          Ver detalle <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Adoption Form ─────────────────────────────────────────────────────────────

function AdoptionFormScreen({ dogs, preselectedDogId, onSave, onCancel }: {
  dogs: Dog[]; preselectedDogId?: string
  onSave: (a: Omit<Adoption, 'id'>) => void; onCancel: () => void
}) {
  const eligible = dogs.filter(d => d.status === 'available' || d.id === preselectedDogId)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    dogId: preselectedDogId ?? eligible[0]?.id ?? '',
    adopterName: '', adopterPhone: '', adopterAddress: '',
    date: today, observations: '',
    status: 'in_process' as AdoptionStatus,
  })

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Registrar adopción" subtitle="Completa la información del adoptante y la adopción" onBack={onCancel} />
      <div className="flex-1 overflow-y-auto p-7">
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="max-w-2xl space-y-5">
          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Perro</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Seleccionar perro *</label>
              <select
                required
                value={form.dogId}
                onChange={e => set('dogId', e.target.value)}
                disabled={!!preselectedDogId}
                className={SELECT_CLS}
              >
                <option value="">Selecciona un perro</option>
                {eligible.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.breed} ({SEX_LABEL[d.sex]})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Datos del adoptante</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre completo *</label>
                  <input required type="text" value={form.adopterName} onChange={e => set('adopterName', e.target.value)} className={INPUT_CLS} placeholder="Nombre y apellidos" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono *</label>
                  <input required type="tel" value={form.adopterPhone} onChange={e => set('adopterPhone', e.target.value)} className={INPUT_CLS} placeholder="Ej: 3001234567" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dirección *</label>
                <input required type="text" value={form.adopterAddress} onChange={e => set('adopterAddress', e.target.value)} className={INPUT_CLS} placeholder="Dirección completa de residencia" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Detalles de la adopción</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de adopción *</label>
                  <input required type="date" value={form.date} onChange={e => set('date', e.target.value)} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={SELECT_CLS}>
                    <option value="in_process">En proceso</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                    <option value="completed">Finalizada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observaciones</label>
                <textarea rows={3} value={form.observations} onChange={e => set('observations', e.target.value)} className={TEXTAREA_CLS} placeholder="Información adicional sobre el adoptante o el proceso" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pb-4">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-lg text-sm font-bold transition-colors">
              Registrar adopción
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Adoption Detail ───────────────────────────────────────────────────────────

function AdoptionDetailScreen({ adoption, dog, onBack, onUpdateStatus }: {
  adoption: Adoption; dog: Dog | undefined
  onBack: () => void; onUpdateStatus: (id: string, s: AdoptionStatus) => void
}) {
  const [status, setStatus] = useState(adoption.status)

  function handleStatus(s: AdoptionStatus) {
    setStatus(s)
    onUpdateStatus(adoption.id, s)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-5 border-b border-warm-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Detalle de adopción</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ADOPTION_STATUS_STYLES[status]}`}>
                {ADOPTION_STATUS_LABELS[status]}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">Registrada el {formatDate(adoption.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Estado:</span>
          <select
            value={status}
            onChange={e => handleStatus(e.target.value as AdoptionStatus)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white text-gray-700"
          >
            <option value="in_process">En proceso</option>
            <option value="approved">Aprobada</option>
            <option value="rejected">Rechazada</option>
            <option value="completed">Finalizada</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-7">
        <div className="max-w-3xl space-y-5">
          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PawPrint size={15} className="text-forest-500" />
              Información del perro
            </h2>
            {dog ? (
              <div className="flex items-center gap-5">
                <img src={dog.photo} alt={dog.name} className="size-20 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                <div className="grid grid-cols-3 gap-4 flex-1">
                  <InfoRow label="Nombre" value={dog.name} />
                  <InfoRow label="Raza" value={dog.breed} />
                  <InfoRow label="Sexo" value={SEX_LABEL[dog.sex]} />
                  <InfoRow label="Edad" value={calcAge(dog.birthDate)} />
                  <InfoRow label="Tamaño" value={SIZE_LABEL[dog.size]} />
                  <InfoRow label="Estado" value={DOG_STATUS_LABELS[dog.status]} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Información no disponible</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User size={15} className="text-forest-500" />
              Información del adoptante
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Nombre completo" value={adoption.adopterName} />
              <InfoRow label="Teléfono" value={adoption.adopterPhone} />
              <div className="col-span-2">
                <InfoRow label="Dirección" value={adoption.adopterAddress} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-warm-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={15} className="text-forest-500" />
              Detalles del proceso
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Fecha de adopción" value={formatDate(adoption.date)} />
              <InfoRow label="Estado actual" value={ADOPTION_STATUS_LABELS[status]} />
              {adoption.observations && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Observaciones</p>
                  <p className="text-sm text-gray-700">{adoption.observations}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('login')
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null)
  const [selectedAdoptionId, setSelectedAdoptionId] = useState<string | null>(null)
  const [preselectedDogForAdoption, setPreselectedDogForAdoption] = useState<string | undefined>()
  const [dogs, setDogs] = useState<Dog[]>(INITIAL_DOGS)
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(INITIAL_MEDICAL)
  const [adoptions, setAdoptions] = useState<Adoption[]>(INITIAL_ADOPTIONS)

  function navigate(v: View, params?: { dogId?: string; adoptionId?: string }) {
    if (params?.dogId !== undefined) setSelectedDogId(params.dogId)
    if (params?.adoptionId !== undefined) setSelectedAdoptionId(params.adoptionId)
    setView(v)
  }

  function handleSaveDog(dogData: Omit<Dog, 'id'>) {
    if (view === 'dog-edit' && selectedDogId) {
      setDogs(prev => prev.map(d => d.id === selectedDogId ? { ...dogData, id: selectedDogId } : d))
      setView('dog-detail')
    } else {
      const newDog = { ...dogData, id: `d${Date.now()}` }
      setDogs(prev => [...prev, newDog])
      setSelectedDogId(newDog.id)
      setView('dog-detail')
    }
  }

  function handleSaveMedical(record: Omit<MedicalRecord, 'id'>) {
    setMedicalRecords(prev => [...prev, { ...record, id: `m${Date.now()}` }])
    setView('dog-detail')
  }

  function handleSaveAdoption(data: Omit<Adoption, 'id'>) {
    const newAdoption = { ...data, id: `a${Date.now()}` }
    setAdoptions(prev => [...prev, newAdoption])
    if (data.status === 'completed') {
      setDogs(prev => prev.map(d => d.id === data.dogId ? { ...d, status: 'adopted' } : d))
    } else if (data.status === 'in_process' || data.status === 'approved') {
      setDogs(prev => prev.map(d => d.id === data.dogId ? { ...d, status: 'adoption' } : d))
    }
    setSelectedAdoptionId(newAdoption.id)
    setView('adoptions')
  }

  function handleUpdateAdoptionStatus(adoptionId: string, newStatus: AdoptionStatus) {
    const adoption = adoptions.find(a => a.id === adoptionId)
    setAdoptions(prev => prev.map(a => a.id === adoptionId ? { ...a, status: newStatus } : a))
    if (adoption) {
      setDogs(prev => prev.map(d => {
        if (d.id !== adoption.dogId) return d
        if (newStatus === 'completed') return { ...d, status: 'adopted' }
        if (newStatus === 'in_process' || newStatus === 'approved') return { ...d, status: 'adoption' }
        if (newStatus === 'rejected') return { ...d, status: 'available' }
        return d
      }))
    }
  }

  const selectedDog = dogs.find(d => d.id === selectedDogId)
  const selectedAdoption = adoptions.find(a => a.id === selectedAdoptionId)
  const selectedDogAdoption = selectedDog ? adoptions.find(a => a.dogId === selectedDog.id) : undefined

  if (view === 'login') {
    return (
      <div className="h-full">
        <LoginScreen onLogin={() => setView('dashboard')} />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-warm-50 overflow-hidden">
      <Sidebar
        view={view}
        onNavigate={navigate}
        onLogout={() => setView('login')}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {view === 'dashboard' && (
          <DashboardScreen dogs={dogs} onNavigate={navigate} />
        )}

        {view === 'dogs' && (
          <DogsListScreen dogs={dogs} onNavigate={navigate} />
        )}

        {view === 'dog-new' && (
          <DogFormScreen
            onSave={handleSaveDog}
            onCancel={() => setView('dogs')}
          />
        )}

        {view === 'dog-edit' && selectedDog && (
          <DogFormScreen
            dog={selectedDog}
            isEdit
            onSave={handleSaveDog}
            onCancel={() => setView('dog-detail')}
          />
        )}

        {view === 'dog-detail' && selectedDog && (
          <DogDetailScreen
            dog={selectedDog}
            medicalRecords={medicalRecords}
            adoption={selectedDogAdoption}
            onBack={() => setView('dogs')}
            onEdit={id => { setSelectedDogId(id); setView('dog-edit') }}
            onNewMedical={id => { setSelectedDogId(id); setView('medical-new') }}
            onNewAdoption={id => { setPreselectedDogForAdoption(id); setView('adoption-new') }}
            onNavigateAdoption={id => { setSelectedAdoptionId(id); setView('adoption-detail') }}
          />
        )}

        {view === 'medical-new' && selectedDogId && (
          <MedicalFormScreen
            dogId={selectedDogId}
            dogs={dogs}
            onSave={handleSaveMedical}
            onCancel={() => setView('dog-detail')}
          />
        )}

        {view === 'adoptions' && (
          <AdoptionsListScreen
            adoptions={adoptions}
            dogs={dogs}
            onNavigate={navigate}
          />
        )}

        {view === 'adoption-new' && (
          <AdoptionFormScreen
            dogs={dogs}
            preselectedDogId={preselectedDogForAdoption}
            onSave={handleSaveAdoption}
            onCancel={() => {
              setPreselectedDogForAdoption(undefined)
              setView(preselectedDogForAdoption ? 'dog-detail' : 'adoptions')
            }}
          />
        )}

        {view === 'adoption-detail' && selectedAdoption && (
          <AdoptionDetailScreen
            adoption={selectedAdoption}
            dog={dogs.find(d => d.id === selectedAdoption.dogId)}
            onBack={() => setView('adoptions')}
            onUpdateStatus={handleUpdateAdoptionStatus}
          />
        )}
      </main>
    </div>
  )
}
