'use client'

import { useState, useEffect } from 'react'
import type {
  Clinic, ClinicMember, MemberPermissions,
  ClinicConvenio, ClinicScheduleDay, ClinicConsultationType,
} from '@/app/actions/admin'
import {
  createClinic,
  getClinicMembers, addClinicMember, removeClinicMember,
  updateMemberRole, updateMemberPermissions,
  getClinicSettings, upsertClinicSetting,
  getClinicConvenios, createConvenio, updateConvenio, deleteConvenio,
  getClinicSchedule, upsertScheduleDay,
  getClinicConsultationTypes, createConsultationType, updateConsultationType, deleteConsultationType,
} from '@/app/actions/admin'
import { DEFAULT_PERMISSIONS } from '@/lib/admin-constants'
import { cn } from '@/lib/utils'
import {
  Plus, Building2, Users, Settings2, ChevronRight,
  X, Check, Loader2, Trash2, ArrowLeft,
  ExternalLink, LayoutDashboard, UserCircle,
  CreditCard, Clock, CalendarClock, Pencil,
  ChevronDown, FileText, Calendar, DollarSign,
  UserCheck, MessageSquare, StickyNote,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DEFAULT_SCHEDULE: Omit<ClinicScheduleDay, 'id' | 'clinic_id'>[] = DAY_NAMES.map((_, i) => ({
  day_of_week: i,
  open_time:   i === 0 || i === 6 ? '08:00' : '08:00',
  close_time:  i === 0 || i === 6 ? '12:00' : '18:00',
  active:      i >= 1 && i <= 5,
}))

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120]

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

function fmtBRL(n: number) {
  return n > 0 ? `R$ ${n.toFixed(2).replace('.', ',')}` : '—'
}

// ── Form: Nova clínica ────────────────────────────────────────────────────

function NewClinicForm({ onCreated, onCancel }: {
  onCreated: (c: Clinic) => void
  onCancel: () => void
}) {
  const [name, setName]   = useState('')
  const [slug, setSlug]   = useState('')
  const [color, setColor] = useState('#7A9E7E')
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
    <div className="px-6 py-5 border-b border-primary/10 bg-primary/5">
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
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL) *</label>
            <input value={slug} onChange={e => setSlug(e.target.value)}
              placeholder="sao-lucas"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cor primária</label>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
            <span className="text-xs font-mono text-gray-500">{color}</span>
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
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Criar clínica
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Permissões: config de módulos ─────────────────────────────────────────

const PERMISSION_MODULES: {
  key: keyof MemberPermissions
  label: string
  desc: string
  Icon: React.FC<{ className?: string }>
}[] = [
  { key: 'prontuario', label: 'Prontuário',  desc: 'Ver e editar prontuários clínicos',    Icon: FileText      },
  { key: 'agenda',     label: 'Agenda',      desc: 'Ver e gerenciar consultas da agenda',   Icon: Calendar      },
  { key: 'financeiro', label: 'Financeiro',  desc: 'Ver valores, cobranças e relatórios',   Icon: DollarSign    },
  { key: 'pacientes',  label: 'Pacientes',   desc: 'Acessar e editar cadastro de pacientes', Icon: UserCheck    },
  { key: 'mensagens',  label: 'Mensagens',   desc: 'Enviar mensagens para pacientes',        Icon: MessageSquare },
]

function resolvePerms(m: ClinicMember): MemberPermissions {
  return m.permissions ?? DEFAULT_PERMISSIONS[m.role] ?? DEFAULT_PERMISSIONS.secretaria
}

// ── Card de membro expandível ─────────────────────────────────────────────

function MemberCard({ member, onRefresh, onRemove }: {
  member: ClinicMember
  onRefresh: (m: ClinicMember) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [perms, setPerms]   = useState<MemberPermissions>(resolvePerms(member))
  const [role,  setRoleVal] = useState(member.role)
  const [notes, setNotes]   = useState(member.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const roleLabel = (r: string) => ({ owner: 'Dono', medico: 'Médico', secretaria: 'Secretaria' }[r] ?? r)
  const isOwner   = member.role === 'owner'

  async function handleSave() {
    setSaving(true)
    if (role !== member.role && !isOwner) {
      await updateMemberRole(member.id, role as 'medico' | 'secretaria')
    }
    await updateMemberPermissions(member.id, perms, notes)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onRefresh({ ...member, role: role as any, permissions: perms, notes })
  }

  function applyRoleDefaults(r: string) {
    setRoleVal(r as any)
    if (DEFAULT_PERMISSIONS[r]) setPerms({ ...DEFAULT_PERMISSIONS[r] })
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      open ? 'border-primary/20 bg-primary/[0.02]' : 'border-gray-100 bg-white/60'
    )}>
      {/* ── Linha principal ── */}
      <div className="flex items-center gap-3 px-4 py-3.5">

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: isOwner ? '#2D2B6B' : role === 'medico' ? '#2D2B6B' : '#7A9E7E' }}>
          {(member.profile?.full_name ?? '?')[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {member.profile?.full_name ?? '—'}
          </p>
          <p className="text-xs text-gray-400 truncate">{member.profile?.email ?? '—'}</p>
        </div>

        {/* Role badge */}
        <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium shrink-0',
          isOwner         ? 'bg-amber-100 text-amber-700' :
          role === 'medico' ? 'bg-primary/10 text-primary' :
                              'bg-sage/15 text-sage-dark')}>
          {roleLabel(role)}
        </span>

        {/* Permission chips resumo */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {PERMISSION_MODULES.map(({ key, label }) => (
            <span key={key} className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              perms[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 line-through'
            )}>
              {label}
            </span>
          ))}
        </div>

        {/* Expandir + remover */}
        <div className="flex items-center gap-1 shrink-0">
          {!isOwner && (
            <button onClick={() => onRemove(member.id)}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setOpen(v => !v)}
            className={cn('p-1.5 rounded-lg transition-all',
              open ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}>
            <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* ── Painel expandido ── */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100/80 pt-4">

          {/* Função */}
          {!isOwner && (
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20 shrink-0">Função</p>
              <div className="flex gap-2">
                {(['medico', 'secretaria'] as const).map(r => (
                  <button key={r} onClick={() => applyRoleDefaults(r)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      role === r
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary/30 hover:text-primary'
                    )}>
                    {r === 'medico' ? 'Médico' : 'Secretaria'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 ml-1">
                Mudar função aplica permissões padrão
              </p>
            </div>
          )}

          {/* Permissões */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Permissões de acesso</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PERMISSION_MODULES.map(({ key, label, desc, Icon }) => (
                <button
                  key={key}
                  onClick={() => !isOwner && setPerms(p => ({ ...p, [key]: !p[key] }))}
                  disabled={isOwner}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                    isOwner ? 'cursor-default opacity-70' : 'cursor-pointer',
                    perms[key]
                      ? 'border-green-200 bg-green-50/60 hover:bg-green-50'
                      : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100/60'
                  )}>
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                    perms[key] ? 'bg-green-100' : 'bg-gray-200'
                  )}>
                    <Icon className={cn('w-3.5 h-3.5', perms[key] ? 'text-green-600' : 'text-gray-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm font-medium', perms[key] ? 'text-gray-800' : 'text-gray-400')}>
                        {label}
                      </span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                        perms[key] ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      )}>
                        {perms[key] ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <StickyNote className="w-3 h-3" />
              Observações internas
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Cobre quando Dr. Guilherme está de férias — sem acesso a financeiro..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-gray-700 placeholder-gray-300"
            />
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400">Membro desde {fmtDate(member.created_at)}</p>
            {!isOwner && (
              <button onClick={handleSave} disabled={saving}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                  saved ? 'bg-green-100 text-green-700' :
                  'bg-primary text-white hover:bg-primary-dark disabled:opacity-60'
                )}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : saved  ? <Check className="w-3.5 h-3.5" />
                  : <Check className="w-3.5 h-3.5" />}
                {saved ? 'Salvo!' : 'Salvar perfil'}
              </button>
            )}
          </div>
        </div>
      )}
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
  const [email, setEmail]   = useState('')
  const [role, setRole]     = useState<'medico' | 'secretaria'>('medico')
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

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

      {/* Adicionar membro */}
      <div className="rounded-xl border border-gray-100 p-4 bg-white/60 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Adicionar membro</p>
        <div className="flex gap-2 flex-wrap">
          <input value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="email@exemplo.com"
            className="flex-1 min-w-48 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <select value={role} onChange={e => setRole(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="medico">Médico</option>
            <option value="secretaria">Secretaria</option>
          </select>
          <button onClick={handleAdd} disabled={!email || saving}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              email && !saving ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Adicionar
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Lista de membros */}
      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
      ) : members.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Nenhum membro ainda.</p>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              onRefresh={updated => onRefresh(members.map(x => x.id === updated.id ? updated : x))}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Aba: Configurações guiadas ────────────────────────────────────────────

const SETTINGS_FIELDS = [
  { key: 'nome_exibicao',  label: 'Nome de exibição',   placeholder: 'Ex: Clínica Santa Catharina',  type: 'text'  },
  { key: 'especialidade',  label: 'Especialidade',       placeholder: 'Ex: Nefrologia',               type: 'text'  },
  { key: 'cnpj',           label: 'CNPJ',                placeholder: '00.000.000/0000-00',            type: 'text'  },
  { key: 'telefone',       label: 'Telefone',            placeholder: 'Ex: (48) 99999-0000',          type: 'text'  },
  { key: 'email_contato',  label: 'E-mail de contato',   placeholder: 'contato@clinica.com.br',       type: 'email' },
  { key: 'endereco',       label: 'Endereço',            placeholder: 'Rua, número, cidade, estado',  type: 'text'  },
  { key: 'site',           label: 'Site / Instagram',    placeholder: 'https://... ou @handle',       type: 'text'  },
  { key: 'crm_medico',     label: 'CRM do médico',       placeholder: 'CRM/SC 00000',                 type: 'text'  },
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

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>

  return (
    <div className="space-y-3">
      {SETTINGS_FIELDS.map(field => (
        <div key={field.key} className="rounded-xl border border-gray-100 bg-white/60 px-4 py-3 flex items-center gap-4">
          <div className="w-44 shrink-0">
            <p className="text-sm font-medium text-gray-700">{field.label}</p>
            <p className="text-xs text-gray-400 font-mono">{field.key}</p>
          </div>
          {field.type === 'color' ? (
            <div className="flex items-center gap-3 flex-1">
              <input type="color" value={local[field.key] ?? '#7EB8D4'}
                onChange={e => setLocal(l => ({ ...l, [field.key]: e.target.value }))}
                className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input type="text" value={local[field.key] ?? ''}
                onChange={e => setLocal(l => ({ ...l, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          ) : (
            <input type={field.type} value={local[field.key] ?? ''}
              onChange={e => setLocal(l => ({ ...l, [field.key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave(field.key)}
              placeholder={field.placeholder}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          )}
          <button onClick={() => handleSave(field.key)} disabled={saving === field.key}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0',
              saved === field.key ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary hover:bg-primary/15')}>
            {saving === field.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : saved === field.key ? <Check className="w-3.5 h-3.5" />
              : 'Salvar'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Aba: Convênios ────────────────────────────────────────────────────────

function ConveniosTab({ clinicId, convenios: initial, loading }: {
  clinicId: string
  convenios: ClinicConvenio[]
  loading: boolean
}) {
  const [list, setList]     = useState<ClinicConvenio[]>(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<ClinicConvenio>>({})
  const [showAdd, setShowAdd]   = useState(false)
  const [newData, setNewData]   = useState({ name: '', code: '', default_value: '' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { setList(initial) }, [initial])

  async function handleAdd() {
    if (!newData.name.trim()) return
    setSaving(true); setError('')
    const res = await createConvenio(clinicId, {
      name: newData.name.trim(),
      code: newData.code.trim() || undefined,
      default_value: parseFloat(newData.default_value) || 0,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setList(l => [...l, res.convenio as ClinicConvenio])
    setNewData({ name: '', code: '', default_value: '' })
    setShowAdd(false)
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    await updateConvenio(id, {
      name: editData.name,
      code: editData.code ?? null,
      default_value: Number(editData.default_value) || 0,
    })
    setSaving(false)
    setList(l => l.map(c => c.id === id ? { ...c, ...editData, default_value: Number(editData.default_value) || 0 } : c))
    setEditing(null)
  }

  async function handleToggle(c: ClinicConvenio) {
    await updateConvenio(c.id, { active: !c.active })
    setList(l => l.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover convênio?')) return
    await deleteConvenio(id)
    setList(l => l.filter(c => c.id !== id))
  }

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-100 overflow-hidden bg-white/60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Planos e convênios aceitos</p>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        {showAdd && (
          <div className="px-4 py-3 border-b border-gray-100 bg-primary/5">
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-36">
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
                <input value={newData.name} onChange={e => setNewData(d => ({ ...d, name: e.target.value }))}
                  placeholder="Ex: UNIMED" autoFocus
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
                <input value={newData.code} onChange={e => setNewData(d => ({ ...d, code: e.target.value }))}
                  placeholder="unimed"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor padrão (R$)</label>
                <input type="number" min="0" step="0.01" value={newData.default_value}
                  onChange={e => setNewData(d => ({ ...d, default_value: e.target.value }))}
                  placeholder="0,00"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button onClick={handleAdd} disabled={!newData.name || saving}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    newData.name && !saving ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Salvar
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        )}

        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Nenhum convênio cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Código</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor padrão</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ativo</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(c => editing === c.id ? (
                <tr key={c.id} className="bg-primary/5">
                  <td className="px-4 py-2">
                    <input value={editData.name ?? c.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                      className="w-full text-sm border border-primary/20 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    <input value={editData.code ?? c.code ?? ''} onChange={e => setEditData(d => ({ ...d, code: e.target.value }))}
                      className="w-full text-sm border border-primary/20 rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min="0" step="0.01"
                      value={editData.default_value ?? c.default_value}
                      onChange={e => setEditData(d => ({ ...d, default_value: parseFloat(e.target.value) || 0 }))}
                      className="w-28 text-sm border border-primary/20 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </td>
                  <td />
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setEditing(null)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleSaveEdit(c.id)} disabled={saving}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className={cn('hover:bg-gray-50/60', !c.active && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 hidden md:table-cell">{c.code ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtBRL(c.default_value)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(c)}
                      className={cn('w-8 h-4.5 rounded-full transition-colors relative inline-flex items-center',
                        c.active ? 'bg-green-400' : 'bg-gray-200')}>
                      <span className={cn('inline-block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5',
                        c.active ? 'translate-x-3.5' : 'translate-x-0')} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditing(c.id); setEditData({ name: c.name, code: c.code ?? '', default_value: c.default_value }) }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

// ── Aba: Horários ─────────────────────────────────────────────────────────

function ScheduleTab({ clinicId, schedule: initial, loading }: {
  clinicId: string
  schedule: ClinicScheduleDay[]
  loading: boolean
}) {
  const [days, setDays]     = useState<Omit<ClinicScheduleDay, 'id' | 'clinic_id'>[]>([])
  const [saving, setSaving] = useState<number | null>(null)
  const [saved,  setSaved]  = useState<number | null>(null)

  useEffect(() => {
    const filled = DEFAULT_SCHEDULE.map(d => {
      const found = initial.find(s => s.day_of_week === d.day_of_week)
      return found ? { day_of_week: found.day_of_week, open_time: found.open_time, close_time: found.close_time, active: found.active } : d
    })
    setDays(filled)
  }, [initial])

  function update(index: number, patch: Partial<typeof days[0]>) {
    setDays(d => d.map((x, i) => i === index ? { ...x, ...patch } : x))
  }

  async function handleSave(index: number) {
    const day = days[index]
    setSaving(index)
    await upsertScheduleDay(clinicId, day)
    setSaving(null)
    setSaved(index)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white/60">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <p className="text-sm font-medium text-gray-700">Horário de funcionamento</p>
        <p className="text-xs text-gray-400 mt-0.5">Defina os dias e horários de atendimento da clínica.</p>
      </div>
      <div className="divide-y divide-gray-50">
        {days.map((day, i) => (
          <div key={day.day_of_week}
            className={cn('flex items-center gap-4 px-4 py-3 transition-colors', !day.active && 'opacity-50')}>
            {/* Toggle */}
            <button onClick={() => update(i, { active: !day.active })}
              className={cn('w-8 h-5 rounded-full transition-colors relative inline-flex items-center shrink-0',
                day.active ? 'bg-green-400' : 'bg-gray-200')}>
              <span className={cn('inline-block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5',
                day.active ? 'translate-x-3' : 'translate-x-0')} />
            </button>
            {/* Day name */}
            <span className={cn('w-8 text-sm font-semibold shrink-0', day.active ? 'text-gray-800' : 'text-gray-400')}>
              {DAY_NAMES[day.day_of_week]}
            </span>
            {/* Times */}
            <div className="flex items-center gap-2 flex-1">
              <input type="time" value={day.open_time}
                onChange={e => update(i, { open_time: e.target.value })}
                disabled={!day.active}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40" />
              <span className="text-gray-400 text-xs">até</span>
              <input type="time" value={day.close_time}
                onChange={e => update(i, { close_time: e.target.value })}
                disabled={!day.active}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40" />
            </div>
            {/* Save */}
            <button onClick={() => handleSave(i)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0',
                saved === i ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary hover:bg-primary/15')}>
              {saving === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : saved === i ? <Check className="w-3.5 h-3.5" />
                : 'Salvar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Aba: Tipos de Consulta ────────────────────────────────────────────────

function ConsultationTypesTab({ clinicId, tipos: initial, loading }: {
  clinicId: string
  tipos: ClinicConsultationType[]
  loading: boolean
}) {
  const [list, setList]       = useState<ClinicConsultationType[]>(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<ClinicConsultationType>>({})
  const [showAdd, setShowAdd]   = useState(false)
  const [newData, setNewData]   = useState({ name: '', duration_min: 30, color: '#7A9E7E', default_value: '' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { setList(initial) }, [initial])

  async function handleAdd() {
    if (!newData.name.trim()) return
    setSaving(true); setError('')
    const res = await createConsultationType(clinicId, {
      name: newData.name.trim(),
      duration_min: newData.duration_min,
      color: newData.color,
      default_value: parseFloat(newData.default_value) || 0,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setList(l => [...l, res.tipo as ClinicConsultationType])
    setNewData({ name: '', duration_min: 30, color: '#7EB8D4', default_value: '' })
    setShowAdd(false)
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    await updateConsultationType(id, {
      name: editData.name,
      duration_min: editData.duration_min,
      color: editData.color,
      default_value: Number(editData.default_value) || 0,
    })
    setSaving(false)
    setList(l => l.map(t => t.id === id ? { ...t, ...editData, default_value: Number(editData.default_value) || 0 } : t))
    setEditing(null)
  }

  async function handleToggle(t: ClinicConsultationType) {
    await updateConsultationType(t.id, { active: !t.active })
    setList(l => l.map(x => x.id === t.id ? { ...x, active: !x.active } : x))
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover tipo de consulta?')) return
    await deleteConsultationType(id)
    setList(l => l.filter(t => t.id !== id))
  }

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-100 overflow-hidden bg-white/60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Tipos de consulta</p>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        {showAdd && (
          <div className="px-4 py-3 border-b border-gray-100 bg-primary/5">
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-36">
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
                <input value={newData.name} onChange={e => setNewData(d => ({ ...d, name: e.target.value }))}
                  placeholder="Ex: Telemedicina" autoFocus
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-500 mb-1">Duração</label>
                <select value={newData.duration_min} onChange={e => setNewData(d => ({ ...d, duration_min: parseInt(e.target.value) }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor padrão (R$)</label>
                <input type="number" min="0" step="0.01" value={newData.default_value}
                  onChange={e => setNewData(d => ({ ...d, default_value: e.target.value }))}
                  placeholder="0,00"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cor</label>
                <input type="color" value={newData.color} onChange={e => setNewData(d => ({ ...d, color: e.target.value }))}
                  className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button onClick={handleAdd} disabled={!newData.name || saving}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    newData.name && !saving ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Salvar
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        )}

        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Nenhum tipo de consulta cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duração</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Valor padrão</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ativo</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(t => editing === t.id ? (
                <tr key={t.id} className="bg-primary/5">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={editData.color ?? t.color}
                        onChange={e => setEditData(d => ({ ...d, color: e.target.value }))}
                        className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                      <input value={editData.name ?? t.name}
                        onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                        className="flex-1 text-sm border border-primary/20 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <select value={editData.duration_min ?? t.duration_min}
                      onChange={e => setEditData(d => ({ ...d, duration_min: parseInt(e.target.value) }))}
                      className="text-sm border border-primary/20 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    <input type="number" min="0" step="0.01"
                      value={editData.default_value ?? t.default_value}
                      onChange={e => setEditData(d => ({ ...d, default_value: parseFloat(e.target.value) || 0 }))}
                      className="w-28 text-sm border border-primary/20 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </td>
                  <td />
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setEditing(null)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleSaveEdit(t.id)} disabled={saving}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className={cn('hover:bg-gray-50/60', !t.active && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="font-medium text-gray-800">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.duration_min} min</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{fmtBRL(t.default_value)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(t)}
                      className={cn('w-8 h-4.5 rounded-full transition-colors relative inline-flex items-center',
                        t.active ? 'bg-green-400' : 'bg-gray-200')}>
                      <span className={cn('inline-block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5',
                        t.active ? 'translate-x-3.5' : 'translate-x-0')} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditing(t.id); setEditData({ name: t.name, duration_min: t.duration_min, color: t.color, default_value: t.default_value }) }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

// ── Detalhe da clínica ────────────────────────────────────────────────────

type DetailTab = 'members' | 'settings' | 'convenios' | 'schedule' | 'tipos'

function ClinicDetail({ clinic, onBack }: { clinic: Clinic; onBack: () => void }) {
  const [members,   setMembers]   = useState<ClinicMember[]>([])
  const [settings,  setSettings]  = useState<Record<string, string>>({})
  const [convenios, setConvenios] = useState<ClinicConvenio[]>([])
  const [schedule,  setSchedule]  = useState<ClinicScheduleDay[]>([])
  const [tipos,     setTipos]     = useState<ClinicConsultationType[]>([])
  const [activeTab, setActiveTab] = useState<DetailTab>('members')
  const [loading,   setLoading]   = useState(true)
  const [loadErr,   setLoadErr]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setLoadErr(null)

    const safe = <T,>(p: Promise<T>, fallback: T, label: string) =>
      p.catch(err => {
        const msg = (err as Error)?.message ?? String(err)
        console.error(`[${label}]`, msg)
        setLoadErr(prev => prev ?? `${label}: ${msg}`)
        return fallback
      })

    Promise.all([
      safe(getClinicMembers(clinic.id), [] as ClinicMember[], 'members'),
      safe(getClinicSettings(clinic.id),            {} as Record<string, string>,    'settings'),
      safe(getClinicConvenios(clinic.id),           [],                              'convenios'),
      safe(getClinicSchedule(clinic.id),            [],                              'schedule'),
      safe(getClinicConsultationTypes(clinic.id),   [],                              'tipos'),
    ]).then(([m, s, cv, sc, tp]) => {
      setMembers(m as ClinicMember[])
      setSettings(s as Record<string, string>)
      setConvenios(cv)
      setSchedule(sc)
      setTipos(tp)
    }).finally(() => {
      setLoading(false)
    })
  }, [clinic.id])

  const TABS: { id: DetailTab; label: string; Icon: any }[] = [
    { id: 'members',  label: 'Membros',       Icon: Users        },
    { id: 'settings', label: 'Configurações', Icon: Settings2    },
    { id: 'convenios',label: 'Convênios',     Icon: CreditCard   },
    { id: 'schedule', label: 'Horários',      Icon: Clock        },
    { id: 'tipos',    label: 'Consultas',     Icon: CalendarClock },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
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
        <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium',
          clinic.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
          {clinic.active ? 'Ativa' : 'Inativa'}
        </span>

        {/* Acesso rápido */}
        <div className="flex items-center gap-2 ml-auto">
          <a href="/medico" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors">
            <LayoutDashboard className="w-3.5 h-3.5" />
            CRM
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a href="/paciente" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage/10 text-sage-dark text-xs font-medium hover:bg-sage/20 transition-colors">
            <UserCircle className="w-3.5 h-3.5" />
            Portal
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* Banner de erro de carregamento */}
      {loadErr && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-mono break-all">
          <span className="font-bold shrink-0">ERRO:</span> {loadErr}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'members'  && <MembersTab clinicId={clinic.id} members={members} loading={loading} onRefresh={setMembers} />}
      {activeTab === 'settings' && <SettingsTab clinicId={clinic.id} settings={settings} loading={loading} />}
      {activeTab === 'convenios'&& <ConveniosTab clinicId={clinic.id} convenios={convenios} loading={loading} />}
      {activeTab === 'schedule' && <ScheduleTab clinicId={clinic.id} schedule={schedule} loading={loading} />}
      {activeTab === 'tipos'    && <ConsultationTypesTab clinicId={clinic.id} tipos={tipos} loading={loading} />}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────

export default function AdminDashboard({ initialClinics }: { initialClinics: Clinic[] }) {
  const [clinics, setClinics]         = useState<Clinic[]>(initialClinics)
  const [selectedClinic, setSelected] = useState<Clinic | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  if (selectedClinic) {
    return (
      <div className="rounded-2xl overflow-hidden border border-white/60 p-6"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,252,248,0.82)', boxShadow: '0 2px 24px rgba(45,43,107,0.08)' }}>
        <ClinicDetail clinic={selectedClinic} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Clínicas ativas',   value: clinics.filter(c => c.active).length,                  color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Total de clínicas', value: clinics.length,                                          color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Membros totais',    value: clinics.reduce((a, c) => a + (c.member_count ?? 0), 0), color: 'text-sage',       bg: 'bg-sage/10'   },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/60 p-4"
            style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,252,248,0.82)', boxShadow: '0 2px 12px rgba(45,43,107,0.07)' }}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Clinics list */}
      <div className="rounded-2xl overflow-hidden border border-white/60"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,252,248,0.82)', boxShadow: '0 2px 24px rgba(45,43,107,0.08)' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary/60" />
            <h2 className="font-semibold text-gray-900">Clínicas</h2>
          </div>
          {!showNewForm && (
            <button onClick={() => setShowNewForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">
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
                <th className="px-6 py-3 w-32" />
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
                    <div className="flex items-center gap-2 justify-end">
                      <a href="/medico" target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Acessar CRM">
                        <LayoutDashboard className="w-4 h-4" />
                      </a>
                      <a href="/paciente" target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 text-sage hover:text-sage-dark hover:bg-sage/10 rounded-lg transition-colors"
                        title="Ver portal do paciente">
                        <UserCircle className="w-4 h-4" />
                      </a>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
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
