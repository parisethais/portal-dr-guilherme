'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/app/actions/auth'
import { Eye, EyeOff, UserRound, Stethoscope } from 'lucide-react'

// ── Design tokens do card escuro ──────────────────────────────
const C = {
  accent:       '#7EB8D4',
  bg:           '#21273A',
  textPrimary:  '#F5F2EC',
  tabInactive:  'rgba(255,255,255,0.45)',
  tabBorder:    'rgba(255,255,255,0.08)',
  inputBg:      'rgba(255,255,255,0.06)',
  inputBorder:  'rgba(255,255,255,0.1)',
  inputFocus:   'rgba(126,184,212,0.5)',
  placeholder:  'rgba(255,255,255,0.28)',
  labelColor:   'rgba(255,255,255,0.55)',
  divider:      'rgba(255,255,255,0.07)',
}

// ── Componentes internos ──────────────────────────────────────
function DarkInput({
  label, name, type = 'text', placeholder, required, autoComplete, minLength,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
  minLength?: number
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.labelColor, letterSpacing: '0.02em' }}
      >
        {label}
        {required && <span style={{ color: C.accent, marginLeft: 3 }}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        style={{
          width: '100%',
          padding: '10px 14px',
          backgroundColor: C.inputBg,
          border: `1px solid ${C.inputBorder}`,
          borderRadius: 10,
          color: C.textPrimary,
          fontSize: 14,
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = C.accent
          e.currentTarget.style.boxShadow = `0 0 0 3px ${C.inputFocus}`
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = C.inputBorder
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

type Tab = 'paciente' | 'medico'
type Mode = 'login' | 'signup'

export default function LoginForm() {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('paciente')
  const [mode, setMode]         = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lgpdAccepted, setLgpdAccepted] = useState(false)
  const [isPending, startTransition]    = useTransition()

  function handleTabChange(newTab: Tab) {
    setTab(newTab); setMode('login'); setError(''); setSuccessMsg('')
  }

  function handleModeToggle() {
    setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setSuccessMsg('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccessMsg('')

    if (tab === 'paciente' && mode === 'signup' && !lgpdAccepted) {
      setError('Você precisa aceitar os termos de uso e a política de privacidade para se cadastrar.')
      return
    }

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      if (mode === 'signup') {
        const result = await signup(formData)
        if (result && !result.success) { setError(result.error ?? '') }
        else if (result?.message) { setSuccessMsg(result.message); setMode('login') }
      } else {
        const result = await login(formData)
        if (result?.error) { setError(result.error) }
        else if (result?.redirectTo) { router.push(result.redirectTo) }
      }
    })
  }

  return (
    <div>
      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.tabBorder}` }}>
        {([
          { id: 'paciente' as Tab, label: 'Área do Paciente', icon: <UserRound className="w-3.5 h-3.5" /> },
          { id: 'medico'   as Tab, label: 'Área Médica',      icon: <Stethoscope className="w-3.5 h-3.5" /> },
        ]).map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              onPointerDown={e => { e.preventDefault(); handleTabChange(t.id) }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '14px 0',
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? C.textPrimary : C.tabInactive,
                background: 'none',
                border: 'none',
                borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                transition: 'color 0.15s',
                userSelect: 'none',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Form ─────────────────────────────────────────────── */}
      <div style={{ padding: '28px 32px 32px' }}>
        <h2 style={{ color: C.textPrimary, fontWeight: 600, fontSize: 17, marginBottom: 4 }}>
          {tab === 'paciente' ? 'Olá, paciente' : 'Acesso restrito'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>
          {tab === 'paciente' && mode === 'login' && 'Entre para ver seus documentos e mensagens.'}
          {tab === 'paciente' && mode === 'signup' && 'Crie sua conta para acessar o portal.'}
          {tab === 'medico' && 'Acesso exclusivo para a equipe médica.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <DarkInput label="Nome completo" name="full_name" placeholder="Seu nome completo" required autoComplete="name" />
          )}

          <DarkInput label="E-mail" name="email" type="email" placeholder="seu@email.com" required autoComplete="email" />

          {/* Senha */}
          <div className="space-y-1.5" style={{ position: 'relative' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.labelColor, letterSpacing: '0.02em' }}
            >
              Senha <span style={{ color: C.accent }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                style={{
                  width: '100%',
                  padding: '10px 42px 10px 14px',
                  backgroundColor: C.inputBg,
                  border: `1px solid ${C.inputBorder}`,
                  borderRadius: 10,
                  color: C.textPrimary,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = C.accent
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${C.inputFocus}`
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = C.inputBorder
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.35)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* LGPD */}
          {tab === 'paciente' && mode === 'signup' && (
            <div style={{
              display: 'flex',
              gap: 12,
              padding: '12px 14px',
              backgroundColor: 'rgba(126,184,212,0.07)',
              border: `1px solid rgba(126,184,212,0.18)`,
              borderRadius: 10,
            }}>
              <input
                type="checkbox"
                id="lgpd"
                checked={lgpdAccepted}
                onChange={e => setLgpdAccepted(e.target.checked)}
                style={{ marginTop: 2, width: 15, height: 15, accentColor: C.accent, flexShrink: 0, cursor: 'pointer' }}
              />
              <label htmlFor="lgpd" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, cursor: 'pointer' }}>
                Li e aceito os{' '}
                <span style={{ color: C.accent, fontWeight: 500 }}>Termos de Uso</span>
                {' '}e a{' '}
                <span style={{ color: C.accent, fontWeight: 500 }}>Política de Privacidade</span>
                {' '}do portal, em conformidade com a{' '}
                <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
                {' '}Autorizo o tratamento dos meus dados pessoais de saúde para fins de atendimento médico.
              </label>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              color: '#fca5a5',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Sucesso */}
          {successMsg && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 10,
              color: '#86efac',
              fontSize: 13,
            }}>
              {successMsg}
            </div>
          )}

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isPending ? 'rgba(126,184,212,0.6)' : C.accent,
              color: '#1A1F2E',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              borderRadius: 10,
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s',
              marginTop: 4,
            }}
          >
            {isPending && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {mode === 'signup' ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        {/* Toggle login/signup */}
        {tab === 'paciente' && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 20 }}>
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              onClick={handleModeToggle}
              onPointerDown={e => { e.preventDefault(); handleModeToggle() }}
              style={{
                background: 'none',
                border: 'none',
                color: C.accent,
                fontWeight: 500,
                fontSize: 13,
                cursor: 'pointer',
                padding: 0,
                userSelect: 'none',
              }}
            >
              {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
