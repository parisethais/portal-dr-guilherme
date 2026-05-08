'use client'

import { useState, useTransition } from 'react'
import { submitCadastro } from '@/app/actions/cadastro'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ClipboardList, ChevronRight, ChevronLeft, CheckCircle2, Copy, Check, Mail, ShieldCheck, AlertTriangle } from 'lucide-react'

const STEPS = ['Dados pessoais', 'Contato e endereço', 'Informações adicionais']
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal-dr-guilherme.vercel.app'

export default function CadastroForm() {
  const [step, setStep]               = useState(0)
  const [error, setError]             = useState('')
  const [isPending, startTransition]  = useTransition()
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [aceitouComms, setAceitouComms]   = useState(false)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!aceitouTermos || !aceitouComms) {
      setError('Você precisa aceitar os dois termos para continuar.')
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('aceita_termos', String(aceitouTermos))
    fd.set('aceita_comms',  String(aceitouComms))
    startTransition(async () => {
      const res = await submitCadastro(fd)
      if (!res.success) { setError(res.error); return }
      setResult(res.data!)
    })
  }

  // ── Tela de sucesso ────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Cadastro realizado!</p>
              <p className="text-sm text-gray-500">Guarde as credenciais abaixo para acessar o portal.</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">E-mail</p>
              <p className="text-sm font-medium text-gray-800">{result.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Senha temporária</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-base font-bold text-primary tracking-widest bg-white border border-gray-200 rounded-lg px-3 py-2">
                  {result.password}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 text-gray-400 hover:text-primary transition-colors"
                  title="Copiar senha"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Você pode alterar a senha depois de entrar no portal.
          </p>

          <div className="flex gap-2">
            <a
              href={`mailto:${result.email}?subject=${encodeURIComponent('Seu acesso ao Portal Dr. Guilherme')}&body=${encodeURIComponent(
                `Olá!\n\nSeu cadastro no Portal Dr. Guilherme foi realizado com sucesso.\n\nE-mail: ${result.email}\nSenha temporária: ${result.password}\n\nAcesse em: ${APP_URL}\n\nRecomendamos alterar sua senha após o primeiro acesso.\n\nAtenciosamente,\nConsultório Dr. Guilherme Santa Catharina`
              )}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Enviar por e-mail
            </a>
            <a
              href={APP_URL}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
            >
              Acessar portal
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cadastro de Paciente</h2>
              <p className="text-xs text-gray-500">Consultório Dr. Guilherme · Etapa {step + 1} de {STEPS.length} — {STEPS[step]}</p>
            </div>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full">
            <div
              className="h-1.5 bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">

            {/* ── Etapa 0: Dados pessoais ── */}
            {step === 0 && (
              <>
                <Input label="Nome completo" name="full_name" type="text" required autoComplete="name" />
                <Input label="E-mail" name="email" type="email" required autoComplete="email" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Data de nascimento" name="data_nascimento" type="date" required />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Sexo biológico <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="sexo"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Selecione</option>
                      <option value="F">Feminino</option>
                      <option value="M">Masculino</option>
                    </select>
                  </div>
                </div>
                <Input label="CPF (somente números)" name="cpf" type="text" placeholder="00000000000" maxLength={11} required />
                <Input label="Nome completo da mãe" name="nome_mae" type="text" required autoComplete="off" />
                <Input label="Profissão" name="profissao" type="text" required />
              </>
            )}

            {/* ── Etapa 1: Contato e endereço ── */}
            {step === 1 && (
              <>
                <Input label="Celular com DDD (somente números)" name="phone" type="tel" placeholder="11999999999" required />
                <Input label="CEP (somente números)" name="cep" type="text" placeholder="00000000" maxLength={8} required />
                <Input label="Endereço (Rua, número, complemento)" name="endereco" type="text" placeholder="Rua das Flores, 123, Apto 45" required />
                <Input label="Cidade e Estado" name="cidade_estado" type="text" placeholder="São Paulo, SP" required />
              </>
            )}

            {/* ── Etapa 2: Informações adicionais + LGPD ── */}
            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Como conheceu o Dr. Guilherme? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="como_conheceu"
                    required
                    rows={2}
                    placeholder="Ex: Indicação do Dr. Octávio, pesquisa no Google..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>
                <Input label="CNS — Cartão Nacional de Saúde (opcional)" name="cns" type="text" placeholder="000 0000 0000 0000" />

                <hr className="border-gray-100" />

                {/* LGPD */}
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-sm font-semibold text-gray-900">Termos de Uso e Privacidade</p>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    O Portal é destinado exclusivamente ao apoio à comunicação entre consultório e paciente.{' '}
                    <strong>Não deve ser utilizado para urgências ou emergências médicas.</strong>
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={e => { setAceitouTermos(e.target.checked); setError('') }}
                    className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                  />
                  <span className="text-xs text-gray-700 leading-relaxed">
                    Li e aceito os Termos de Uso e a Política de Privacidade do Portal Dr. Guilherme.
                    Declaro estar ciente de que meus dados pessoais, incluindo dados sensíveis de saúde,
                    poderão ser tratados para fins de atendimento médico conforme a LGPD.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceitouComms}
                    onChange={e => { setAceitouComms(e.target.checked); setError('') }}
                    className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                  />
                  <span className="text-xs text-gray-700 leading-relaxed">
                    Autorizo o recebimento de comunicações do consultório por Portal, e-mail, telefone ou
                    WhatsApp, exclusivamente para assuntos relacionados ao meu atendimento.
                  </span>
                </label>
              </>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" size="md" className="flex-1" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" variant="primary" size="md" className="flex-1" onClick={() => setStep(s => s + 1)}>
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="flex-1"
                loading={isPending}
                disabled={!aceitouTermos || !aceitouComms}
              >
                <ShieldCheck className="w-4 h-4" />
                Enviar formulário + Gerar acesso ao portal
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
