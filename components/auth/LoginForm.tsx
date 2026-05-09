'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/app/actions/auth'
import { Eye, EyeOff, UserRound, Stethoscope } from 'lucide-react'

type Tab  = 'paciente' | 'medico'
type Mode = 'login' | 'signup'

export default function LoginForm() {
  const router = useRouter()
  const [tab,          setTab]          = useState<Tab>('paciente')
  const [mode,         setMode]         = useState<Mode>('login')
  const [showPass,     setShowPass]     = useState(false)
  const [error,        setError]        = useState('')
  const [successMsg,   setSuccessMsg]   = useState('')
  const [lgpdAccepted, setLgpdAccepted] = useState(false)
  const [isPending,    startTransition] = useTransition()

  function handleTabChange(t: Tab) {
    setTab(t); setMode('login'); setError(''); setSuccessMsg('')
  }
  function handleModeToggle() {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError(''); setSuccessMsg('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccessMsg('')
    if (tab === 'paciente' && mode === 'signup' && !lgpdAccepted) {
      setError('Você precisa aceitar os termos de uso e a política de privacidade para se cadastrar.')
      return
    }
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (mode === 'signup') {
        const r = await signup(fd)
        if (r && !r.success) setError(r.error ?? '')
        else if (r?.message) { setSuccessMsg(r.message); setMode('login') }
      } else {
        const r = await login(fd)
        if (r?.error)       setError(r.error)
        else if (r?.redirectTo) router.push(r.redirectTo)
      }
    })
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 8,
    fontSize: 14,
    color: '#F5F2EC',
    outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box',
  }

  return (
    <div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {([
          { id: 'paciente' as Tab, label: 'Área do Paciente', icon: <UserRound   size={13} /> },
          { id: 'medico'   as Tab, label: 'Área Médica',      icon: <Stethoscope size={13} /> },
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
                gap: 6,
                padding: '13px 0 14px',
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? '#F5F2EC' : 'rgba(255,255,255,0.35)',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #7EB8D4' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                transition: 'color .15s',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {t.icon} {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Conteúdo do form ─────────────────────────────────────── */}
      <div style={{ padding: '28px 32px 32px' }}>

        {/* Título da seção */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F5F2EC', margin: '0 0 5px' }}>
          {tab === 'paciente' ? 'Área do Paciente' : 'Área Médica'}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '0 0 26px' }}>
          {tab === 'paciente' && mode === 'login'  && 'Entre para ver seus documentos e mensagens.'}
          {tab === 'paciente' && mode === 'signup' && 'Crie sua conta para acessar o portal.'}
          {tab === 'medico'                        && 'Painel do consultório.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {mode === 'signup' && (
            <input
              name="full_name" type="text" placeholder="Nome completo"
              required autoComplete="name" style={inputBase}
              onFocus={e => { e.target.style.borderColor = '#7EB8D4'; e.target.style.boxShadow = '0 0 0 3px rgba(126,184,212,.12)' }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,.09)'; e.target.style.boxShadow = 'none' }}
            />
          )}

          <input
            name="email" type="email" placeholder="seu@email.com"
            required autoComplete="email" style={inputBase}
            onFocus={e => { e.target.style.borderColor = '#7EB8D4'; e.target.style.boxShadow = '0 0 0 3px rgba(126,184,212,.12)' }}
            onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,.09)'; e.target.style.boxShadow = 'none' }}
          />

          {/* Senha */}
          <div style={{ position: 'relative' }}>
            <input
              name="password" type={showPass ? 'text' : 'password'}
              placeholder="••••••••" required minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              style={{ ...inputBase, paddingRight: 44 }}
              onFocus={e => { e.target.style.borderColor = '#7EB8D4'; e.target.style.boxShadow = '0 0 0 3px rgba(126,184,212,.12)' }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,.09)'; e.target.style.boxShadow = 'none' }}
            />
            <button
              type="button" tabIndex={-1}
              onClick={() => setShowPass(s => !s)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', padding: 2,
              }}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* LGPD */}
          {tab === 'paciente' && mode === 'signup' && (
            <div style={{
              display: 'flex', gap: 10, padding: '11px 13px',
              backgroundColor: 'rgba(126,184,212,0.07)',
              border: '1px solid rgba(126,184,212,0.18)',
              borderRadius: 8,
            }}>
              <input
                type="checkbox" id="lgpd" checked={lgpdAccepted}
                onChange={e => setLgpdAccepted(e.target.checked)}
                style={{ marginTop: 2, width: 14, height: 14, accentColor: '#7EB8D4', flexShrink: 0, cursor: 'pointer' }}
              />
              <label htmlFor="lgpd" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, cursor: 'pointer' }}>
                Li e aceito os{' '}
                <span style={{ color: '#7EB8D4', fontWeight: 500 }}>Termos de Uso</span>
                {' '}e a{' '}
                <span style={{ color: '#7EB8D4', fontWeight: 500 }}>Política de Privacidade</span>
                {', '}em conformidade com a{' '}
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>LGPD — Lei nº 13.709/2018</strong>.
                {' '}Autorizo o tratamento dos meus dados pessoais de saúde para fins de atendimento médico.
              </label>
            </div>
          )}

          {/* Erros / sucesso */}
          {error && (
            <div style={{
              padding: '10px 13px', fontSize: 13, borderRadius: 8,
              backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5',
            }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div style={{
              padding: '10px 13px', fontSize: 13, borderRadius: 8,
              backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.18)', color: '#86efac',
            }}>
              {successMsg}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit" disabled={isPending}
            style={{
              width: '100%', padding: '13px',
              backgroundColor: '#7EB8D4',
              color: '#1A1F2E',
              fontWeight: 700, fontSize: 14,
              border: 'none', borderRadius: 8,
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: isPending ? 0.6 : 1,
              transition: 'opacity .15s',
              marginTop: 2,
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

        {/* Toggle */}
        {tab === 'paciente' && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 20 }}>
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              onClick={handleModeToggle}
              onPointerDown={e => { e.preventDefault(); handleModeToggle() }}
              style={{
                background: 'none', border: 'none',
                color: '#7EB8D4', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', padding: 0, userSelect: 'none',
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
