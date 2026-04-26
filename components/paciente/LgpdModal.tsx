'use client'

import { useState, useTransition } from 'react'
import { acceptLgpd } from '@/app/actions/lgpd'
import Button from '@/components/ui/Button'
import { ShieldCheck } from 'lucide-react'

export default function LgpdModal() {
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAccept() {
    if (!accepted) {
      setError('Você precisa marcar a caixa de aceite para continuar.')
      return
    }
    startTransition(async () => {
      const result = await acceptLgpd()
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Termos de Uso e Privacidade</h2>
              <p className="text-xs text-gray-500">Leitura obrigatória — LGPD (Lei nº 13.709/2018)</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">1. Sobre este Portal</h3>
            <p>
              O Portal Dr. Guilherme é uma plataforma digital de apoio ao atendimento médico,
              destinada exclusivamente à comunicação entre o consultório e seus pacientes.
              Permite o compartilhamento seguro de documentos médicos (laudos, receitas,
              orientações) e o envio de mensagens e solicitações de contato.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">2. Dados Coletados</h3>
            <p>
              Coletamos e tratamos os seguintes dados pessoais e de saúde:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Nome completo, e-mail e telefone</li>
              <li>CPF (quando fornecido)</li>
              <li>Documentos médicos compartilhados pelo consultório</li>
              <li>Mensagens trocadas com a equipe médica</li>
              <li>Solicitações de contato e retorno</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">3. Finalidade do Tratamento</h3>
            <p>
              Seus dados são tratados exclusivamente para prestação de assistência à saúde,
              gerenciamento do relacionamento paciente-médico e cumprimento de obrigações
              legais. Não comercializamos nem compartilhamos seus dados com terceiros sem
              sua autorização expressa.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">4. Seus Direitos (LGPD)</h3>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Confirmar a existência do tratamento dos seus dados</li>
              <li>Acessar e obter cópia dos seus dados</li>
              <li>Solicitar correção de dados incompletos ou inexatos</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação dos dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>
            <p className="mt-2">
              Para exercer esses direitos, entre em contato com o consultório.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">5. Segurança</h3>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra
              acesso não autorizado, perda ou destruição, incluindo criptografia e
              controles de acesso baseados em funções.
            </p>
          </section>
        </div>

        <div className="p-6 border-t border-gray-100 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked)
                setError('')
              }}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Li integralmente e aceito os Termos de Uso e a Política de Privacidade.
              Autorizo o tratamento dos meus dados pessoais de saúde para fins de
              atendimento médico conforme descrito acima.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            onClick={handleAccept}
            loading={isPending}
            disabled={!accepted}
            className="w-full"
            size="lg"
          >
            <ShieldCheck className="w-4 h-4" />
            Aceitar e Acessar o Portal
          </Button>
        </div>
      </div>
    </div>
  )
}
