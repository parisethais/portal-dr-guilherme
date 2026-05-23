'use client'

/**
 * MemedPrescricao
 *
 * Integra o widget Memed Sinapse Prescrição no prontuário.
 * Carrega o SDK dinamicamente via <script>, inicializa com o token do médico
 * e dados do paciente, e abre o modal de prescrição.
 *
 * Uso:
 *   <MemedPrescricao
 *     patientName="Nome Completo"
 *     patientPhone="11999999999"
 *     patientBirthday="1980-05-10"
 *     patientGender="F"
 *   />
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Pill, Loader2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tipos do SDK Memed ────────────────────────────────────────────────────────

declare global {
  interface Window {
    MdSinapsePrescricao?: {
      setToken: (token: string) => void
      setPatient: (patient: MemedPatient) => void
      event: {
        add:    (event: string, cb: (arg?: unknown) => void) => void
        remove: (event: string, cb: (arg?: unknown) => void) => void
      }
    }
  }
}

interface MemedPatient {
  name:     string
  phone?:   string | null
  birthday?: string | null   // YYYY-MM-DD
  gender?:  'M' | 'F' | null
  weight?:  number | null
  height?:  number | null
}

export interface MemedPrescricaoProps {
  patientName:     string
  patientPhone?:   string | null
  patientBirthday?: string | null
  patientGender?:  'M' | 'F' | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEMED_SCRIPT_ID = 'memed-sinapse-sdk'

function getScriptUrl() {
  const apiKey = process.env.NEXT_PUBLIC_MEMED_API_KEY
  if (!apiKey) return null
  return `https://memed.com.br/modulos/plataforma.sinapse-care/build/sinapse-care.min.js?apiKey=${apiKey}`
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function MemedPrescricao({
  patientName,
  patientPhone,
  patientBirthday,
  patientGender,
}: MemedPrescricaoProps) {
  const [state,   setState]   = useState<'idle' | 'loading' | 'ready' | 'open' | 'error'>('idle')
  const [errorMsg, setError]  = useState('')
  const initDone = useRef(false)

  // ── Inicializa o SDK ───────────────────────────────────────────────────────

  const initMemed = useCallback(async () => {
    if (initDone.current) {
      // SDK já carregado — só abre o widget
      openWidget()
      return
    }

    setState('loading')
    setError('')

    // 1. Busca token do médico
    let token: string
    try {
      const res = await fetch('/api/memed/token')
      const json = await res.json()
      if (!res.ok || !json.token) {
        setError(json.error ?? 'Erro ao autenticar com a Memed.')
        setState('error')
        return
      }
      token = json.token
    } catch {
      setError('Falha de rede ao buscar token Memed.')
      setState('error')
      return
    }

    // 2. Carrega o script do SDK (se ainda não carregado)
    const scriptUrl = getScriptUrl()
    if (!scriptUrl) {
      setError('NEXT_PUBLIC_MEMED_API_KEY não configurada.')
      setState('error')
      return
    }

    await new Promise<void>((resolve, reject) => {
      if (document.getElementById(MEMED_SCRIPT_ID)) { resolve(); return }
      const script    = document.createElement('script')
      script.id       = MEMED_SCRIPT_ID
      script.src      = scriptUrl
      script.async    = true
      script.onload   = () => resolve()
      script.onerror  = () => reject(new Error('Falha ao carregar SDK Memed'))
      document.head.appendChild(script)
    }).catch(err => {
      setError(err.message)
      setState('error')
      return
    })

    if (state === 'error') return

    // 3. Aguarda SDK ficar disponível (máx 10s)
    const sdk = await waitForSdk()
    if (!sdk) {
      setError('SDK Memed não inicializou. Tente recarregar a página.')
      setState('error')
      return
    }

    // 4. Define token e paciente
    sdk.setToken(token)
    sdk.setPatient({
      name:     patientName,
      phone:    patientPhone  ?? undefined,
      birthday: patientBirthday ?? undefined,
      gender:   patientGender ?? undefined,
    })

    // 5. Aguarda módulo de prescrição ficar pronto e abre
    sdk.event.add('core:moduleInit', (module: unknown) => {
      const mod = module as { name: string; show: () => void } | undefined
      if (mod?.name === 'plataforma.prescricao') {
        initDone.current = true
        setState('open')
        mod.show()
      }
    })

  }, [patientName, patientPhone, patientBirthday, patientGender, state])

  // ── Abre widget (SDK já inicializado) ──────────────────────────────────────

  function openWidget() {
    setState('open')
    // O SDK mantém o estado — re-show dispara o modal novamente
    window.MdSinapsePrescricao?.event.add('core:moduleInit', (module: unknown) => {
      const mod = module as { name: string; show: () => void } | undefined
      if (mod?.name === 'plataforma.prescricao') mod?.show()
    })
  }

  // ── Utilitário: espera SDK ────────────────────────────────────────────────

  function waitForSdk(maxMs = 10_000): Promise<typeof window.MdSinapsePrescricao | null> {
    return new Promise(resolve => {
      const start = Date.now()
      const check = () => {
        if (window.MdSinapsePrescricao) { resolve(window.MdSinapsePrescricao); return }
        if (Date.now() - start > maxMs)  { resolve(null); return }
        setTimeout(check, 200)
      }
      check()
    })
  }

  // ── Limpa estado quando widget fecha ──────────────────────────────────────

  useEffect(() => {
    if (state !== 'open') return
    const sdk = window.MdSinapsePrescricao
    if (!sdk) return

    const onClose = () => setState('ready')
    sdk.event.add('core:moduleHide', onClose)
    return () => { sdk.event.remove('core:moduleHide', onClose) }
  }, [state])

  // ── Render ────────────────────────────────────────────────────────────────

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 max-w-sm">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1">{errorMsg}</span>
        <button onClick={() => setState('idle')} className="text-red-400 hover:text-red-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={initMemed}
      disabled={state === 'loading'}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
        state === 'loading'
          ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
          : 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10',
      )}
    >
      {state === 'loading'
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Pill className="w-3.5 h-3.5" />}
      {state === 'loading' ? 'Abrindo Memed…' : 'Prescrição Memed'}
    </button>
  )
}
