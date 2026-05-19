'use client'

import { useState, useEffect } from 'react'
import type { Clinic, ClinicMember } from '@/app/actions/admin'
import {
  createClinic,
  getClinicMembers, addClinicMember, removeClinicMember,
  getClinicSettings, upsertClinicSetting,
} from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import {
  Plus, Building2, Users, Settings2, ChevronRight,
  X, Check, Loader2, Trash2, ArrowLeft, Palette,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Form: Nova clínica ────────────────────────────────────────────────────

function NewClinicForm({ onCreated, onCancel }: {
  onCreated: (c: Clinic) => void
  onCancel: () => void
}) {
  const [name, setName]   = useState('')
  const [slug, setSlug]   = useState('')
  const [color, setColor] = useState('#7EB8D4')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function handleName(v: string) { setName(v); setSlug(slugify(v)) }

  async function handleSubmit() {
    if (!name.trim() || !slug.trim()) return
    setSaving(true)
    const res = await createClinic({ name: name.trim(), slug: slug.trim(), primary_color: color })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onCreated(res.clinic as Clinic)
  }

  return (
    <div className="px-6 py-5 border-b border-indigo-100 bg-indigo-50/40">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-800">Nova clínica</p>
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome da clínica *</label>
            <input value={name} onChange={e => handleName(e.target.value)}
              placeholder="Ex: Clínica São Lucas"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL) *</label>
            <input value={slug} onChange={e => setSlug(e.target.value)}
              placeholder="sao-lucas"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cor primária</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <span className="text-xs font-mono text-gray-500">{color}</span>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={!name || !slug || saving}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              name && slug && !saving
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Criar clínica
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Aba: Membros ──────────────────────────────────────────────────────────

function MembersTab({ clinicId, members, loading, onRefresh }: {
  clinicId: string
  members: ClinicMember[]
  loading: boolean
  onRefresh: (m: ClinicMember[]) => void
}) {
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState<'medico' | 'secretaria'>('medico')
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  const roleLabel = (r: string) => ({ owner: 'Dono', medico: 'Médico', secretaria: 'Secretaria' }[r] ?? r)

  async function handleAdd() {
    if (!email.trim()) return
    setSaving(true); setError('')
    const res = await addClinicMember(clinicId, email.trim(), role)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setEmail('')
    const updated = await getClinicMembers(clinicId)
    onRefresh(updated)
  }

  async function handleRemove(id: string) {
    if (!confirm('Remover membro?')) return
    await removeClinicMember(id)
    onRefresh(members.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 p-4 bg-white/60 space-y-3">
        <p className="text-sm font-medium text-gray-700">Adicionar membro</p>
        <div className="flex gap-2 flex-wrap">
          <input value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="email@exemplo.com"
            className="flex-1 min-w-48 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <select value={role} onChange={e => setRole(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="medico">Médico</option>
            <option value="secretaria">Secretaria</option>
          </select>
          <button onClick={handleAdd} disabled={!email || saving}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              email && !saving ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Adicionar
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="rounded-xl border border-gray-100 overflow-hidden bg-white/60">
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Nenhum membro ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Função</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Desde</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.profile?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      m.role === 'owner'      ? 'bg-amber-100 text-amber-700' :
                      m.role === 'medico'     ? 'bg-blue-100 text-blue-700'   :
                                                'bg-gray-100 text-gray-600')}>
                      {roleLabel(m.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{fmtDate(m.created_at)}</td>
                  <td className="px-4 py-3">
                    {m.role !== 'owner' && (
                      <button onClick={() => handleRemove(m.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Aba: Configurações guiadas ────────────────────────────────────────────

const SETTINGS_FIELDS = [
  { key: 'nome_exibicao',  label: 'Nome de exibição',   placeholder: 'Ex: Clínica Santa Catharina',  type: 'text'  },
  { key: 'especialidade',  label: 'Especialidade',       placeholder: 'Ex: Nefrologia',               type: 'text'  },
  { key: 'telefone',       label: 'Telefone',            placeholder: 'Ex: (48) 99999-0000',          type: 'text'  },
  { key: 'email_contato',  label: 'E-mail de contato',   placeholder: 'contato@clinica.com.br',       type: 'email' },
  { key: 'endereco',       label: 'Endereço',            placeholder: 'Rua, número, cidade',          type: 'text'  },
  { key: 'site',           label: 'Site / Instagram',    placeholder: 'https://... ou @handle',       type: 'text'  },
  { key: 'cor_primaria',   label: 'Cor primária',        placeholder: '#7EB8D4',                      type: 'color' },
  { key: 'timezone',       label: 'Fuso horário',        placeholder: 'America/Sao_Paulo',            type: 'text'  },
  { key: 'moeda',          label: 'Moeda',               placeholder: 'BRL',                          type: 'text'  },
]

function SettingsTab({ clinicId, settings, loading }: {
  clinicId: string
  settings: Record<string, string>
  loading: boolean
}) {
  const [local, setLocal]   = useState<Record<string, string>>(settings)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved,  setSaved]  = useState<string | null>(null)

  useEffect(() => { setLocal(settings) }, [settings])

  async function handleSave(key: string) {
    setSaving(key)
    await upsertClinicSetting(clinicId, key, local[key] ?? '')
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
  }

  return (
    <div className="space-y-3">
      {SETTINGS_FIELDS.map(field => (
        <div key={field.key}
          className="rounded-xl border border-gray-100 bg-white/60 px-4 py-3 flex items-center gap-4">
          <div className="w-44 shrink-0">
            <p className="text-sm font-medium text-gray-700">{field.label}</p>
            <p className="text-xs text-gray-400 font-mono">{field.key}</p>
          </div>

          {field.type === 'color' ? (
            <div className="flex items-center gap-3 flex-1">
              <input
                type="color"
                value={local[field.key] ?? '#7EB8D4'}
                onChange={e => setLocal(l => ({ ...l, [field.key]: e.target.value }))}
                className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={local[field.key] ?? ''}
                onChange={e => setLocal(l => ({ ...l, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          ) : (
            <input
              type={field.type}
              value={local[field.key] ?? ''}
              onChange={e => setLocal(l => ({ ...l, [field.key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave(field.key)}
              placeholder={field.placeholder}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          )}

          <button
            onClick={() => handleSave(field.key)}
            disabled={saving === field.key}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0',
              saved === field.key
                ? 'bg-green-100 text-green-700'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            )}
          >
            {saving === field.key
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : saved === field.key
                ? <Check className="w-3.5 h-3.5" />
                : 'Salvar'
            }
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Detalhe da clínica ────────────────────────────────────────────────────

function ClinicDetail({ clinic, onBack }: { clinic: Clinic; onBack: () => void }) {
  const [members, setMembers]   = useState<ClinicMember[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getClinicMembers(clinic.id),
      getClinicSettings(clinic.id),
    ]).then(([m, s]) => {
      setMembers(m)
      setSettings(s)
      setLoading(false)
    })
  }, [clinic.id])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Voltar">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: clinic.primary_color }}>
          {clinic.name[0]}
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{clinic.name}</h2>
          <p className="text-xs text-gray-400 font-mono">{clinic.slug}</p>
        </div>
        <span className={cn('ml-auto text-xs px-2.5 py-1 rounded-full font-medium',
          clinic.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
          {clinic.active ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {([
          ['members',  'Membros',         Users],
          ['settings', 'Configurações',   Settings2],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'members' && (
        <MembersTab
          clinicId={clinic.id}
          members={members}
          loading={loading}
          onRefresh={setMembers}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          clinicId={clinic.id}
          settings={settings}
          loading={loading}
        />
      )}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────

export default function AdminDashboard({ initialClinics }: { initialClinics: Clinic[] }) {
  const [clinics, setClinics]           = useState<Clinic[]>(initialClinics)
  const [selectedClinic, setSelected]   = useState<Clinic | null>(null)
  const [showNewForm, setShowNewForm]   = useState(false)

  if (selectedClinic) {
    return (
      <div className="rounded-2xl overflow-hidden border border-white/60 p-6"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 24px rgba(26,31,46,0.08)' }}>
        <ClinicDetail clinic={selectedClinic} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Clínicas ativas',  value: clinics.filter(c => c.active).length,                          color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Total de clínicas', value: clinics.length,                                                 color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Membros totais',   value: clinics.reduce((a, c) => a + (c.member_count ?? 0), 0),         color: 'text-blue-600',   bg: 'bg-blue-50'   },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/60 p-4"
            style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Clinics list */}
      <div className="rounded-2xl overflow-hidden border border-white/60"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 24px rgba(26,31,46,0.08)' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h2 className="font-semibold text-gray-900">Clínicas</h2>
          </div>
          {!showNewForm && (
            <button onClick={() => setShowNewForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" />
              Nova clínica
            </button>
          )}
        </div>

        {showNewForm && (
          <NewClinicForm
            onCreated={c => { setClinics(prev => [c, ...prev]); setShowNewForm(false) }}
            onCancel={() => setShowNewForm(false)}
          />
        )}

        {clinics.length === 0 && !showNewForm ? (
          <div className="py-16 text-center">
            <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma clínica cadastrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clínica</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Slug</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Membros</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clinics.map(clinic => (
                <tr key={clinic.id} onClick={() => setSelected(clinic)}
                  className="hover:bg-gray-50/60 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: clinic.primary_color }}>
                        {clinic.name[0]}
                      </div>
                      <span className="font-medium text-gray-800">{clinic.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400 hidden md:table-cell">{clinic.slug}</td>
                  <td className="px-6 py-4 text-gray-500">{clinic.member_count ?? 0}</td>
                  <td className="px-6 py-4">
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium',
                      clinic.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {clinic.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
