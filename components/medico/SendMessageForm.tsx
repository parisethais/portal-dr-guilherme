'use client'

import { useState, useTransition } from 'react'
import type { Profile } from '@/lib/types'
import { sendMessage } from '@/app/actions/messages'
import Button from '@/components/ui/Button'
import PatientCombobox from '@/components/ui/PatientCombobox'
import { Send, CheckCircle } from 'lucide-react'

interface SendMessageFormProps {
  patients: Profile[]
}

export default function SendMessageForm({ patients }: SendMessageFormProps) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await sendMessage(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        form.reset()
        setTimeout(() => setSuccess(false), 4000)
      }
    })
  }

  return (
    <div className="max-w-lg space-y-4">
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">Mensagem enviada com sucesso!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Destinatário <span className="text-red-500">*</span>
          </label>
          <PatientCombobox patients={patients} name="recipient_id" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Mensagem <span className="text-red-500">*</span>
          </label>
          <textarea
            name="content"
            rows={6}
            placeholder="Digite a mensagem para o paciente..."
            required
            maxLength={3000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none placeholder:text-gray-400"
          />
          <p className="mt-1 text-xs text-gray-500">Máximo de 3.000 caracteres.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" loading={isPending} size="lg">
          <Send className="w-4 h-4" />
          Enviar Mensagem
        </Button>
      </form>
    </div>
  )
}
