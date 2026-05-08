'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createPatient } from '@/app/actions/patients'
import { UserPlus, CheckCircle2, Copy, Check, Mail } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function InvitePatientModal({ open, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [error, setError]           = useState('')
  const [createdName, setCreatedName] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [copied, setCopied]         = useState(false)

  function handleClose() {
    setFullName('')
    setEmail('')
    setError('')
    setCreatedName('')
    setTempPassword('')
    setCopied(false)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await createPatient(fullName, email)
      if (!result.success) {
        setError(result.error)
        return
      }
      setCreatedName(fullName)
      setTempPassword(result.data!.password)
      router.refresh()
    })
  }

  function handleCopy() {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const success = !!tempPassword

  return (
    <Modal open={open} onClose={handleClose} title="Cadastrar Paciente" className="max-w-md">
      {success ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{createdName} cadastrado!</p>
              <p className="text-sm text-gray-500">Passe as credenciais abaixo para o paciente.</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">E-mail</p>
              <p className="text-sm font-medium text-gray-800">{email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Senha temporária</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-base font-bold text-primary tracking-widest bg-white border border-gray-200 rounded-lg px-3 py-2">
                  {tempPassword}
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
            O paciente pode alterar a senha depois de entrar.
          </p>

          <div className="flex gap-2">
            <a
              href={`mailto:${email}?subject=${encodeURIComponent('Acesso ao Portal Dr. Guilherme')}&body=${encodeURIComponent(
                `Olá, ${createdName}!\n\nSeu acesso ao Portal Dr. Guilherme foi criado.\n\nE-mail: ${email}\nSenha temporária: ${tempPassword}\n\nAcesse em: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal-dr-guilherme.vercel.app'}\n\nRecomendamos alterar sua senha após o primeiro acesso.\n\nAtenciosamente,\nConsultório Dr. Guilherme Santa Catharina`
              )}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Enviar por e-mail
            </a>
            <Button variant="primary" size="md" onClick={handleClose} className="flex-1">
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500 -mt-2">
            Uma senha temporária será gerada. Você repassa para o paciente acessar o portal.
          </p>

          <Input
            label="Nome completo"
            type="text"
            placeholder="Ana Lima"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="off"
          />

          <Input
            label="E-mail"
            type="email"
            placeholder="paciente@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="md" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" className="flex-1" loading={isPending}>
              <UserPlus className="w-4 h-4" />
              Cadastrar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
