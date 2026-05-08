'use client'

import { useState, useTransition } from 'react'
import { completeProfile } from '@/app/actions/profile'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ClipboardList, ChevronRight, ChevronLeft } from 'lucide-react'

const STEPS = ['Dados pessoais', 'Contato e endereço', 'Informações adicionais']

export default function ProfileCompleteForm({ fullName }: { fullName?: string | null }) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    startTransition(async () => {
      const result = await completeProfile(new FormData(form))
      if (!result.success) setError(result.error)
    })
  }

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
              <h2 className="text-lg font-semibold text-gray-900">Complete seu cadastro</h2>
              <p className="text-xs text-gray-500">Etapa {step + 1} de {STEPS.length} — {STEPS[step]}</p>
            </div>
          </div>
          {/* Progress bar */}
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
                <Input
                  label="Nome completo"
                  name="full_name"
                  type="text"
                  defaultValue={fullName ?? ''}
                  required
                  autoComplete="name"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Data de nascimento"
                    name="data_nascimento"
                    type="date"
                    required
                  />
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
                <Input
                  label="CPF (somente números)"
                  name="cpf"
                  type="text"
                  placeholder="00000000000"
                  maxLength={11}
                  required
                />
                <Input
                  label="Nome completo da mãe"
                  name="nome_mae"
                  type="text"
                  required
                  autoComplete="off"
                />
                <Input
                  label="Profissão"
                  name="profissao"
                  type="text"
                  required
                />
              </>
            )}

            {/* ── Etapa 1: Contato e endereço ── */}
            {step === 1 && (
              <>
                <Input
                  label="Celular com DDD (somente números)"
                  name="phone"
                  type="tel"
                  placeholder="11999999999"
                  required
                />
                <Input
                  label="CEP (somente números)"
                  name="cep"
                  type="text"
                  placeholder="00000000"
                  maxLength={8}
                  required
                />
                <Input
                  label="Endereço (Rua, número, complemento)"
                  name="endereco"
                  type="text"
                  placeholder="Rua das Flores, 123, Apto 45"
                  required
                />
                <Input
                  label="Cidade e Estado"
                  name="cidade_estado"
                  type="text"
                  placeholder="São Paulo, SP"
                  required
                />
              </>
            )}

            {/* ── Etapa 2: Informações adicionais ── */}
            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Como conheceu o Dr. Guilherme? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="como_conheceu"
                    required
                    rows={3}
                    placeholder="Ex: Indicação do Dr. Octávio, pesquisa no Google, indicação de amigo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>
                <Input
                  label="CNS — Cartão Nacional de Saúde (opcional)"
                  name="cns"
                  type="text"
                  placeholder="000 0000 0000 0000"
                />
                <p className="text-xs text-gray-400">
                  Seus dados são armazenados com segurança e usados exclusivamente para seu atendimento.
                </p>
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
              <Button
                type="button"
                variant="outline"
                size="md"
                className="flex-1"
                onClick={() => setStep(s => s - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => setStep(s => s + 1)}
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="flex-1"
                loading={isPending}
              >
                Salvar cadastro
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
