'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/app/actions/auth'
import { Eye, EyeOff, UserRound, Stethoscope, ArrowRight } from 'lucide-react'

// ── Shared ────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 9,
  fontSize: 14,
  color: '#F5F2EC',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-jakarta)',
}

function focusIn(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = '#7EB8D4'
  e.target.style.boxShadow = '0 0 0 3px rgba(126,184,212,0.1)'
}
function focusOut(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  e.target.style.boxShadow = 'none'
}

function Spinner() {
  return (
    <svg style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function MsgError({ text }: { text: string }) {
  return (
    <div style={{
      padding: '9px 12px', fontSize: 12, borderRadius: 8,
      backgroundColor: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.18)',
      color: '#fca5a5',
      fontFamily: 'var(--font-jakarta)',
    }}>
      {text}
    </div>
  )
}

function MsgSuccess({ text }: { text: string }) {
  return (
    <div style={{
      padding: '9px 12px', fontSize: 12, borderRadius: 8,
      backgroundColor: 'rgba(34,197,94,0.08)',
      border: '1px solid rgba(34,197,94,0.15)',
      color: '#86efac',
      fontFamily: 'var(--font-jakarta)',
    }}>
      {text}
    </div>
  )
}

// ── Patient Panel ─────────────────────────────────────────────

function PatientPanel() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lgpdAccepted, setLgpdAccepted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleModeToggle() {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError(''); setSuccessMsg('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccessMsg('')
    if (mode === 'signup' && !lgpdAccepted) {
      setError('Você precisa aceitar os termos de uso para se cadastrar.')
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
        if (r?.error) setError(r.error)
        else if (r?.redirectTo) router.push(r.redirectTo)
      }
    })
  }

  return (
    <div style={{
      flex: '1 1 0',
      padding: '44px 40px 40px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 11,
          backgroundColor: 'rgba(126,184,212,0.1)',
          border: '1px solid rgba(126,184,212,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
        }}>
          <UserRound size={18} color="#7EB8D4" />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 20, fontWeight: 600,
          color: '#F5F2EC',
          margin: '0 0 7px',
          letterSpacing: '-0.02em',
        }}>
          Área do Paciente
        </h2>
        <p style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 13, fontWeight: 300,
          color: 'rgba(255,255,255,0.38)',
          margin: 0, lineHeight: 1.6,
        }}>
          {mode === 'login'
            ? 'Acesse seus documentos e mensagens do consultório.'
            : 'Crie sua conta para acessar o portal do paciente.'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
        {mode === 'signup' && (
          <input
            name="full_name" type="text" placeholder="Nome completo"
            required autoComplete="name" style={inputBase}
            onFocus={focusIn} onBlur={focusOut}
          />
        )}

        <input
          name="email" type="email" placeholder="seu@email.com"
          required autoComplete="email" style={inputBase}
          onFocus={focusIn} onBlur={focusOut}
        />

        <div style={{ position: 'relative' }}>
          <input
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            required minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            style={{ ...inputBase, paddingRight: 44 }}
            onFocus={focusIn} onBlur={focusOut}
          />
          <button
            type="button" tabIndex={-1}
            onClick={() => setShowPass(s => !s)}
            style={{
              position: 'absolute', right: 12, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.22)', padding: 2,
            }}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {mode === 'signup' && (
          <div style={{
            display: 'flex', gap: 10, padding: '10px 12px',
            backgroundColor: 'rgba(126,184,212,0.05)',
            border: '1px solid rgba(126,184,212,0.14)',
            borderRadius: 8,
          }}>
            <input
              type="checkbox" id="lgpd-patient"
              checked={lgpdAccepted}
              onChange={e => setLgpdAccepted(e.target.checked)}
              style={{ marginTop: 2, width: 14, height: 14, accentColor: '#7EB8D4', flexShrink: 0, cursor: 'pointer' }}
            />
            <label htmlFor="lgpd-patient" style={{
              fontSize: 11, color: 'rgba(255,255,255,0.4)',
              lineHeight: 1.6, cursor: 'pointer',
              fontFamily: 'var(--font-jakarta)',
            }}>
              Li e aceito os{' '}
              <span style={{ color: '#7EB8D4' }}>Termos de Uso</span>
              {' '}e a{' '}
              <span style={{ color: '#7EB8D4' }}>Política de Privacidade</span>
              {' '}(LGPD — Lei nº 13.709/2018).
            </label>
          </div>
        )}

        {error && <MsgError text={error} />}
        {successMsg && <MsgSuccess text={successMsg} />}

        <button
          type="submit" disabled={isPending}
          style={{
            width: '100%', padding: '12px 16px',
            backgroundColor: '#7EB8D4',
            color: '#0C1017',
            fontFamily: 'var(--font-jakarta)',
            fontWeight: 600, fontSize: 14,
            border: 'none', borderRadius: 9,
            cursor: isPending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            opacity: isPending ? 0.65 : 1,
            transition: 'opacity .15s',
            marginTop: 4,
            letterSpacing: '-0.01em',
          }}
        >
          {isPending ? <Spinner /> : null}
          {mode === 'signup' ? 'Criar conta' : 'Entrar'}
          {!isPending && <ArrowRight size={14} />}
        </button>
      </form>

      {/* Toggle */}
      <p style={{
        textAlign: 'center', fontSize: 12,
        color: 'rgba(255,255,255,0.22)', marginTop: 18,
        fontFamily: 'var(--font-jakarta)',
      }}>
        {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
        <button
          type="button" onClick={handleModeToggle}
          style={{
            background: 'none', border: 'none',
            color: '#7EB8D4', fontWeight: 600, fontSize: 12,
            cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-jakarta)',
          }}
        >
          {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
        </button>
      </p>
    </div>
  )
}

// ── Medical Panel ─────────────────────────────────────────────

function MedicalPanel() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await login(fd)
      if (r?.error) setError(r.error)
      else if (r?.redirectTo) router.push(r.redirectTo)
    })
  }

  return (
    <div style={{
      flex: '1 1 0',
      padding: '44px 40px 40px',
      backgroundColor: 'rgba(0,0,0,0.18)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 11,
          backgroundColor: 'rgba(126,184,212,0.08)',
          border: '1px solid rgba(126,184,212,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
        }}>
          <Stethoscope size={18} color="#7EB8D4" />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 20, fontWeight: 600,
          color: '#F5F2EC',
          margin: '0 0 7px',
          letterSpacing: '-0.02em',
        }}>
          Área Médica
        </h2>
        <p style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 13, fontWeight: 300,
          color: 'rgba(255,255,255,0.38)',
          margin: 0, lineHeight: 1.6,
        }}>
          Painel clínico, prontuários e acompanhamento dos pacientes.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
        <input
          name="email" type="email" placeholder="medico@clinica.com"
          required autoComplete="email" style={inputBase}
          onFocus={focusIn} onBlur={focusOut}
        />

        <div style={{ position: 'relative' }}>
          <input
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            required minLength={6}
            autoComplete="current-password"
            style={{ ...inputBase, paddingRight: 44 }}
            onFocus={focusIn} onBlur={focusOut}
          />
          <button
            type="button" tabIndex={-1}
            onClick={() => setShowPass(s => !s)}
            style={{
              position: 'absolute', right: 12, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.22)', padding: 2,
            }}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {error && <MsgError text={error} />}

        <button
          type="submit" disabled={isPending}
          style={{
            width: '100%', padding: '12px 16px',
            backgroundColor: '#7EB8D4',
            color: '#0C1017',
            fontFamily: 'var(--font-jakarta)',
            fontWeight: 600, fontSize: 14,
            border: 'none', borderRadius: 9,
            cursor: isPending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            opacity: isPending ? 0.65 : 1,
            transition: 'opacity .15s',
            marginTop: 4,
            letterSpacing: '-0.01em',
          }}
        >
          {isPending ? <Spinner /> : null}
          Entrar
          {!isPending && <ArrowRight size={14} />}
        </button>
      </form>

      {/* Access note */}
      <div style={{
        marginTop: 22,
        padding: '10px 14px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          backgroundColor: '#4ade80',
          flexShrink: 0,
          boxShadow: '0 0 6px rgba(74,222,128,0.5)',
        }} />
        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: 0,
          fontFamily: 'var(--font-jakarta)',
          lineHeight: 1.5,
        }}>
          Acesso restrito — credenciais fornecidas pelo consultório
        </p>
      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────

export default function LoginSplit() {
  return (
    <div style={{
      width: '100%',
      maxWidth: 860,
      borderRadius: 20,
      overflow: 'hidden',
      display: 'flex',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(126,184,212,0.04)',
      backgroundColor: '#161C2C',
    }}>
      <PatientPanel />

      {/* Vertical divider */}
      <div style={{
        width: 1,
        flexShrink: 0,
        background: 'linear-gradient(to bottom, transparent 5%, rgba(126,184,212,0.1) 25%, rgba(126,184,212,0.1) 75%, transparent 95%)',
      }} />

      <MedicalPanel />
    </div>
  )
}
