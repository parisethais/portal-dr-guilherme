'use client'

import { useEffect, useRef, useState } from 'react'
import { saveMedPrescricao, deleteMedPrescricao } from '@/app/actions/memed'
import { Loader2, AlertCircle } from 'lucide-react'

declare global {
  interface Window {
    MdSinapsePrescricao?: {
      event: { add: (event: string, cb: (arg?: unknown) => void) => void }
    }
    MdHub?: {
      command: { send: (module: string, command: string, data?: unknown) => Promise<void> }
      module:  { show: (module: string) => void; hide: (module: string) => void }
      event:   { add: (event: string, cb: (arg?: unknown) => void) => void }
    }
  }
}

interface Props {
  patientId:        string
  consultaId?:      string | null
  patientName:      string
  patientCpf?:      string | null
  patientPhone?:    string | null
  patientBirthday?: string | null
  patientGender?:   'M' | 'F' | null
}

const SCRIPT_URL =
  process.env.NEXT_PUBLIC_MEMED_SCRIPT_URL ??
  'https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js'

export default function MemedPopup({
  patientId, consultaId, patientName, patientCpf, patientPhone, patientBirthday, patientGender,
}: Props) {
  const [status,   setStatus]  = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setError]   = useState('')
  const done = useRef(false)

  // Garante min-height e impede o SDK Memed de setar overflow:hidden no body.
  // No Safari, overflow:hidden no body bloqueia TODO scroll incluindo elementos fixed.
  useEffect(() => {
    document.documentElement.style.height = '100%'
    document.body.style.minHeight = '100vh'
    document.body.style.overflow  = 'auto'

    const preventOverflowLock = () => {
      if (document.body.style.overflow === 'hidden') document.body.style.overflow = 'auto'
      if (document.documentElement.style.overflow === 'hidden') document.documentElement.style.overflow = 'auto'
    }

    const obs = new MutationObserver(preventOverflowLock)
    obs.observe(document.body,            { attributes: true, attributeFilter: ['style'] })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    return () => { obs.disconnect(); document.body.style.minHeight = ''; document.documentElement.style.height = '' }
  }, [])

  useEffect(() => {
    if (done.current) return
    done.current = true

    ;(async () => {
      // 1. Fetch token
      let token: string
      try {
        const res  = await fetch('/api/memed/token')
        const json = await res.json()
        if (!res.ok || !json.token) { setError(json.error ?? 'Erro ao autenticar com a Memed.'); setStatus('error'); return }
        token = json.token
      } catch { setError('Falha de rede ao buscar token.'); setStatus('error'); return }

      // 2. Create listener before loading script
      const onModuleInit = async (module: unknown) => {
        const mod = module as { name: string } | undefined
        if (mod?.name !== 'plataforma.prescricao') return

        try {
          await window.MdHub!.command.send('plataforma.prescricao', 'setPaciente', {
            idExterno:       patientId,
            nome:            patientName,
            cpf:             patientCpf ? patientCpf.replace(/\D/g, '') : undefined,
            sexo:            patientGender === 'F' ? 'Feminino' : patientGender === 'M' ? 'Masculino' : undefined,
            telefone:        patientPhone ?? undefined,
            data_nascimento: patientBirthday ? patientBirthday.split('-').reverse().join('/') : undefined,
          })

          window.MdHub!.event.add('prescricaoImpressa', async (data: unknown) => {
            const p = data as { prescricao: { id: string; prescriptionUuid: string; data: string; horario: string; medicamentos: unknown[]; documents: unknown[] }; reimpressao: boolean; alterada: boolean }
            saveMedPrescricao({
              consultaId:        consultaId ?? null,
              patientId,
              memedPrescricaoId: p.prescricao.id,
              prescricaoUuid:    p.prescricao.prescriptionUuid,
              dataPrescricao:    p.prescricao.data,
              reimpressao:       p.reimpressao,
              alterada:          p.alterada,
              medicamentosJson:  JSON.stringify(p.prescricao.medicamentos ?? []),
              documentsJson:     JSON.stringify(p.prescricao.documents    ?? []),
            }).catch(console.error)
          })

          window.MdHub!.event.add('prescricaoExcluida', async (id: unknown) => {
            deleteMedPrescricao({ memedPrescricaoId: String(id), patientId }).catch(console.error)
          })

          window.MdHub!.module.show('plataforma.prescricao')
          setStatus('ready')

          // Fix: o SDK Memed coloca overflow:hidden nos containers dele.
          // Varremos o DOM e liberamos scroll em tudo que transborda.
          const fixScroll = () => {
            document.querySelectorAll<HTMLElement>('*').forEach(el => {
              const s = window.getComputedStyle(el)
              const overflowHidden = s.overflow === 'hidden' || s.overflowY === 'hidden'
              if (overflowHidden && el.scrollHeight > el.clientHeight + 4) {
                el.style.setProperty('overflow-y', 'auto', 'important')
              }
              if (overflowHidden && el.scrollWidth > el.clientWidth + 4) {
                el.style.setProperty('overflow-x', 'auto', 'important')
              }
            })
          }
          // Tenta após render inicial e novamente depois de possível lazy-render
          setTimeout(fixScroll, 200)
          setTimeout(fixScroll, 800)
          setTimeout(fixScroll, 2000)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao configurar Memed.')
          setStatus('error')
        }
      }

      // 3. Inject script
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.setAttribute('data-token', token)
      script.async = false
      script.onload = () => {
        if (window.MdSinapsePrescricao) {
          window.MdSinapsePrescricao.event.add('core:moduleInit', onModuleInit)
        } else {
          let tries = 0
          const wait = setInterval(() => {
            if (window.MdSinapsePrescricao) {
              clearInterval(wait)
              window.MdSinapsePrescricao.event.add('core:moduleInit', onModuleInit)
            } else if (++tries >= 100) {
              clearInterval(wait)
              setError('SDK Memed não inicializou. Verifique CPF e CRM em Configurações.')
              setStatus('error')
            }
          }, 50)
        }
      }
      script.onerror = () => { setError('Falha ao carregar script Memed.'); setStatus('error') }
      document.head.appendChild(script)

      // 30s timeout
      setTimeout(() => {
        if (status !== 'error') {
          setError('Memed não respondeu em 30s. Possível ambiente staging offline.')
          setStatus('error')
        }
      }, 30_000)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <AlertCircle style={{ width: 40, height: 40, color: '#ef4444', margin: '0 auto 12px' }} />
          <p style={{ color: '#dc2626', fontSize: 14 }}>{errorMsg}</p>
          <button
            onClick={() => window.close()}
            style={{ marginTop: 16, padding: '8px 20px', background: '#1A1F2E', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 10, fontFamily: 'system-ui, sans-serif', color: '#6b7280', fontSize: 14 }}>
        <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
        Carregando Memed…
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return null
}
