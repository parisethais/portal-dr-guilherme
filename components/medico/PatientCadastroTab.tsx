'use client'

import { useState, useTransition, useCallback } from 'react'
import { updatePatientFull, resetPatientPassword } from '@/app/actions/profile'
import { deletePatient } from '@/app/actions/patients'
import type { Profile, StatusPaciente } from '@/lib/types'
import { Save, Loader2, CheckCircle, KeyRound, Copy, Check, Trash2, AlertTriangle } from 'lucide-react'

async function fetchViaCep(cep: string): Promise<{ logradouro?: string; bairro?: string; localidade?: string; uf?: string } | null> {
  const raw = cep.replace(/\D/g, '')
  if (raw.length !== 8) return null
  try {
    const r = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
    const data = await r.json()
    if (data.erro) return null
    return data
  } catch { return null }
}

// ── Helpers de layout ────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, hint, type = 'text', readOnly,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  hint?: string
  type?: string
  readOnly?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
          readOnly
            ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-default'
            : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
        }`}
      />
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

function SelectField({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
      >
        {children}
      </select>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────
interface Props {
  patient:      Profile
  currentRole?: string
  onDeleted?:   () => void
}

const INDICACAO_OPCOES = [
  { value: '',          label: 'Selecione...' },
  { value: 'medico',    label: 'Indicação médica' },
  { value: 'paciente',  label: 'Indicação de paciente da clínica' },
  { value: 'convenio',  label: 'Convênio / plano de saúde' },
  { value: 'google',    label: 'Google / internet' },
  { value: 'instagram', label: 'Redes sociais (Instagram/Facebook)' },
  { value: 'amigo',     label: 'Familiar ou amigo' },
  { value: 'outro',     label: 'Outro...' },
]

const INDICACAO_LABELS: Record<string, string> = {
  medico:    'Indicação médica',
  paciente:  'Indicação de paciente da clínica',
  convenio:  'Convênio / plano de saúde',
  google:    'Google / internet',
  instagram: 'Redes sociais (Instagram/Facebook)',
  amigo:     'Familiar ou amigo',
  outro:     'Outro',
}

function parseComoConheceu(raw: string): { select: string; detail: string } {
  if (!raw) return { select: '', detail: '' }
  const directKeys = Object.keys(INDICACAO_LABELS)
  if (directKeys.includes(raw)) return { select: raw, detail: '' }
  // Try to match label prefix
  for (const [key, label] of Object.entries(INDICACAO_LABELS)) {
    if (raw.startsWith(label)) {
      const detail = raw.slice(label.length).replace(/^[\s:—–-]+/, '').trim()
      return { select: key, detail }
    }
  }
  return { select: 'outro', detail: raw }
}

function buildComoConheceu(select: string, detail: string): string {
  if (!select) return ''
  const label = INDICACAO_LABELS[select] ?? select
  if (detail && (select === 'medico' || select === 'outro')) return `${label}: ${detail}`
  return label
}

export default function PatientCadastroTab({ patient, currentRole, onDeleted }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setSaveError]        = useState('')
  const [saved, setSaved]            = useState(false)
  const [cepLoading, setCepLoading]  = useState(false)

  // Deletar
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError]             = useState('')
  const [isDeleting, startDeleteTransition]       = useTransition()

  // Senha
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copiedPwd, setCopiedPwd]     = useState(false)
  const [isPwdPending, startPwdTransition] = useTransition()

  const parsedIndicacao = parseComoConheceu(patient.como_conheceu ?? '')

  const [form, setForm] = useState({
    full_name:            patient.full_name       ?? '',
    email:                patient.email           ?? '',
    cpf:                  patient.cpf             ?? '',
    phone:                patient.phone           ?? '',
    data_nascimento:      patient.data_nascimento ?? '',
    sexo:                 patient.sexo            ?? '',
    nome_mae:             patient.nome_mae        ?? '',
    profissao:            patient.profissao       ?? '',
    cns:                  patient.cns             ?? '',
    como_conheceu_select: parsedIndicacao.select,
    como_conheceu_detail: parsedIndicacao.detail,
    cep:                  patient.cep             ?? '',
    endereco:             patient.endereco        ?? '',
    cidade_estado:        patient.cidade_estado   ?? '',
    diagnostico:          patient.diagnostico     ?? '',
    status_paciente:      patient.status_paciente ?? 'ativo',
    obs_secretaria:       patient.obs_secretaria  ?? '',
    obs_pessoal:          patient.obs_pessoal     ?? '',
  })

  const set = (k: keyof typeof form) => (v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleCepChange = useCallback(async (cep: string) => {
    set('cep')(cep)
    const raw = cep.replace(/\D/g, '')
    if (raw.length !== 8) return
    setCepLoading(true)
    const data = await fetchViaCep(raw)
    setCepLoading(false)
    if (!data) return
    const endereco = [data.logradouro, data.bairro].filter(Boolean).join(', ')
    const cidade   = [data.localidade, data.uf].filter(Boolean).join(' - ')
    setForm(f => ({
      ...f,
      ...(endereco ? { endereco } : {}),
      ...(cidade   ? { cidade_estado: cidade } : {}),
    }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    setSaveError('')
    startTransition(async () => {
      const res = await updatePatientFull(patient.id, {
        full_name:       form.full_name       || undefined,
        email:           form.email           || undefined,
        cpf:             form.cpf             || undefined,
        phone:           form.phone           || undefined,
        data_nascimento: form.data_nascimento || null,
        sexo:            (form.sexo as 'M' | 'F') || null,
        nome_mae:        form.nome_mae        || undefined,
        profissao:       form.profissao       || undefined,
        cns:             form.cns             || null,
        como_conheceu:   buildComoConheceu(form.como_conheceu_select, form.como_conheceu_detail) || undefined,
        cep:             form.cep             || undefined,
        endereco:        form.endereco        || undefined,
        cidade_estado:   form.cidade_estado   || undefined,
        diagnostico:     form.diagnostico     || null,
        status_paciente: form.status_paciente as StatusPaciente,
        obs_secretaria:  form.obs_secretaria  || null,
        obs_pessoal:     form.obs_pessoal     || null,
        perfil_completo: true,
      })
      if (!res.success) { setSaveError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  function handleResetPassword() {
    if (!confirm(`Gerar nova senha para ${patient.full_name}?`)) return
    startPwdTransition(async () => {
      const res = await resetPatientPassword(patient.id)
      if (res.success && res.data) setNewPassword(res.data.password)
    })
  }

  function handleDelete() {
    setDeleteError('')
    startDeleteTransition(async () => {
      const res = await deletePatient(patient.id)
      if (!res.success) { setDeleteError(res.error); return }
      onDeleted?.()
    })
  }

  function handleCopyPassword() {
    if (!newPassword || !patient.email) return
    const texto = `Portal Dr. Guilherme\n\nOlá! Sua senha foi redefinida.\n\nE-mail: ${patient.email}\nNova senha: ${newPassword}\n\nAcesse: https://app.meden.health`
    navigator.clipboard.writeText(texto)
    setCopiedPwd(true)
    setTimeout(() => setCopiedPwd(false), 2000)
  }

  return (
    <div className="space-y-7">

      {/* ── Identificação ── */}
      <Section title="Identificação">
        <Row>
          <Field label="Nome completo"       value={form.full_name}       onChange={set('full_name')}       placeholder="Nome completo" />
          <Field label="E-mail"              value={form.email}            onChange={set('email')}           placeholder="paciente@email.com" />
        </Row>
        <Row>
          <Field label="CPF"                 value={form.cpf}              onChange={set('cpf')}             placeholder="Somente números" />
          <Field label="Telefone / WhatsApp" value={form.phone}            onChange={set('phone')}           placeholder="11 99999-9999" />
        </Row>
        <Row>
          <Field label="Data de nascimento"  value={form.data_nascimento}  onChange={set('data_nascimento')} type="date" />
          <SelectField label="Sexo" value={form.sexo} onChange={set('sexo')}>
            <option value="">—</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </SelectField>
        </Row>
        <Row>
          <Field label="Nome da mãe"         value={form.nome_mae}         onChange={set('nome_mae')}        placeholder="Nome completo da mãe" />
          <Field label="Profissão"           value={form.profissao}        onChange={set('profissao')}       placeholder="Ex: Professora" />
        </Row>
        <Field label="CNS — Cartão Nacional de Saúde (opcional)" value={form.cns} onChange={set('cns')} placeholder="000 0000 0000 0000" />
      </Section>

      {/* ── Endereço ── */}
      <Section title="Endereço">
        <Row>
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">CEP</label>
            <div className="relative">
              <input
                type="text"
                value={form.cep}
                onChange={e => handleCepChange(e.target.value)}
                placeholder="01310-100"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors bg-white text-gray-900 hover:border-gray-300"
              />
              {cepLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-primary" />
              )}
            </div>
          </div>
          <Field label="Cidade e Estado" value={form.cidade_estado} onChange={set('cidade_estado')} placeholder="São Paulo - SP" />
        </Row>
        <Field label="Endereço (rua, número, complemento)" value={form.endereco} onChange={set('endereco')} placeholder="Rua das Flores, 123, Apto 45" />
      </Section>

      {/* ── Como conheceu ── */}
      <Section title="Indicação — como conheceu o Dr. Guilherme">
        <div className="space-y-3">
          <select
            value={form.como_conheceu_select}
            onChange={e => set('como_conheceu_select')(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
          >
            {INDICACAO_OPCOES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {form.como_conheceu_select === 'medico' && (
            <input
              type="text"
              value={form.como_conheceu_detail}
              onChange={e => set('como_conheceu_detail')(e.target.value)}
              placeholder="Nome do médico que indicou (opcional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
            />
          )}
          {form.como_conheceu_select === 'outro' && (
            <input
              type="text"
              value={form.como_conheceu_detail}
              onChange={e => set('como_conheceu_detail')(e.target.value)}
              placeholder="Especifique..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
            />
          )}
        </div>
      </Section>

      {/* ── Acompanhamento ── */}
      <Section title="Acompanhamento (secretaria / médico)">
        <SelectField label="Status do paciente" value={form.status_paciente} onChange={set('status_paciente')}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="dialise">Diálise</option>
          <option value="alta">Alta</option>
          <option value="obito">Óbito</option>
        </SelectField>
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            Observações internas
          </label>
          <textarea
            value={form.obs_secretaria}
            onChange={e => set('obs_secretaria')(e.target.value)}
            rows={2}
            placeholder="Anotações da secretaria..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none text-gray-900"
          />
        </div>
        {currentRole !== 'secretaria' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Obs. pessoal do médico
            </label>
            <textarea
              value={form.obs_pessoal}
              onChange={e => set('obs_pessoal')(e.target.value)}
              placeholder="Notas pessoais do médico sobre o paciente..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary resize-none leading-relaxed"
            />
          </div>
        )}
      </Section>

      {/* ── Erro + Salvar ── */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle className="w-4 h-4" />
            Cadastro atualizado!
          </div>
        )}
        {!saved && <span />}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-60 transition-colors"
        >
          {isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            : <><Save className="w-4 h-4" /> Salvar alterações</>
          }
        </button>
      </div>

      {/* ── Acesso / Senha ── */}
      <div className="border-t border-gray-100 pt-6 space-y-3">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Acesso ao portal</h3>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Redefinir senha</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Gera uma senha temporária para o paciente acessar o portal.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={isPwdPending}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {isPwdPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <KeyRound className="w-4 h-4" />}
            Gerar nova senha
          </button>
        </div>

        {newPassword && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-700 font-medium">Nova senha gerada</p>
              <p className="text-sm font-bold text-amber-900 tracking-widest mt-0.5">{newPassword}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors flex-shrink-0"
            >
              {copiedPwd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPwd ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* ── Zona de perigo — apenas médico ── */}
      {currentRole === 'medico' && <div className="border-t border-red-100 pt-6 space-y-3">
        <h3 className="text-[11px] font-bold text-red-400 uppercase tracking-widest">Zona de perigo</h3>

        {!showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Deletar paciente</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Remove permanentemente o paciente, consultas, prontuário, exames e todos os dados vinculados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Deletar paciente
            </button>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Confirmar exclusão de {patient.full_name}?</p>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  Todos os dados serão removidos permanentemente — consultas, prontuário, exames, faturas e acesso ao portal.
                  <strong className="block mt-1">Esta ação não pode ser desfeita.</strong>
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="text-xs text-red-700 bg-white border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }}
                disabled={isDeleting}
                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deletando...</>
                  : <><Trash2 className="w-3.5 h-3.5" /> Sim, deletar</>
                }
              </button>
            </div>
          </div>
        )}
      </div>}

    </div>
  )
}
