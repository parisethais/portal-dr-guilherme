'use client'

import { useState, useTransition } from 'react'
import type { Clinic, ClinicMember, ClinicSetting } from '@/app/actions/admin'
import {
  createClinic, updateClinic,
  getClinicMembers, addClinicMember, removeClinicMember,
  getClinicSettings, upsertClinicSetting,
} from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import {
  Plus, Building2, Users, Settings, ChevronRight,
  X, Check, Loader2, Pencil, Trash2, ArrowLeft,
  ExternalLink, ToggleLeft, ToggleRight,
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

// ── Novo form de clínica ──────────────────────────────────────────────────

function NewClinicForm({ onCreated, onCancel }: { onCreated: (c: Clinic) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [color, setColor] = useState('#7EB8D4')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleName(v: string) {
    setName(v)
    setSlug(slugify(v))
  }

  async function handleSubmit() {
    if (!name.trim() || !slug.trim()) return
    setSaving(true)
    const res = await createClinic({ name: name.trim(), slug: slug.trim(), primary_color: color })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onCreated(res.clinic as Clinic)
  }

  return (
    <div className="space-y-4">
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
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
        <button onClick={handleSubmit} disabled={!name || !slug || saving}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            name && slug && !saving ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Criar clínica
        </button>
      </div>
    </div>
  )
}

// ── Detalhe da clínica ────────────────────────────────────────────────────

function ClinicDetail({ clinic, onBack }: { clinic: Clinic; onBack: () => void }) {
  const [members, setMembers] = useState<ClinicMember[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members')
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()

  // Add member form
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'medico' | 'secretaria'>('medico')
  const [addError, setAddError] = useState('')
  const [addingSaving, setAddingSaving] = useState(false)

  // Settings edit
  const [editKey, setEditKey] = useState('')
  const [editVal, setEditVal] = useState('')
  const [settingSaving, setSettingSaving] = useState(false)

  // Load on mount
  if (!loaded) {
    setLoaded(true)
    startTransition(async () => {
      const [m, s] = await Promise.all([
        getClinicMembers(clinic.id),
        getClinicSettings(clinic.id),
      ])
      setMembers(m)
      setSettings(s)
    })
  }

  async function handleAddMember() {
    if (!memberEmail.trim()) return
    setAddingSaving(true); setAddError('')
    const res = await addClinicMember(clinic.id, memberEmail.trim(), memberRole)
    setAddingSaving(false)
    if (res.error) { setAddError(res.error); return }
    setMemberEmail('')
    const updated = await getClinicMembers(clinic.id)
    setMembers(updated)
  }

  async function handleRemoveMember(id: string) {
    if (!confirm('Remover membro?')) return
    await removeClinicMember(id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  async function handleSaveSetting() {
    if (!editKey.trim()) return
    setSettingSaving(true)
    await upsertClinicSetting(clinic.id, editKey.trim(), editVal.trim())
    setSettingSaving(false)
    setSettings(prev => ({ ...prev, [editKey.trim()]: editVal.trim() }))
    setEditKey(''); setEditVal('')
  }

  const roleLabel = (r: string) => ({ owner: 'Dono', medico: 'Médico', secretaria: 'Secretaria' }[r] ?? r)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
        {([['members', 'Membros', Users], ['settings', 'Configurações', Settings]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Members */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Add member */}
          <div className="rounded-xl border border-gray-100 p-4 bg-white/60 space-y-3">
            <p className="text-sm font-medium text-gray-700">Adicionar membro</p>
            <div className="flex gap-2">
              <input value={memberEmail} onChange={e => setMemberEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                placeholder="email@exemplo.com"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <select value={memberRole} onChange={e => setMemberRole(e.target.value as any)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="medico">Médico</option>
                <option value="secretaria">Secretaria</option>
              </select>
              <button onClick={handleAddMember} disabled={!memberEmail || addingSaving}
                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  memberEmail && !addingSaving ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                {addingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Adicionar
              </button>
            </div>
            {addError && <p className="text-xs text-red-500">{addError}</p>}
          </div>

          {/* List */}
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white/60">
            {pending ? (
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
                          m.role === 'owner' ? 'bg-amber-100 text-amber-700' :
                          m.role === 'medico' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                          {roleLabel(m.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{fmtDate(m.created_at)}</td>
                      <td className="px-4 py-3">
                        {m.role !== 'owner' && (
                          <button onClick={() => handleRemoveMember(m.id)}
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
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Add/edit setting */}
          <div className="rounded-xl border border-gray-100 p-4 bg-white/60 space-y-3">
            <p className="text-sm font-medium text-gray-700">Definir configuração</p>
            <div className="flex gap-2">
              <input value={editKey} onChange={e => setEditKey(e.target.value)}
                placeholder="Chave (ex: especialidade)"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <input value={editVal} onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveSetting()}
                placeholder="Valor"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <button onClick={handleSaveSetting} disabled={!editKey || settingSaving}
                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  editKey && !settingSaving ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                {settingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
          </div>

          {/* List settings */}
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white/60">
            {Object.keys(settings).length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Nenhuma configuração definida.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chave</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(settings).map(([k, v]) => (
                    <tr key={k} className="hover:bg-gray-50/60 group">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{k}</td>
                      <td className="px-4 py-3 text-gray-800">{v || <span className="text-gray-400 italic">vazio</span>}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setEditKey(k); setEditVal(v) }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────

export default function AdminDashboard({ initialClinics }: { initialClinics: Clinic[] }) {
  const [clinics, setClinics] = useState<Clinic[]>(initialClinics)
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  if (selectedClinic) {
    return (
      <div
        className="rounded-2xl overflow-hidden border border-white/60 p-6"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 24px rgba(26,31,46,0.08)' }}
      >
        <ClinicDetail clinic={selectedClinic} onBack={() => setSelectedClinic(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Clínicas ativas', value: clinics.filter(c => c.active).length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total de clínicas', value: clinics.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Membros totais', value: clinics.reduce((acc, c) => acc + (c.member_count ?? 0), 0), color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/60 p-4"
            style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Clinics list */}
      <div
        className="rounded-2xl overflow-hidden border border-white/60"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 24px rgba(26,31,46,0.08)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h2 className="font-semibold text-gray-900">Clínicas</h2>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova clínica
          </button>
        </div>

        {/* New clinic form */}
        {showNewForm && (
          <div className="px-6 py-5 border-b border-indigo-100 bg-indigo-50/40">
            <p className="text-sm font-semibold text-gray-800 mb-4">Nova clínica</p>
            <NewClinicForm
              onCreated={c => { setClinics(prev => [c, ...prev]); setShowNewForm(false) }}
              onCancel={() => setShowNewForm(false)}
            />
          </div>
        )}

        {/* List */}
        {clinics.length === 0 ? (
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
                <th className="px-6 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clinics.map(clinic => (
                <tr
                  key={clinic.id}
                  onClick={() => setSelectedClinic(clinic)}
                  className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                >
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
