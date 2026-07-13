'use client'

import { useState, useTransition } from 'react'
import { updateCadastroByToken, acceptLgpdByCadastroToken, type CadastroPatient } from '@/app/actions/cadastro-link'
import { CheckCircle, Pencil, UserRound, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  token:   string
  patient: CadastroPatient
}

const COMO_CONHECEU_OPTIONS = [
  'Indicação de amigo/familiar',
  'Indicação médica',
  'Plano de saúde',
  'Google',
  'Instagram',
  'Outro',
]

function LgpdBlock({ token, onAccepted }: { token: string; onAccepted: () => void }) {
  const [checked1, setChecked1] = useState(false)
  const [checked2, setChecked2] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const [pending, start]        = useTransition()
  const [error, setError]       = useState('')

  function handleAccept() {
    setError('')
    start(async () => {
      const res = await acceptLgpdByCadastroToken(token)
      if (!res.success) { setError(res.error ?? 'Erro'); return }
      onAccepted()
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800">Aceite dos termos de privacidade</p>
      <p className="text-xs text-gray-500">Para continuar, leia e confirme os termos abaixo.</p>

      <button
        type="button"
        onClick={() => setShowFull(v => !v)}
        className="flex items-center gap-1.5 text-xs text-primary font-medium"
      >
        {showFull ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showFull ? 'Ocultar termos' : 'Ver termos completos'}
      </button>

      {showFull && (
        <div className="text-xs text-gray-500 space-y-2 bg-white border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
          <p>Seus dados pessoais e de saúde são coletados e armazenados exclusivamente para fins de atendimento médico, conforme a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>
          <p>As informações fornecidas serão utilizadas apenas pela equipe do consultório, não sendo compartilhadas com terceiros sem o seu consentimento expresso, salvo obrigação legal.</p>
          <p>Você tem direito ao acesso, correção, portabilidade e exclusão de seus dados a qualquer momento, mediante solicitação.</p>
        </div>
      )}

      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={checked1} onChange={e => setChecked1(e.target.checked)} className="mt-0.5 rounded" />
        <span className="text-xs text-gray-700">Autorizo o uso dos meus dados pessoais e de saúde para fins de atendimento médico, conforme a LGPD.</span>
      </label>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={checked2} onChange={e => setChecked2(e.target.checked)} className="mt-0.5 rounded" />
        <span className="text-xs text-gray-700">Li e concordo com a política de privacidade e o tratamento dos meus dados.</span>
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleAccept}
        disabled={!checked1 || !checked2 || pending}
        className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors hover:bg-primary/90"
      >
        {pending ? 'Confirmando...' : 'Confirmar aceite'}
      </button>
    </div>
  )
}

function CadastroForm({
  token,
  initial,
  onSaved,
  isNew,
}: {
  token:   string
  initial: CadastroPatient
  onSaved: (fields: Partial<CadastroPatient>) => void
  isNew:   boolean
}) {
  const [form, setForm] = useState({
    full_name:      initial.full_name      ?? '',
    email:          initial.email          ?? '',
    cpf:            initial.cpf            ?? '',
    phone:          initial.phone          ?? '',
    data_nascimento: initial.data_nascimento ?? '',
    sexo:           initial.sexo           ?? '',
    cep:            initial.cep            ?? '',
    endereco:       initial.endereco       ?? '',
    cidade_estado:  initial.cidade_estado  ?? '',
    nome_mae:       initial.nome_mae       ?? '',
    profissao:      initial.profissao      ?? '',
    cns:            initial.cns            ?? '',
    como_conheceu:  initial.como_conheceu  ?? '',
  })
  const [error,   setError]   = useState('')
  const [pending, start]      = useTransition()

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Nome é obrigatório'); return }
    setError('')
    const fields = {
      full_name:      form.full_name.trim() || null,
      email:          form.email.trim()     || null,
      cpf:            form.cpf.trim()       || null,
      phone:          form.phone.trim()     || null,
      data_nascimento: form.data_nascimento  || null,
      sexo:           (form.sexo as 'M' | 'F') || null,
      cep:            form.cep.trim()       || null,
      endereco:       form.endereco.trim()  || null,
      cidade_estado:  form.cidade_estado.trim() || null,
      nome_mae:       form.nome_mae.trim()  || null,
      profissao:      form.profissao.trim() || null,
      cns:            form.cns.trim()       || null,
      como_conheceu:  form.como_conheceu    || null,
    }
    start(async () => {
      const res = await updateCadastroByToken(token, fields)
      if (!res.success) { setError(res.error ?? 'Erro ao salvar'); return }
      onSaved(fields)
    })
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className={labelCls}>Nome completo *</label>
          <input className={inputCls} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Seu nome completo" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>CPF</label>
            <input className={inputCls} value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className={labelCls}>Data de nascimento</label>
            <input type="date" className={inputCls} value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Sexo</label>
            <select className={inputCls} value={form.sexo} onChange={e => set('sexo', e.target.value)}>
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
          </div>
        </div>
        <div>
          <label className={labelCls}>E-mail</label>
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>CEP</label>
            <input className={inputCls} value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
          </div>
          <div>
            <label className={labelCls}>Cidade / Estado</label>
            <input className={inputCls} value={form.cidade_estado} onChange={e => set('cidade_estado', e.target.value)} placeholder="São Paulo / SP" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Endereço</label>
          <input className={inputCls} value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, complemento" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nome da mãe</label>
            <input className={inputCls} value={form.nome_mae} onChange={e => set('nome_mae', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Profissão</label>
            <input className={inputCls} value={form.profissao} onChange={e => set('profissao', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>CNS (Cartão Nacional de Saúde)</label>
          <input className={inputCls} value={form.cns} onChange={e => set('cns', e.target.value)} placeholder="000 0000 0000 0000" />
        </div>
        {isNew && (
          <div>
            <label className={labelCls}>Como conheceu o consultório?</label>
            <select className={inputCls} value={form.como_conheceu} onChange={e => set('como_conheceu', e.target.value)}>
              <option value="">Selecione</option>
              {COMO_CONHECEU_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors hover:bg-primary/90"
      >
        {pending ? 'Salvando...' : isNew ? 'Salvar cadastro' : 'Salvar alterações'}
      </button>
    </form>
  )
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 font-medium">{value}</span>
    </div>
  )
}

export default function CadastroClient({ token, patient: initialPatient }: Props) {
  const [patient, setPatient]   = useState(initialPatient)
  const [editing, setEditing]   = useState(false)
  const [lgpdDone, setLgpdDone] = useState(patient.lgpd_accepted)
  const [formSaved, setFormSaved] = useState(false)

  const isNew = !patient.perfil_completo && !patient.full_name

  function handleFormSaved(fields: Partial<CadastroPatient>) {
    setPatient(prev => ({ ...prev, ...fields, perfil_completo: true }))
    setEditing(false)
    setFormSaved(true)
  }

  const fmtDate = (d: string | null) => {
    if (!d) return null
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  // ── Tela de sucesso final ─────────────────────────────────────
  if ((formSaved || patient.perfil_completo) && lgpdDone && !editing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header name={patient.full_name} />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-base font-semibold text-gray-900">Tudo certo!</p>
          <p className="text-sm text-gray-500 max-w-xs">Seus dados estão salvos e os termos de privacidade foram aceitos. Até a consulta!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header name={patient.full_name} />

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-5">
        {/* Título */}
        <div>
          <h1 className="text-base font-semibold text-gray-900">
            {isNew ? 'Preencha seu cadastro' : 'Seus dados'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isNew
              ? 'Preencha as informações abaixo para agilizar seu atendimento.'
              : 'Confira se os dados estão corretos. Edite se necessário.'}
          </p>
        </div>

        {/* Form (novo paciente) ou Summary (existente) */}
        {isNew || editing ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
              >
                ← Voltar
              </button>
            )}
            <CadastroForm
              token={token}
              initial={patient}
              onSaved={handleFormSaved}
              isNew={isNew}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <UserRound className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-800">{patient.full_name ?? '—'}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                <Pencil className="w-3 h-3" /> Editar
              </button>
            </div>
            <DataRow label="CPF"          value={patient.cpf} />
            <DataRow label="Nascimento"   value={fmtDate(patient.data_nascimento)} />
            <DataRow label="Sexo"         value={patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : null} />
            <DataRow label="Telefone"     value={patient.phone} />
            <DataRow label="E-mail"       value={patient.email} />
            <DataRow label="Endereço"     value={patient.endereco} />
            <DataRow label="Cidade/UF"    value={patient.cidade_estado} />
            <DataRow label="Profissão"    value={patient.profissao} />
            <DataRow label="Nome da mãe"  value={patient.nome_mae} />
            <DataRow label="CNS"          value={patient.cns} />
          </div>
        )}

        {/* LGPD (só se não aceito e não em modo edição) */}
        {!lgpdDone && !editing && (
          <LgpdBlock token={token} onAccepted={() => setLgpdDone(true)} />
        )}

        {/* LGPD já aceito — badge */}
        {lgpdDone && !isNew && !editing && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Termos de privacidade já aceitos
          </div>
        )}
      </div>
    </div>
  )
}

function Header({ name }: { name: string | null }) {
  return (
    <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 flex-shrink-0">
      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
        <UserRound className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-gray-500">Consultório Dr. Guilherme</p>
        <p className="font-semibold text-gray-900 text-sm">{name ?? 'Cadastro'}</p>
      </div>
    </header>
  )
}
