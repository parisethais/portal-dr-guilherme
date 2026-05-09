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
    setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setSuccessMsg('')
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
        if (r?.error)      setError(r.error)
        else if (r?.redirectTo) router.push(r.redirectTo)
      }
    })
  }

  /* ── Helpers de estilo ────────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    backgroundColor: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 8,
    fontSize: 14,
    color: '#1A1F2E',
    outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: '0.01em',
  }

  return (
    <div>
      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 0 }}>
        {([
          { id: 'paciente' as Tab, label: 'Área do Paciente', icon: <UserRound  size={14} /> },
          { id: 'medico'   as Tab, label: 'Área Médica',      icon: <Stethoscope size={14} /> },
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
                padding: '10px 0 12px',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#1A1F2E' : '#94a3b8',
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

      {/* ── Título ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1F2E', margin: '0 0 6px' }}>
          {tab === 'paciente' ? 'Bom dia, paciente' : 'Acesso restrito'}
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          {tab === 'paciente' && mode === 'login'  && 'Entre para ver seus documentos e mensagens.'}
          {tab === 'paciente' && mode === 'signup' && 'Crie sua conta para acessar o portal.'}
          {tab === 'medico'                        && 'Acesso exclusivo para a equipe médica.'}
        </p>
      </div>

      {/* ── Form ──────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {mode === 'signup' && (
          <div>
            <label htmlFor="full_name" style={labelStyle}>Nome completo *</label>
            <input id="full_name" name="full_name" type="text" placeholder="Seu nome completo"
              required autoComplete="name" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#7EB8D4'; e.target.style.boxShadow = '0 0 0 3px rgba(126,184,212,.15)' }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,.1)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" style={labelStyle}>E-mail *</label>
          <input id="email" name="email" type="email" placeholder="seu@email.com"
            required autoComplete="email" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#7EB8D4'; e.target.style.boxShadow = '0 0 0 3px rgba(126,184,212,.15)' }}
            onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,.1)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        <div>
          <label htmlFor="password" style={labelStyle}>Senha *</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password" name="password" type={showPass ? 'text' : 'password'}
              placeholder="••••••••" required minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              style={{ ...inputStyle, paddingRight: 44 }}
              onFocus={e => { e.target.style.borderColor = '#7EB8D4'; e.target.style.boxShadow = '0 0 0 3px rgba(126,184,212,.15)' }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,.1)'; e.target.style.boxShadow = 'none' }}
            />
            <button
              type="button" tabIndex={-1}
              onClick={() => setShowPass(s => !s)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2,
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* LGPD */}
        {tab === 'paciente' && mode === 'signup' && (
          <div style={{
            display: 'flex', gap: 10, padding: '12px 14px',
            backgroundColor: 'rgba(126,184,212,0.08)',
            border: '1px solid rgba(126,184,212,0.25)',
            borderRadius: 8,
          }}>
            <input
              type="checkbox" id="lgpd" checked={lgpdAccepted}
              onChange={e => setLgpdAccepted(e.target.checked)}
              style={{ marginTop: 2, width: 14, height: 14, accentColor: '#7EB8D4', flexShrink: 0, cursor: 'pointer' }}
            />
            <label htmlFor="lgpd" style={{ fontSize: 12, color: '#475569', lineHeight: 1.55, cursor: 'pointer' }}>
              Li e aceito os{' '}
              <span style={{ color: '#7EB8D4', fontWeight: 500 }}>Termos de Uso</span>
              {' '}e a{' '}
              <span style={{ color: '#7EB8D4', fontWeight: 500 }}>Política de Privacidade</span>
              {' '}em conformidade com a{' '}
              <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
              {' '}Autorizo o tratamento dos meus dados pessoais de saúde para fins de atendimento médico.
            </label>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div style={{
            padding: '10px 14px', fontSize: 13, borderRadius: 8,
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* Sucesso */}
        {successMsg && (
          <div style={{
            padding: '10px 14px', fontSize: 13, borderRadius: 8,
            backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
          }}>
            {successMsg}
          </div>
        )}

        {/* Botão */}
        <button
          type="submit" disabled={isPending}
          style={{
            width: '100%', padding: '13px',
            backgroundColor: isPending ? 'rgba(26,31,46,0.6)' : '#1A1F2E',
            color: '#F5F2EC',
            fontWeight: 600, fontSize: 14,
            border: 'none', borderRadius: 8,
            cursor: isPending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity .15s',
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
        <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 20 }}>
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
  )
}
