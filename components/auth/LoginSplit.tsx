'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/app/actions/auth'
import { Eye, EyeOff, UserRound, Stethoscope, ArrowRight } from 'lucide-react'

// ── Paleta MedEn ──────────────────────────────────────────────
// #2D2B6B  índigo         → headings, botões
// #7A9E7E  sage           → acentos, aba ativa, ícones, focus
// #F5F0E8  warm bone      → painel esquerdo / fundo
// #F2F4F8  ice            → inputs de fundo

type Tab = 'paciente' | 'medico'

// ── Helpers compartilhados ────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  backgroundColor: '#F2F4F8',
  border: '1px solid rgba(45,43,107,0.12)',
  borderRadius: 9,
  fontSize: 14,
  color: '#2D2B6B',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s, background-color .15s',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-jakarta)',
}

function focusIn(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = '#7A9E7E'
  e.target.style.boxShadow = '0 0 0 3px rgba(122,158,126,0.18)'
  e.target.style.backgroundColor = '#FFFFFF'
}
function focusOut(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'rgba(45,43,107,0.12)'
  e.target.style.boxShadow = 'none'
  e.target.style.backgroundColor = '#F2F4F8'
}

function Spinner() {
  return (
    <svg style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle style={{ opacity: 0.3 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function MsgError({ text }: { text: string }) {
  return (
    <div style={{
      padding: '9px 12px', fontSize: 12, borderRadius: 8,
      backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
      fontFamily: 'var(--font-jakarta)',
    }}>{text}</div>
  )
}

function MsgSuccess({ text }: { text: string }) {
  return (
    <div style={{
      padding: '9px 12px', fontSize: 12, borderRadius: 8,
      backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534',
      fontFamily: 'var(--font-jakarta)',
    }}>{text}</div>
  )
}

const btnSubmit: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  backgroundColor: '#2D2B6B',
  color: '#FFFFFF',
  fontFamily: 'var(--font-jakarta)',
  fontWeight: 600, fontSize: 14,
  border: 'none', borderRadius: 9,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  letterSpacing: '-0.01em',
  transition: 'opacity .15s',
  marginTop: 4,
}

// ── Painel esquerdo — branding ────────────────────────────────

function BrandPanel() {
  return (
    <div style={{
      width: 360,
      flexShrink: 0,
      backgroundColor: '#F5F0E8',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '36px 28px 36px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Glow sutil canto inferior-direito */}
      <div style={{
        position: 'absolute',
        bottom: -80, right: -80,
        width: 260, height: 260,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(122,158,126,0.15) 0%, transparent 68%)',
        pointerEvents: 'none',
      }} />

      {/* ZONA 1 — identificador do sistema (topo) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          backgroundColor: '#7A9E7E',
          boxShadow: '0 0 0 2px rgba(122,158,126,0.28)',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 10, fontWeight: 600,
          letterSpacing: '0.16em',
          color: 'rgba(45,43,107,0.38)',
          textTransform: 'uppercase',
        }}>
          Portal de Saúde
        </span>
      </div>

      {/* ZONAS 2+3 agrupadas na base — logo ancorado com consultório */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Logotipo MedEn */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{
            fontFamily: 'var(--font-archivo)',
            fontSize: 40,
            fontWeight: 800,
            color: '#2D2B6B',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>Med</span>
          <span style={{
            fontFamily: 'var(--font-archivo)',
            fontSize: 40,
            fontWeight: 800,
            color: '#7A9E7E',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>E</span>
          <span style={{
            fontFamily: 'var(--font-archivo)',
            fontSize: 40,
            fontWeight: 800,
            color: '#2D2B6B',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>n</span>
        </div>

        {/* Consultório */}
        <div>
          <div style={{
            width: 28, height: 2,
            backgroundColor: '#7A9E7E',
            borderRadius: 2,
            marginBottom: 12,
            opacity: 0.7,
          }} />
          <p style={{
            fontFamily: 'var(--font-jakarta)',
            fontSize: 10, fontWeight: 600,
            letterSpacing: '0.13em',
            color: 'rgba(45,43,107,0.38)',
            textTransform: 'uppercase',
            margin: '0 0 5px',
          }}>
            Consultório
          </p>
          <p style={{
            fontFamily: 'var(--font-jakarta)',
            fontSize: 16, fontWeight: 600,
            color: '#2D2B6B',
            margin: 0,
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
          }}>
            Dr. Guilherme<br />Santa Catharina
          </p>
        </div>

      </div>
    </div>
  )
}

// ── Formulário de paciente ────────────────────────────────────

function PatientForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lgpdAccepted, setLgpdAccepted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleMode() {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError(''); setSuccessMsg('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccessMsg('')
    if (mode === 'signup' && !lgpdAccepted) {
      setError('Aceite os termos de uso para continuar.')
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ marginBottom: 6 }}>
        <p style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 13, fontWeight: 400,
          color: 'rgba(45,43,107,0.48)',
          margin: 0,
        }}>
          {mode === 'login' ? 'Acesse seus documentos e mensagens.' : 'Crie sua conta para acessar o portal.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'signup' && (
          <input name="full_name" type="text" placeholder="Nome completo"
            required autoComplete="name" style={inputBase}
            onFocus={focusIn} onBlur={focusOut} />
        )}
        <input name="email" type="email" placeholder="seu@email.com"
          required autoComplete="email" style={inputBase}
          onFocus={focusIn} onBlur={focusOut} />

        <div style={{ position: 'relative' }}>
          <input name="password" type={showPass ? 'text' : 'password'}
            placeholder="••••••••" required minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            style={{ ...inputBase, paddingRight: 44 }}
            onFocus={focusIn} onBlur={focusOut} />
          <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(45,43,107,0.32)', padding: 2 }}>
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {mode === 'signup' && (
          <div style={{
            display: 'flex', gap: 9, padding: '10px 12px',
            backgroundColor: 'rgba(122,158,126,0.07)',
            border: '1px solid rgba(122,158,126,0.22)',
            borderRadius: 8,
          }}>
            <input type="checkbox" id="lgpd-chk" checked={lgpdAccepted}
              onChange={e => setLgpdAccepted(e.target.checked)}
              style={{ marginTop: 2, width: 14, height: 14, accentColor: '#7A9E7E', flexShrink: 0, cursor: 'pointer' }} />
            <label htmlFor="lgpd-chk" style={{ fontSize: 11, color: 'rgba(45,43,107,0.5)', lineHeight: 1.55, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
              Li e aceito os{' '}
              <span style={{ color: '#4E7A52', fontWeight: 500 }}>Termos de Uso</span>
              {' '}e a{' '}
              <span style={{ color: '#4E7A52', fontWeight: 500 }}>Política de Privacidade</span>
              {' '}(LGPD — Lei nº 13.709/2018).
            </label>
          </div>
        )}

        {error && <MsgError text={error} />}
        {successMsg && <MsgSuccess text={successMsg} />}

        <button type="submit" disabled={isPending}
          style={{ ...btnSubmit, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.65 : 1 }}>
          {isPending ? <Spinner /> : null}
          {mode === 'signup' ? 'Criar conta' : 'Entrar'}
          {!isPending && <ArrowRight size={14} />}
        </button>
      </form>

      <p style={{
        textAlign: 'center', fontSize: 12,
        color: 'rgba(45,43,107,0.35)', marginTop: 4,
        fontFamily: 'var(--font-jakarta)',
      }}>
        {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
        <button type="button" onClick={toggleMode}
          style={{ background: 'none', border: 'none', color: '#4E7A52', fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-jakarta)' }}>
          {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
        </button>
      </p>
    </div>
  )
}

// ── Formulário médico ─────────────────────────────────────────

function MedicalForm() {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ marginBottom: 6 }}>
        <p style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 13, fontWeight: 400,
          color: 'rgba(45,43,107,0.48)',
          margin: 0,
        }}>
          Painel clínico, prontuários e acompanhamento dos pacientes.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input name="email" type="email" placeholder="medico@clinica.com"
          required autoComplete="email" style={inputBase}
          onFocus={focusIn} onBlur={focusOut} />

        <div style={{ position: 'relative' }}>
          <input name="password" type={showPass ? 'text' : 'password'}
            placeholder="••••••••" required minLength={6}
            autoComplete="current-password"
            style={{ ...inputBase, paddingRight: 44 }}
            onFocus={focusIn} onBlur={focusOut} />
          <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(45,43,107,0.32)', padding: 2 }}>
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {error && <MsgError text={error} />}

        <button type="submit" disabled={isPending}
          style={{ ...btnSubmit, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.65 : 1 }}>
          {isPending ? <Spinner /> : null}
          Entrar
          {!isPending && <ArrowRight size={14} />}
        </button>
      </form>

      <div style={{
        marginTop: 8,
        padding: '9px 13px',
        backgroundColor: 'rgba(45,43,107,0.04)',
        border: '1px solid rgba(45,43,107,0.08)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          backgroundColor: '#22C55E', flexShrink: 0,
          boxShadow: '0 0 5px rgba(34,197,94,0.5)',
        }} />
        <p style={{
          fontSize: 11, color: 'rgba(45,43,107,0.42)', margin: 0,
          fontFamily: 'var(--font-jakarta)', lineHeight: 1.5,
        }}>
          Acesso restrito — credenciais fornecidas pelo consultório
        </p>
      </div>
    </div>
  )
}

// ── Painel direito — abas + formulário ────────────────────────

function FormPanel() {
  const [tab, setTab] = useState<Tab>('paciente')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'paciente', label: 'Área do Paciente', icon: <UserRound   size={13} /> },
    { id: 'medico',   label: 'Área Médica',      icon: <Stethoscope size={13} /> },
  ]

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(45,43,107,0.07)',
      }}>
        {tabs.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              onPointerDown={e => { e.preventDefault(); setTab(t.id) }}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '14px 0 15px',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-jakarta)',
                color: active ? '#2D2B6B' : 'rgba(45,43,107,0.38)',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #7A9E7E' : '2px solid transparent',
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

      {/* Conteúdo do formulário */}
      <div style={{ padding: '28px 36px 32px', flex: 1 }}>

        {/* Heading da aba */}
        <h2 style={{
          fontFamily: 'var(--font-archivo)',
          fontSize: 20, fontWeight: 700, color: '#2D2B6B',
          margin: '0 0 16px', letterSpacing: '-0.02em',
        }}>
          {tab === 'paciente' ? 'Área do Paciente' : 'Área Médica'}
        </h2>

        {tab === 'paciente' ? <PatientForm /> : <MedicalForm />}
      </div>
    </div>
  )
}

// ── Export principal ──────────────────────────────────────────

export default function LoginSplit() {
  return (
    <div style={{
      width: '100%',
      maxWidth: 900,
      borderRadius: 18,
      overflow: 'hidden',
      display: 'flex',
      border: '1px solid rgba(45,43,107,0.1)',
      boxShadow: '0 4px 36px rgba(45,43,107,0.12), 0 1px 4px rgba(45,43,107,0.06)',
    }}>
      <BrandPanel />

      {/* Divisória vertical */}
      <div style={{
        width: 1, flexShrink: 0,
        background: 'linear-gradient(to bottom, transparent 5%, rgba(45,43,107,0.08) 20%, rgba(45,43,107,0.08) 80%, transparent 95%)',
      }} />

      <FormPanel />
    </div>
  )
}
