'use client'

import { useState, useTransition, useRef } from 'react'
import { submitCadastro } from '@/app/actions/cadastro'
import { CheckCircle2, Copy, Check, Mail, ShieldCheck, AlertTriangle, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal-dr-guilherme.vercel.app'

// ── Input otimizado pra mobile ──────────────────────────────────
function Field({
  label, name, type = 'text', placeholder, required, maxLength,
  inputMode, autoComplete, autoCapitalize, hint,
}: {
  label: string; name: string; type?: string; placeholder?: string
  required?: boolean; maxLength?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string; autoCapitalize?: string; hint?: string
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[15px] font-semibold text-gray-800">
        {label}{required && <span className="text-primary ml-1">*</span>}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-[16px] text-gray-900
                   placeholder-gray-400 focus:outline-none focus:border-primary transition-colors
                   bg-gray-50 focus:bg-white"
      />
      {hint && <p className="text-xs text-gray-400 pl-1">{hint}</p>}
    </div>
  )
}

// ── Select genérico ─────────────────────────────────────────────
function SelectField({ label, name, required, children }: {
  label: string; name: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[15px] font-semibold text-gray-800">
        {label}{required && <span className="text-primary ml-1">*</span>}
      </label>
      <select
        name={name}
        required={required}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-[16px] text-gray-900
                   focus:outline-none focus:border-primary transition-colors bg-gray-50 focus:bg-white appearance-none"
      >
        {children}
      </select>
    </div>
  )
}

// ── DatePicker com 3 selects (dia / mês / ano) ──────────────────
const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function DatePicker({ required }: { required?: boolean }) {
  const [dia, setDia]   = useState('')
  const [mes, setMes]   = useState('')
  const [ano, setAno]   = useState('')

  // Formata como YYYY-MM-DD para o campo hidden
  const valor = dia && mes && ano
    ? `${ano}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}`
    : ''

  const currentYear = new Date().getFullYear()
  const anos = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i)
  const dias = Array.from({ length: 31 }, (_, i) => i + 1)

  const selectClass = `flex-1 px-3 py-3.5 border-2 border-gray-200 rounded-2xl text-[16px] text-gray-900
    focus:outline-none focus:border-primary transition-colors bg-gray-50 focus:bg-white appearance-none
    text-center`

  return (
    <div className="space-y-2">
      <label className="block text-[15px] font-semibold text-gray-800">
        Data de nascimento{required && <span className="text-primary ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        {/* Dia */}
        <select
          value={dia}
          onChange={e => setDia(e.target.value)}
          className={selectClass}
          aria-label="Dia"
        >
          <option value="">Dia</option>
          {dias.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Mês */}
        <select
          value={mes}
          onChange={e => setMes(e.target.value)}
          className={`${selectClass} flex-[2]`}
          aria-label="Mês"
        >
          <option value="">Mês</option>
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        {/* Ano */}
        <select
          value={ano}
          onChange={e => setAno(e.target.value)}
          className={selectClass}
          aria-label="Ano"
        >
          <option value="">Ano</option>
          {anos.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Campo hidden que vai no FormData */}
      <input
        type="hidden"
        name="data_nascimento"
        value={valor}
        required={required}
      />
    </div>
  )
}

// ── Steps config ────────────────────────────────────────────────
const STEPS = [
  { title: 'Quem é você?',        emoji: '👤' },
  { title: 'Como te encontrar?',  emoji: '📍' },
  { title: 'Últimas informações', emoji: '✅' },
]

export default function CadastroForm() {
  const [step, setStep]              = useState(0)
  const [error, setError]            = useState('')
  const [isPending, startTransition] = useTransition()
  const [aceitouTermos, setTermos]   = useState(false)
  const [aceitouComms, setComms]     = useState(false)
  const [result, setResult]          = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied]           = useState(false)
  const [copiedAll, setCopiedAll]     = useState(false)
  const [termoAberto, setTermoAberto]       = useState(false)
  const [comoConheceu, setComoConheceu]     = useState('')
  const [indicadoPor, setIndicadoPor]       = useState('')
  const [outroTexto, setOutroTexto]         = useState('')
  const formRef                       = useRef<HTMLFormElement>(null)

  function copyText(text: string, onSuccess: () => void) {
    // Tenta clipboard API moderna; fallback para execCommand (Safari desktop)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess))
    } else {
      fallbackCopy(text, onSuccess)
    }
  }

  function fallbackCopy(text: string, onSuccess: () => void) {
    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    try { document.execCommand('copy'); onSuccess() } catch {}
    document.body.removeChild(el)
  }

  function handleCopy() {
    if (!result) return
    copyText(result.password, () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleCopyAll() {
    if (!result) return
    const texto = `Portal Dr. Guilherme\n\nSeu acesso foi criado! 🎉\n\nE-mail: ${result.email}\nSenha: ${result.password}\n\nAcesse em: ${APP_URL}`
    copyText(texto, () => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 3000)
    })
  }

  function goNext() {
    if (!formRef.current) return

    // Valida campos visíveis da etapa atual
    const section = formRef.current.querySelector<HTMLElement>(`[data-step="${step}"]`)
    if (!section) { setStep(s => s + 1); return }

    const fields = section.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      'input[required], select[required]'
    )
    for (const f of fields) {
      // Ignora o hidden do DatePicker se ainda não tiver valor completo
      if (f.type === 'hidden' && !f.value) {
        setError('Preencha a data de nascimento completa.')
        return
      }
      if (f.type !== 'hidden' && !f.value.trim()) {
        f.focus()
        setError('Preencha todos os campos obrigatórios.')
        return
      }
    }
    setError('')
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!comoConheceu) {
      setError('Selecione como conheceu o Dr. Guilherme.')
      return
    }
    if (!aceitouTermos || !aceitouComms) {
      setError('Aceite os dois termos para continuar.')
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('aceita_termos', 'true')
    fd.set('aceita_comms', 'true')
    startTransition(async () => {
      const res = await submitCadastro(fd)
      if (!res.success) { setError(res.error); return }
      setResult(res.data!)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  // ── Tela de sucesso ──────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex items-start justify-center p-4 pt-10 pb-12">
        <div className="w-full max-w-sm space-y-5">

          {/* Ícone + título */}
          <div className="flex flex-col items-center gap-3 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cadastro realizado!</h1>
              <p className="text-white/80 text-sm mt-1">Envie as credenciais para o paciente</p>
            </div>
          </div>

          {/* Card credenciais */}
          <div className="bg-white rounded-3xl p-6 space-y-4 shadow-2xl">

            {/* E-mail */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">E-mail de acesso</p>
              <p className="text-[15px] font-medium text-gray-800 break-all">{result.email}</p>
            </div>

            <hr className="border-gray-100" />

            {/* Senha */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Senha temporária</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-2xl font-bold text-primary tracking-[0.15em] bg-blue-50 rounded-2xl px-4 py-3 text-center">
                  {result.password}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copiar senha"
                  className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-2xl text-gray-500 hover:bg-primary hover:text-white transition-all flex-shrink-0"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">Pode ser alterada após o primeiro acesso</p>
            </div>

            <hr className="border-gray-100" />

            {/* Botões de envio */}
            <div className="space-y-2">
              {/* Copiar tudo formatado — funciona em qualquer dispositivo */}
              <button
                type="button"
                onClick={handleCopyAll}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-white rounded-2xl text-[15px] font-semibold hover:bg-primary-light transition-colors"
              >
                {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedAll ? 'Copiado! Cole no WhatsApp ou e-mail' : 'Copiar credenciais para enviar'}
              </button>

              {/* mailto como alternativa */}
              <a
                href={`mailto:${result.email}?subject=Seu%20acesso%20ao%20Portal%20Dr.%20Guilherme&body=Ol%C3%A1!%0A%0ASeu%20cadastro%20foi%20realizado.%0A%0AE-mail%3A%20${encodeURIComponent(result.email)}%0ASenha%3A%20${encodeURIComponent(result.password)}%0A%0AAccesse%3A%20${encodeURIComponent(APP_URL)}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-gray-200 text-gray-600 rounded-2xl text-[15px] font-semibold hover:border-primary hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                Abrir e-mail
              </a>
            </div>
          </div>

          {/* Aviso sobre o link do portal */}
          <div className="bg-white/10 rounded-2xl px-4 py-3 text-center">
            <p className="text-white/80 text-xs leading-relaxed">
              O paciente acessa o portal em{' '}
              <span className="font-semibold text-white">portal-dr-guilherme.vercel.app</span>
              {' '}com as credenciais acima.
            </p>
          </div>

        </div>
      </div>
    )
  }

  // ── Formulário ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light">

      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-white/10 backdrop-blur-sm px-5 py-4">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">
              {STEPS[step].emoji} {STEPS[step].title}
            </span>
            <span className="text-white/60 text-xs">{step + 1} / {STEPS.length}</span>
          </div>
          <div className="h-1 bg-white/20 rounded-full">
            <div
              className="h-1 bg-white rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 pt-6 pb-32 flex justify-center">
        <form ref={formRef} id="cadastro-form" onSubmit={handleSubmit} className="w-full max-w-sm">

          {/* ── Etapa 0: Quem é você? ── */}
          <div data-step="0" className={step === 0 ? 'space-y-5' : 'hidden'}>
            <div className="bg-white rounded-3xl p-6 shadow-xl space-y-5">
              <Field label="Nome completo" name="full_name" autoComplete="name" autoCapitalize="words" placeholder="Ana Paula Vieira" required />

              {/* Data de nascimento: 3 selects */}
              <DatePicker required />

              <SelectField label="Sexo" name="sexo" required>
                <option value="">Selecione</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </SelectField>

              <Field label="CPF" name="cpf" inputMode="numeric" placeholder="00000000000" maxLength={11} hint="Somente números" required />
              <Field label="Nome completo da mãe" name="nome_mae" autoCapitalize="words" placeholder="Maria Silva Vieira" required />
              <Field label="Profissão" name="profissao" autoCapitalize="words" placeholder="Professora" required />
            </div>
          </div>

          {/* ── Etapa 1: Como te encontrar? ── */}
          <div data-step="1" className={step === 1 ? 'space-y-5' : 'hidden'}>
            <div className="bg-white rounded-3xl p-6 shadow-xl space-y-5">
              <Field label="E-mail" name="email" type="email" autoComplete="email" placeholder="ana@email.com" required />
              <Field label="Celular com DDD" name="phone" inputMode="tel" placeholder="11999999999" hint="Somente números" required />
              <Field label="CEP" name="cep" inputMode="numeric" placeholder="01310100" maxLength={8} hint="Somente números" required />
              <Field label="Endereço" name="endereco" placeholder="Rua das Flores, 123, Apto 45" required />
              <Field label="Cidade e Estado" name="cidade_estado" placeholder="São Paulo, SP" required />
            </div>
          </div>

          {/* ── Etapa 2: Últimas informações + LGPD ── */}
          <div data-step="2" className={step === 2 ? 'space-y-5' : 'hidden'}>
            <div className="bg-white rounded-3xl p-6 shadow-xl space-y-5">
              {/* Como conheceu */}
              <div className="space-y-3">
                <label className="block text-[15px] font-semibold text-gray-800">
                  Como conheceu o Dr. Guilherme? <span className="text-primary">*</span>
                </label>

                {/* Opções em grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'indicacao', label: '🤝 Indicação' },
                    { value: 'google',    label: '🔍 Google' },
                    { value: 'instagram', label: '📸 Instagram' },
                    { value: 'outro',     label: '💬 Outro' },
                  ].map(op => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => { setComoConheceu(op.value); setIndicadoPor(''); setOutroTexto('') }}
                      className={`px-4 py-3 rounded-2xl text-[15px] font-medium border-2 transition-all text-left
                        ${comoConheceu === op.value
                          ? 'border-primary bg-blue-50 text-primary'
                          : 'border-gray-200 bg-gray-50 text-gray-700'}`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>

                {/* Sub-input: quem indicou */}
                {comoConheceu === 'indicacao' && (
                  <input
                    autoFocus
                    placeholder="Nome de quem indicou"
                    value={indicadoPor}
                    onChange={e => setIndicadoPor(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-primary rounded-2xl text-[16px] text-gray-900
                               placeholder-gray-400 focus:outline-none bg-blue-50"
                  />
                )}

                {/* Sub-input: outro */}
                {comoConheceu === 'outro' && (
                  <input
                    autoFocus
                    placeholder="Como foi? Pode descrever..."
                    value={outroTexto}
                    onChange={e => setOutroTexto(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-primary rounded-2xl text-[16px] text-gray-900
                               placeholder-gray-400 focus:outline-none bg-blue-50"
                  />
                )}

                {/* Campo hidden com o valor final montado */}
                <input
                  type="hidden"
                  name="como_conheceu"
                  value={
                    comoConheceu === 'indicacao' ? `Indicação${indicadoPor ? `: ${indicadoPor}` : ''}` :
                    comoConheceu === 'google'    ? 'Google' :
                    comoConheceu === 'instagram' ? 'Instagram' :
                    comoConheceu === 'outro'     ? (outroTexto || 'Outro') :
                    ''
                  }
                />
              </div>
              <Field label="CNS — Cartão Nacional de Saúde" name="cns" inputMode="numeric" placeholder="000 0000 0000 0000" hint="Opcional" />
            </div>

            {/* LGPD */}
            <div className="bg-white rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-[15px] font-semibold text-gray-900">Termos e Privacidade</p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  O Portal é exclusivo para comunicação com o consultório.{' '}
                  <strong>Não use para urgências ou emergências.</strong>
                </p>
              </div>

              {/* Checkbox termo 1 + dropdown com texto completo */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={e => { setTermos(e.target.checked); setError('') }}
                    className="mt-1 w-5 h-5 accent-primary flex-shrink-0"
                  />
                  <span className="text-[13px] text-gray-600 leading-relaxed">
                    Li e aceito os{' '}
                    <button
                      type="button"
                      onClick={() => setTermoAberto(v => !v)}
                      className="font-semibold text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
                    >
                      Termos de Uso e Política de Privacidade
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${termoAberto ? 'rotate-180' : ''}`} />
                    </button>{' '}
                    do Portal Dr. Guilherme, incluindo o tratamento dos meus dados de saúde conforme a LGPD.
                  </span>
                </label>

                {/* Texto completo — aparece ao clicar */}
                {termoAberto && (
                  <div className="ml-8 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-[12px] text-gray-600 leading-relaxed space-y-4">
                    <div>
                      <p className="font-bold text-gray-900 text-[13px]">Termos de Uso e Política de Privacidade</p>
                      <p className="font-semibold text-gray-700">Portal Dr. Guilherme</p>
                      <p className="text-gray-400 mt-0.5">Última atualização: 08/05/2025</p>
                    </div>

                    <p>O presente documento reúne os Termos de Uso e a Política de Privacidade do Portal Dr. Guilherme, plataforma digital de apoio ao atendimento médico, destinada exclusivamente à comunicação entre o consultório e seus pacientes.</p>
                    <p>Ao acessar e utilizar o Portal, o paciente declara estar ciente das condições abaixo, especialmente quanto ao tratamento de seus dados pessoais e dados pessoais sensíveis de saúde, nos termos da Lei Geral de Proteção de Dados Pessoais — LGPD.</p>

                    <p><strong className="text-gray-800">1. Sobre o Portal</strong><br />
                    O Portal Dr. Guilherme é uma plataforma digital de apoio ao atendimento médico, criada para facilitar a comunicação entre o consultório e seus pacientes. Por meio do Portal, poderão ser disponibilizados documentos médicos, orientações, receitas, laudos, solicitações de contato, mensagens e demais informações relacionadas ao acompanhamento do paciente.<br /><br />
                    O Portal não substitui consulta médica, atendimento presencial, avaliação clínica, serviços de urgência ou emergência. Em caso de urgência, procure atendimento presencial imediato.</p>

                    <p><strong className="text-gray-800">2. Controlador dos Dados</strong><br />
                    Dr. Guilherme Parise Santa Catharina / Consultório Dr. Guilherme<br />
                    E-mail: guilherme@santacatharina.com.br<br />
                    WhatsApp: +55 11 93454-4550<br />
                    Endereço: Rua Barata Ribeiro, 190, Cj 32/33 · Cerqueira César · São Paulo, SP</p>

                    <p><strong className="text-gray-800">3. Dados Pessoais Tratados</strong><br />
                    Nome completo, e-mail, telefone, CPF, data de nascimento, dados de identificação, mensagens, solicitações, documentos médicos (receitas, laudos, exames, orientações), registros de acesso e uso do Portal. Alguns desses dados são classificados como dados pessoais sensíveis de saúde.</p>

                    <p><strong className="text-gray-800">4. Finalidades do Tratamento</strong><br />
                    Identificação do paciente; comunicação com o consultório; envio de documentos médicos; organização administrativa; continuidade do cuidado; cumprimento de obrigações legais, regulatórias, éticas e profissionais; segurança da informação e exercício regular de direitos.</p>

                    <p><strong className="text-gray-800">5. Bases Legais</strong><br />
                    Consentimento do titular; cumprimento de obrigação legal ou regulatória; execução de serviço médico; exercício regular de direitos; tutela da saúde por profissional de saúde ou serviço de saúde; legítimo interesse, quando aplicável.</p>

                    <p><strong className="text-gray-800">6. Compartilhamento de Dados</strong><br />
                    Os dados não são comercializados. Poderão ser compartilhados apenas para prestação do atendimento, operação do Portal, cumprimento de obrigações legais ou exercício regular de direitos.</p>

                    <p><strong className="text-gray-800">7. Segurança da Informação</strong><br />
                    São adotadas medidas técnicas e organizacionais razoáveis: controle de acesso, criptografia, registro de acessos e armazenamento em ambientes protegidos. O paciente deve manter suas credenciais em sigilo.</p>

                    <p><strong className="text-gray-800">8. Guarda e Retenção</strong><br />
                    Os dados serão mantidos pelo período necessário para cumprir as finalidades descritas, incluindo obrigações legais, regulatórias, éticas e profissionais. Prontuários médicos observam prazo mínimo de 20 anos (Resolução CFM nº 1.821/2007).</p>

                    <p><strong className="text-gray-800">9. Direitos do Titular</strong><br />
                    Nos termos da LGPD, você pode solicitar: confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, revogação de consentimento e revisão de decisões automatizadas.</p>

                    <p><strong className="text-gray-800">10. Comunicações</strong><br />
                    O consultório poderá utilizar o Portal, e-mail, telefone ou WhatsApp para comunicações relacionadas ao atendimento médico.</p>

                    <p><strong className="text-gray-800">11. Responsabilidades do Paciente</strong><br />
                    Fornecer informações verdadeiras; manter credenciais em sigilo; não compartilhar senha; usar o Portal apenas para seu atendimento; comunicar ao consultório qualquer acesso indevido.</p>

                    <p><strong className="text-gray-800">12. Limitações do Portal</strong><br />
                    O Portal não se destina a urgências, emergências ou substituição de consulta médica. Pode haver indisponibilidades temporárias por manutenção ou motivos técnicos.</p>

                    <p><strong className="text-gray-800">13. Alterações nesta Política</strong><br />
                    Esta Política poderá ser atualizada periodicamente. A versão vigente estará sempre disponível no Portal, com a data de atualização indicada.</p>

                    <p><strong className="text-gray-800">14. Canal de Contato</strong><br />
                    E-mail: guilherme@santacatharina.com.br<br />
                    WhatsApp: +55 11 93454-4550<br />
                    Responsável: Consultório Dr. Guilherme</p>

                    <button
                      type="button"
                      onClick={() => setTermoAberto(false)}
                      className="text-primary font-semibold text-[12px]"
                    >
                      Fechar ↑
                    </button>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceitouComms}
                  onChange={e => { setComms(e.target.checked); setError('') }}
                  className="mt-1 w-5 h-5 accent-primary flex-shrink-0"
                />
                <span className="text-[13px] text-gray-600 leading-relaxed">
                  Autorizo o recebimento de comunicações do consultório por e-mail, telefone ou WhatsApp
                  relacionadas ao meu atendimento.
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Exibe erro de validação nas etapas 0 e 1 também */}
          {error && step < 2 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

        </form>
      </div>

      {/* Botões fixos no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 px-4 py-4">
        <div className="max-w-sm mx-auto flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0 }) }}
              className="w-14 h-14 flex items-center justify-center bg-white/20 text-white rounded-2xl hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 h-14 bg-white text-primary rounded-2xl text-[16px] font-bold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Próximo <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              form="cadastro-form"
              disabled={isPending || !aceitouTermos || !aceitouComms}
              onClick={() => formRef.current?.requestSubmit()}
              className="flex-1 flex items-center justify-center gap-2 h-14 bg-white text-primary rounded-2xl text-[15px] font-bold
                         disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 transition-colors shadow-lg"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Criando acesso...
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Enviar + Gerar acesso
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
