'use client'

import { useState, useTransition } from 'react'
import { updatePatientFull } from '@/app/actions/profile'
import type { Profile, StatusPaciente } from '@/lib/types'
import { Save, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'

// ── Helpers de layout ────────────────────────────────────────
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

function Field({
  label, value, onChange, placeholder, hint, type = 'text', readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void
  placeholder?: string; hint?: string; type?: string; readOnly?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors
          ${readOnly ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-default' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'}`}
      />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
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
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">{title}</h3>
      {children}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────
interface Props {
  patient: Profile
  onClose: () => void
}

export default function PatientEditModal({ patient, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState('')
  const [saved, setSaved]            = useState(false)

  const [form, setForm] = useState({
    full_name:       patient.full_name        ?? '',
    email:           patient.email            ?? '',
    cpf:             patient.cpf              ?? '',
    phone:           patient.phone            ?? '',
    data_nascimento: patient.data_nascimento  ?? '',
    sexo:            patient.sexo             ?? '',
    nome_mae:        patient.nome_mae         ?? '',
    profissao:       patient.profissao        ?? '',
    cns:             patient.cns              ?? '',
    como_conheceu:   patient.como_conheceu    ?? '',
    cep:             patient.cep              ?? '',
    endereco:        patient.endereco         ?? '',
    cidade_estado:   patient.cidade_estado    ?? '',
    status_paciente: patient.status_paciente  ?? 'ativo',
    obs_secretaria:  patient.obs_secretaria   ?? '',
  })

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    setError('')
    startTransition(async () => {
      const res = await updatePatientFull(patient.id, {
        full_name:       form.full_name       || undefined,
        cpf:             form.cpf             || undefined,
        phone:           form.phone           || undefined,
        data_nascimento: form.data_nascimento || null,
        sexo:            (form.sexo as 'M' | 'F') || null,
        nome_mae:        form.nome_mae        || undefined,
        profissao:       form.profissao       || undefined,
        cns:             form.cns             || null,
        como_conheceu:   form.como_conheceu   || undefined,
        cep:             form.cep             || undefined,
        endereco:        form.endereco        || undefined,
        cidade_estado:   form.cidade_estado   || undefined,
        status_paciente: form.status_paciente as StatusPaciente,
        obs_secretaria:  form.obs_secretaria  || null,
        perfil_completo: true,
      })
      if (!res.success) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    })
  }

  return (
    <Modal open onClose={onClose} className="max-w-2xl" title={patient.full_name ?? 'Editar paciente'}>
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">

        <Section title="Identificação">
          <Row>
            <Field label="Nome completo"       value={form.full_name}       onChange={set('full_name')}       placeholder="Nome completo" />
            <Field label="E-mail"              value={form.email}           readOnly hint="Alterar e-mail requer suporte" />
          </Row>
          <Row>
            <Field label="CPF"                 value={form.cpf}             onChange={set('cpf')}             placeholder="Somente números" />
            <Field label="Telefone / WhatsApp" value={form.phone}           onChange={set('phone')}           placeholder="11999999999" />
          </Row>
          <Row>
            <Field label="Data de nascimento"  value={form.data_nascimento} onChange={set('data_nascimento')} type="date" />
            <SelectField label="Sexo" value={form.sexo} onChange={set('sexo')}>
              <option value="">—</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </SelectField>
          </Row>
          <Row>
            <Field label="Nome da mãe" value={form.nome_mae}  onChange={set('nome_mae')}  placeholder="Nome completo da mãe" />
            <Field label="Profissão"   value={form.profissao} onChange={set('profissao')} placeholder="Ex: Professora" />
          </Row>
          <Field label="CNS — Cartão Nacional de Saúde (opcional)" value={form.cns} onChange={set('cns')} placeholder="000 0000 0000 0000" />
        </Section>

        <Section title="Contato e endereço">
          <Row>
            <Field label="CEP"             value={form.cep}           onChange={set('cep')}           placeholder="01310100" />
            <Field label="Cidade e Estado" value={form.cidade_estado} onChange={set('cidade_estado')} placeholder="São Paulo, SP" />
          </Row>
          <Field label="Endereço completo" value={form.endereco} onChange={set('endereco')} placeholder="Rua das Flores, 123, Apto 45" />
        </Section>

        <Section title="Como conheceu o Dr. Guilherme">
          <textarea
            value={form.como_conheceu}
            onChange={e => set('como_conheceu')(e.target.value)}
            rows={2}
            placeholder="Ex: Indicação, Google, amigo..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none text-gray-900"
          />
        </Section>

        <Section title="Situação">
          <Row>
            <SelectField label="Status do paciente" value={form.status_paciente} onChange={set('status_paciente')}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="obito">Óbito</option>
            </SelectField>
            <div />
          </Row>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Observações internas</label>
            <textarea
              value={form.obs_secretaria}
              onChange={e => set('obs_secretaria')(e.target.value)}
              rows={2}
              placeholder="Anotações da secretaria..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none text-gray-900"
            />
          </div>
        </Section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || saved}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-60"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : saved ? (
            <><Save className="w-4 h-4" /> Salvo!</>
          ) : (
            <><Save className="w-4 h-4" /> Salvar tudo</>
          )}
        </button>
      </div>
    </Modal>
  )
}
