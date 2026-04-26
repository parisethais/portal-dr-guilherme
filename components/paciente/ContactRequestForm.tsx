'use client'

import { useState, useTransition, useRef } from 'react'
import { createContactRequest } from '@/app/actions/contact-requests'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Send, CheckCircle } from 'lucide-react'

export default function ContactRequestForm() {
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget

    startTransition(async () => {
      const result = await createContactRequest(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSubmitted(true)
        form.reset()
        setTimeout(() => setSubmitted(false), 5000)
      }
    })
  }

  return (
    <div className="max-w-lg">
      {submitted && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Solicitação enviada!</p>
            <p className="text-xs text-green-700 mt-0.5">
              Entraremos em contato em breve.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Assunto"
          name="subject"
          type="text"
          placeholder="Ex: Dúvida sobre receita, Agendamento de retorno..."
          required
          maxLength={120}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Mensagem <span className="text-red-500">*</span>
          </label>
          <textarea
            name="message"
            rows={5}
            placeholder="Descreva sua solicitação com o máximo de detalhes possível..."
            required
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none placeholder:text-gray-400"
          />
          <p className="mt-1 text-xs text-gray-500">Máximo de 2.000 caracteres.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" loading={isPending} size="lg">
          <Send className="w-4 h-4" />
          Enviar Solicitação
        </Button>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
        <strong className="block text-gray-700 mb-1">Importante:</strong>
        Este formulário destina-se a solicitações de contato e retorno não urgentes.
        Em caso de emergência médica, ligue imediatamente para o SAMU (192) ou dirija-se
        ao pronto-socorro mais próximo.
      </div>
    </div>
  )
}
