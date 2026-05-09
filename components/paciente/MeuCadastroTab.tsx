'use client'

import { useState, useTransition } from 'react'
import type { Profile } from '@/lib/types'
import { updatePatientOwnProfile } from '@/app/actions/profile'
import { User, Phone, MapPin, Heart, FileText, Pencil, X, Save, CheckCircle, Loader2 } from 'lucide-react'

// ── Read-only helpers ─────────────────────────────────────────
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value || <span className="text-gray-300 italic">Não informado</span>}</span>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="px-4 divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function calcIdade(dataNasc: string | null | undefined): string {
  if (!dataNasc) return ''
  const anos = Math.floor((Date.now() - new Date(dataNasc + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  return ` (${anos} anos)`
}

// ── Edit field ────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1 py-2.5 border-b border-gray-50 last:border-0">
      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
      />
    </div>
  )
}

interface Props {
  profile: Profile
}

export default function MeuCadastroTab({ profile }: Props) {
  const [editing, setEditing]       = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')
  const [isPending, startTransition] = useTransition()

  // Campos editáveis
  const [phone, setPhone]             = useState(profile.phone ?? '')
  const [cep, setCep]                 = useState(profile.cep ?? '')
  const [endereco, setEndereco]       = useState(profile.endereco ?? '')
  const [cidadeEstado, setCidadeEstado] = useState(profile.cidade_estado ?? '')
  const [nomeMae, setNomeMae]         = useState(profile.nome_mae ?? '')
  const [profissao, setProfissao]     = useState(profile.profissao ?? '')
  const [cns, setCns]                 = useState(profile.cns ?? '')
  const [comoConheceu, setComoConheceu] = useState(profile.como_conheceu ?? '')

  function handleCancel() {
    setPhone(profile.phone ?? '')
    setCep(profile.cep ?? '')
    setEndereco(profile.endereco ?? '')
    setCidadeEstado(profile.cidade_estado ?? '')
    setNomeMae(profile.nome_mae ?? '')
    setProfissao(profile.profissao ?? '')
    setCns(profile.cns ?? '')
    setComoConheceu(profile.como_conheceu ?? '')
    setEditing(false)
    setError('')
  }

  function handleSave() {
    setError('')
    startTransition(async () => {
      const res = await updatePatientOwnProfile({
        phone:         phone.trim() || null,
        cep:           cep.trim() || null,
        endereco:      endereco.trim() || null,
        cidade_estado: cidadeEstado.trim() || null,
        nome_mae:      nomeMae.trim() || null,
        profissao:     profissao.trim() || null,
        cns:           cns.trim() || null,
        como_conheceu: comoConheceu.trim() || null,
      })
      if (!res.success) { setError(res.error); return }
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-4">

      {/* Header com botão editar / salvar */}
      <div className="flex items-center justify-between">
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle className="w-4 h-4" />
            Cadastro atualizado!
          </div>
        )}
        {!saved && <span />}

        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                : <><Save className="w-3.5 h-3.5" /> Salvar</>}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary border border-primary/30 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar cadastro
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Identificação — sempre read-only */}
      <Section icon={<User className="w-4 h-4" />} title="Identificação">
        <Row label="Nome completo"      value={profile.full_name} />
        <Row label="E-mail"             value={profile.email} />
        <Row label="CPF"                value={profile.cpf} />
        <Row label="Data de nascimento" value={
          profile.data_nascimento
            ? `${formatDate(profile.data_nascimento)}${calcIdade(profile.data_nascimento)}`
            : null}
        />
        <Row label="Sexo" value={
          profile.sexo === 'F' ? 'Feminino' : profile.sexo === 'M' ? 'Masculino' : null
        } />
      </Section>

      {/* Contato — editável */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <span className="text-primary"><Phone className="w-4 h-4" /></span>
          <h3 className="text-sm font-semibold text-gray-700">Contato</h3>
          {editing && <span className="ml-auto text-[10px] text-primary bg-blue-50 border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">editável</span>}
        </div>
        <div className="px-4">
          {editing ? (
            <>
              <Field label="Telefone / WhatsApp" value={phone} onChange={setPhone} type="tel" placeholder="(11) 99999-9999" />
              <Field label="Como conheceu o Dr. Guilherme" value={comoConheceu} onChange={setComoConheceu} />
            </>
          ) : (
            <>
              <Row label="Telefone / WhatsApp" value={profile.phone} />
              <Row label="Como conheceu o Dr." value={profile.como_conheceu} />
            </>
          )}
        </div>
      </div>

      {/* Endereço — editável */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <span className="text-primary"><MapPin className="w-4 h-4" /></span>
          <h3 className="text-sm font-semibold text-gray-700">Endereço</h3>
          {editing && <span className="ml-auto text-[10px] text-primary bg-blue-50 border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">editável</span>}
        </div>
        <div className="px-4">
          {editing ? (
            <>
              <Field label="CEP"           value={cep}          onChange={setCep}          placeholder="00000-000" />
              <Field label="Endereço"      value={endereco}     onChange={setEndereco}     placeholder="Rua, número, complemento" />
              <Field label="Cidade e Estado" value={cidadeEstado} onChange={setCidadeEstado} placeholder="São Paulo, SP" />
            </>
          ) : (
            <>
              <Row label="CEP"            value={profile.cep} />
              <Row label="Endereço"       value={profile.endereco} />
              <Row label="Cidade e Estado" value={profile.cidade_estado} />
            </>
          )}
        </div>
      </div>

      {/* Dados pessoais — editável */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <span className="text-primary"><User className="w-4 h-4" /></span>
          <h3 className="text-sm font-semibold text-gray-700">Dados pessoais</h3>
          {editing && <span className="ml-auto text-[10px] text-primary bg-blue-50 border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">editável</span>}
        </div>
        <div className="px-4">
          {editing ? (
            <>
              <Field label="Nome da mãe" value={nomeMae}    onChange={setNomeMae}    placeholder="Nome completo da mãe" />
              <Field label="Profissão"   value={profissao}  onChange={setProfissao}  placeholder="Ex: Professora" />
              <Field label="CNS"         value={cns}        onChange={setCns}        placeholder="Cartão Nacional de Saúde" />
            </>
          ) : (
            <>
              <Row label="Nome da mãe" value={profile.nome_mae} />
              <Row label="Profissão"   value={profile.profissao} />
              <Row label="CNS"         value={profile.cns} />
            </>
          )}
        </div>
      </div>

      {/* Acompanhamento médico — sempre read-only */}
      {(profile.clinica || profile.diagnostico) && (
        <Section icon={<Heart className="w-4 h-4" />} title="Acompanhamento médico">
          <Row label="Clínica"     value={profile.clinica} />
          <Row label="Diagnóstico" value={profile.diagnostico} />
        </Section>
      )}

      {/* Cadastro — sempre read-only */}
      <Section icon={<FileText className="w-4 h-4" />} title="Cadastro">
        <Row label="Status" value={
          profile.status_paciente === 'ativo'   ? 'Ativo' :
          profile.status_paciente === 'inativo' ? 'Inativo' : 'Óbito'
        } />
        <Row label="Cadastro completo" value={profile.perfil_completo ? 'Sim' : 'Pendente'} />
        <Row label="LGPD aceita em"    value={
          profile.lgpd_accepted_at
            ? new Date(profile.lgpd_accepted_at).toLocaleDateString('pt-BR')
            : null
        } />
      </Section>

    </div>
  )
}
