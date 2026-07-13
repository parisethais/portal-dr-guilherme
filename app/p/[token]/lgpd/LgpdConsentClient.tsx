'use client'

import { useState, useTransition } from 'react'
import { acceptLgpdByToken } from '@/app/actions/exame-upload'
import { ShieldCheck, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface Props {
  token:           string
  patientName:     string
  alreadyAccepted: boolean
}

export default function LgpdConsentClient({ token, patientName, alreadyAccepted }: Props) {
  const [accepted,     setAccepted]     = useState(alreadyAccepted)
  const [check1,       setCheck1]       = useState(false)
  const [check2,       setCheck2]       = useState(false)
  const [pending,      startTransition] = useTransition()
  const [error,        setError]        = useState('')

  function handleAccept() {
    if (!check1 || !check2) { setError('Você precisa marcar as duas caixas para continuar.'); return }
    setError('')
    startTransition(async () => {
      const res = await acceptLgpdByToken(token)
      if (!res.success) { setError(res.error); return }
      setAccepted(true)
    })
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-base font-semibold text-gray-900">Tudo certo, {patientName.split(' ')[0]}!</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Você aceitou os termos e sua privacidade está protegida conforme a LGPD. Pode fechar esta página.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Consultório Dr. Guilherme</p>
          <p className="font-semibold text-gray-900 text-sm">{patientName}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-lg mx-auto w-full space-y-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Termos de Uso e Política de Privacidade</h1>
          <p className="text-xs text-gray-500 mt-0.5">Última atualização: 01 de junho de 2025</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 text-sm text-gray-700 leading-relaxed max-h-[55vh] overflow-y-auto">
          <p>O presente documento reúne os Termos de Uso e a Política de Privacidade do Portal Dr. Guilherme, plataforma digital de apoio ao atendimento médico, destinada exclusivamente à comunicação entre o consultório e seus pacientes.</p>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">1. Sobre o Portal</h3>
            <p>O Portal é uma plataforma digital de apoio ao atendimento médico. Por meio do Portal, poderão ser disponibilizados documentos médicos, orientações, receitas, laudos, solicitações de contato, mensagens e demais informações relacionadas ao acompanhamento do paciente.</p>
            <p className="mt-2 font-medium text-red-700 text-xs">⚠️ O Portal não substitui consulta médica, atendimento presencial ou serviços de urgência. Em emergências, procure pronto-socorro imediatamente.</p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">2. Controlador dos Dados</h3>
            <p><strong>Dr. Guilherme Parise Santa Catharina</strong> — guilherme@santacatharina.com.br — +55 11 93454-4550 — Rua Barata Ribeiro, 190 · Cj 32/33 · Cerqueira César · São Paulo, SP.</p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">3. Dados Tratados</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              <li>Nome completo, e-mail, telefone e CPF</li>
              <li>Data de nascimento e dados de identificação</li>
              <li>Documentos médicos compartilhados pelo consultório <strong>ou pelo paciente</strong></li>
              <li>Receitas, laudos, <strong>exames</strong>, relatórios e orientações médicas</li>
              <li>Registros de acesso e uso do Portal</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">4. Finalidades</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              <li>Identificação do paciente e comunicação com o consultório</li>
              <li>Envio e disponibilização de documentos médicos</li>
              <li>Compartilhamento de receitas, laudos, exames e orientações</li>
              <li>Organização administrativa do atendimento e continuidade do cuidado</li>
              <li>Cumprimento de obrigações legais, regulatórias e éticas</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">5. Bases Legais (LGPD — Lei nº 13.709/2018)</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              <li>Consentimento do titular</li>
              <li>Tutela da saúde por profissional de saúde</li>
              <li>Cumprimento de obrigação legal ou regulatória</li>
              <li>Exercício regular de direitos</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">6. Compartilhamento com Terceiros</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              <li><strong>Supabase Inc.</strong> (EUA) — Banco de dados e armazenamento</li>
              <li><strong>Vercel Inc.</strong> (EUA) — Hospedagem do Portal</li>
              <li><strong>Anthropic PBC</strong> (EUA) — IA para interpretação clínica (opcional)</li>
              <li><strong>Google LLC</strong> (EUA) — Agenda e comunicação</li>
            </ul>
            <p className="text-xs mt-1">Nenhum dado é vendido ou compartilhado para fins comerciais.</p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">7. Retenção e Segurança</h3>
            <p className="text-xs">Os dados são mantidos pelo período necessário ao atendimento médico e cumprimento de obrigações legais, com uso de criptografia, controle de acesso e auditorias periódicas.</p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">8. Seus Direitos</h3>
            <p className="text-xs">Você pode solicitar acesso, correção, portabilidade, exclusão ou revogação do consentimento a qualquer momento pelo e-mail guilherme@santacatharina.com.br.</p>
          </section>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={check1}
              onChange={e => setCheck1(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary accent-primary flex-shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              Li integralmente e aceito os Termos de Uso e a Política de Privacidade, em conformidade com a LGPD — Lei nº 13.709/2018. Autorizo o tratamento dos meus dados pessoais de saúde para fins de atendimento médico.
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={check2}
              onChange={e => setCheck2(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary accent-primary flex-shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              Estou ciente de que o Portal não substitui consulta médica e que, em situações de urgência ou emergência, devo procurar atendimento presencial imediato.
            </span>
          </label>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
          </p>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={pending || !check1 || !check2}
          className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando aceite...</> : 'Aceitar e continuar'}
        </button>
      </div>
    </div>
  )
}
