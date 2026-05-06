'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/app/actions/auth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Eye, EyeOff, UserRound, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'paciente' | 'medico'
type Mode = 'login' | 'signup'

export default function LoginForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('paciente')
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lgpdAccepted, setLgpdAccepted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleTabChange(newTab: Tab) {
    setTab(newTab)
    setMode('login')
    setError('')
    setSuccessMsg('')
  }

  function handleModeToggle() {
    setMode((currentMode) => (currentMode === 'login' ? 'signup' : 'login'))
    setError('')
    setSuccessMsg('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (tab === 'paciente' && mode === 'signup' && !lgpdAccepted) {
      setError('Você precisa aceitar os termos de uso e a política de privacidade para se cadastrar.')
      return
    }

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      if (mode === 'signup') {
        const result = await signup(formData)
        if (result && !result.success) {
          setError(result.error ?? '')
        } else if (result?.message) {
          setSuccessMsg(result.message)
          setMode('login')
        }
      } else {
        const result = await login(formData)
        if (result?.error) {
          setError(result.error)
        } else if (result?.redirectTo) {
          router.push(result.redirectTo)
        }
      }
    })
  }

  return (
    <div className="relative z-20 isolate pointer-events-auto">
      {/* Tabs */}
      <div className="flex">
        <button
          type="button"
          onClick={() => handleTabChange('paciente')}
          onPointerDown={(e) => {
            e.preventDefault()
            handleTabChange('paciente')
          }}
          className={cn(
            'relative z-20 flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors rounded-tl-2xl cursor-pointer touch-manipulation pointer-events-auto select-none',
            tab === 'paciente'
              ? 'border-primary text-primary bg-blue-50'
              : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          )}
        >
          <UserRound className="w-4 h-4" />
          Área do Paciente
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('medico')}
          onPointerDown={(e) => {
            e.preventDefault()
            handleTabChange('medico')
          }}
          className={cn(
            'relative z-20 flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors rounded-tr-2xl cursor-pointer touch-manipulation pointer-events-auto select-none',
            tab === 'medico'
              ? 'border-primary text-primary bg-blue-50'
              : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          )}
        >
          <Stethoscope className="w-4 h-4" />
          Área Médica
        </button>
      </div>

      {/* Form */}
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {tab === 'paciente' ? 'Olá, paciente' : 'Acesso restrito'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {tab === 'paciente' && mode === 'login' && 'Entre para ver seus documentos e mensagens.'}
          {tab === 'paciente' && mode === 'signup' && 'Crie sua conta para acessar o portal.'}
          {tab === 'medico' && 'Acesso exclusivo para a equipe médica.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Input
              label="Nome completo"
              name="full_name"
              type="text"
              placeholder="Seu nome completo"
              required
              autoComplete="name"
            />
          )}

          <Input
            label="E-mail"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />

          <div className="relative">
            <Input
              label="Senha"
              name="password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Checkbox LGPD — apenas no cadastro de paciente */}
          {tab === 'paciente' && mode === 'signup' && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <input
                type="checkbox"
                id="lgpd"
                checked={lgpdAccepted}
                onChange={(e) => setLgpdAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
              />
              <label htmlFor="lgpd" className="text-xs text-gray-700 leading-relaxed cursor-pointer">
                Li e aceito os{' '}
                <span className="text-primary font-medium underline cursor-pointer">Termos de Uso</span>
                {' '}e a{' '}
                <span className="text-primary font-medium underline cursor-pointer">Política de Privacidade</span>
                {' '}do Portal Dr. Guilherme, em conformidade com a{' '}
                <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
                Autorizo o tratamento dos meus dados pessoais de saúde para fins de atendimento médico.
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {successMsg}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={isPending}>
            {mode === 'signup' ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>

        {/* Toggle login/signup — apenas pacientes */}
        {tab === 'paciente' && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              onClick={handleModeToggle}
              onPointerDown={(e) => {
                e.preventDefault()
                handleModeToggle()
              }}
              className="relative z-20 text-primary font-medium hover:underline cursor-pointer touch-manipulation pointer-events-auto select-none"
            >
              {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
