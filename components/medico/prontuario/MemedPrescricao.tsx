'use client'

/**
 * MemedPrescricao
 *
 * Integra o widget Memed Sinapse Prescrição no prontuário.
 *
 * Implementa todos os requisitos obrigatórios da Memed:
 *   1. Cadastro do prescritor validado (CPF obrigatório no token endpoint)
 *   2. Credenciais server-side (MEMED_PARTNER_KEY nunca exposta ao browser)
 *   3. setFeatureToggle configurado
 *   4. Eventos prescricaoImpressa e prescricaoExcluida implementados
 */

import { useState, useCallback, useRef } from 'react'
import { Pill, Loader2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveMedPrescricao, deleteMedPrescricao } from '@/app/actions/memed'

// ── Tipos do SDK Memed ────────────────────────────────────────────────────────

declare global {
  interface Window {
    MdSinapsePrescricao?: {
      event: {
        add:    (event: string, cb: (arg?: unknown) => void) => void
        remove: (event: string, cb: (arg?: unknown) => void) => void
      }
    }
    MdHub?: {
      command: {
        send: (module: string, command: string, data?: unknown) => Promise<void>
      }
      event: {
        add:    (event: string, cb: (arg?: unknown) => void) => void
        remove: (event: string, cb: (arg?: unknown) => void) => void
      }
    }
  }
}

export interface MemedPrescricaoProps {
  // Identificação
  patientId:       string           // idExterno (obrigatório pela Memed)
  consultaId?:     string | null    // para vincular prescrição à consulta

  // Dados do paciente (campos Memed)
  patientName:     string
  patientPhone?:   string | null
  patientBirthday?: string | null   // YYYY-MM-DD
  patientGender?:  'M' | 'F' | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEMED_SCRIPT_ID = 'memed-sinapse-sdk'

function getScriptUrl(): string {
  // NEXT_PUBLIC_MEMED_SCRIPT_URL permite alternar entre staging e produção
  // Staging:  https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js
  // Produção: https://partners.memed.com.br/integration.js
  return (
    process.env.NEXT_PUBLIC_MEMED_SCRIPT_URL ??
    'https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js'
  )
}

function waitForSdk(maxMs = 10_000): Promise<boolean> {
  return new Promise(resolve => {
    const start = Date.now()
    const check = () => {
      if (window.MdHub && window.MdSinapsePrescricao) { resolve(true); return }
      if (Date.now() - start > maxMs) { resolve(false); return }
      setTimeout(check, 200)
    }
    check()
  })
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function MemedPrescricao({
  patientId,
  consultaId,
  patientName,
  patientPhone,
  patientBirthday,
  patientGender,
}: MemedPrescricaoProps) {
  const [state,    setState]  = useState<'idle' | 'loading' | 'ready' | 'open' | 'error'>('idle')
  const [errorMsg, setError]  = useState('')
  const initDone = useRef(false)

  // ── Inicializa o SDK ───────────────────────────────────────────────────────

  const initMemed = useCallback(async () => {
    if (initDone.current) {
      // SDK já carregado — só reabre o widget
      await window.MdHub?.command.send('plataforma.prescricao', 'show')
      setState('open')
      return
    }

    setState('loading')
    setError('')

    // 1. Busca token do médico (server-side — PARTNER_KEY nunca vai ao browser)
    let token: string
    try {
      const res  = await fetch('/api/memed/token')
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

    // 2. Carrega o script do SDK com o token como atributo (conforme docs Memed)
    const scriptUrl = getScriptUrl()

    try {
      await new Promise<void>((resolve, reject) => {
        if (document.getElementById(MEMED_SCRIPT_ID)) { resolve(); return }
        const script      = document.createElement('script')
        script.id         = MEMED_SCRIPT_ID
        script.src        = scriptUrl
        script.setAttribute('token', token)  // token no atributo conforme docs Memed
        script.async      = true
        script.onload     = () => resolve()
        script.onerror    = () => reject(new Error('Falha ao carregar SDK Memed'))
        document.head.appendChild(script)
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar SDK')
      setState('error')
      return
    }

    // 3. Aguarda MdHub e MdSinapsePrescricao ficarem disponíveis (máx 10s)
    const ready = await waitForSdk()
    if (!ready) {
      setError('SDK Memed não inicializou. Tente recarregar a página.')
      setState('error')
      return
    }

    // 4. Registra eventos DENTRO do core:moduleInit (obrigatório pela Memed)
    window.MdSinapsePrescricao!.event.add('core:moduleInit', async (module: unknown) => {
      const mod = module as { name: string } | undefined
      if (mod?.name !== 'plataforma.prescricao') return

      // 4a. setFeatureToggle — configura funcionalidades habilitadas
      await window.MdHub?.command.send('plataforma.prescricao', 'setFeatureToggle', {
        deletePatient:                false,  // não permitir excluir paciente da base Memed
        removePatient:                false,  // não remover paciente da prescrição
        editPatient:                  false,  // dados do paciente gerenciados pelo nosso sistema
        historyPrescription:          true,   // histórico de prescrições visível
        removePrescription:           true,   // médico pode excluir prescrição
        forceSign:                    false,  // assinatura digital opcional
        allowShareModal:              true,   // compartilhamento WhatsApp/SMS
        setPatientAllergy:            true,   // registrar alergias
        autocompleteManipulated:      true,   // fórmulas manipuladas
        autocompleteCompositions:     true,   // nomes genéricos
        autocompletePheripherals:     true,   // produtos periféricos
        copyMedicalRecords:           true,
        buttonClose:                  true,
        newFormula:                   true,
        guidesOnboarding:             true,
        conclusionModalEdit:          true,
        showProtocol:                 true,
        showHelpMenu:                 true,
        editIdentification:           true,
        addPrescriptionDrug:          true,
        removePrescriptionDrug:       true,
        editPrescriptionDrugTitle:    true,
        editPosology:                 true,
        editQuantity:                 true,
        enableAlerts:                 true,
        setAllowedSignatureProviders: ['vidaas', 'certisign', 'soluti'],
      })

      // 4b. setPaciente — campos obrigatórios: idExterno, nome, sexo
      await window.MdHub?.command.send('plataforma.prescricao', 'setPaciente', {
        idExterno: patientId,
        nome:      patientName,
        sexo:      patientGender === 'F' ? 'Feminino'
                 : patientGender === 'M' ? 'Masculino'
                 : undefined,
        telefone:        patientPhone ?? undefined,
        // Memed exige dd/mm/YYYY; nossa base armazena YYYY-MM-DD
        data_nascimento: patientBirthday
          ? patientBirthday.split('-').reverse().join('/')   // YYYY-MM-DD → DD/MM/YYYY
          : undefined,
      })

      // 4c. prescricaoImpressa — OBRIGATÓRIO: captura e persiste cada prescrição emitida
      window.MdHub?.event.add('prescricaoImpressa', async (data: unknown) => {
        const prescricao = data as {
          prescricao: {
            id:               string
            prescriptionUuid: string
            data:             string
            horario:          string
            medicamentos:     unknown[]
            documents:        unknown[]
            medicos_id:       string
            nome_medico:      string
          }
          reimpressao: boolean
          alterada:    boolean
        }

        // Persiste a prescrição no banco (fire-and-forget — não bloqueia o médico)
        saveMedPrescricao({
          consultaId:        consultaId ?? null,
          patientId,
          memedPrescricaoId: prescricao.prescricao.id,
          prescricaoUuid:    prescricao.prescricao.prescriptionUuid,
          dataPrescricao:    prescricao.prescricao.data,
          reimpressao:       prescricao.reimpressao,
          alterada:          prescricao.alterada,
          medicamentosJson:  JSON.stringify(prescricao.prescricao.medicamentos ?? []),
          documentsJson:     JSON.stringify(prescricao.prescricao.documents    ?? []),
        }).catch(err => console.error('[memed] Erro ao salvar prescricaoImpressa:', err))
      })

      // 4d. prescricaoExcluida — OBRIGATÓRIO: registra exclusão da prescrição
      window.MdHub?.event.add('prescricaoExcluida', async (prescriptionId: unknown) => {
        deleteMedPrescricao({
          memedPrescricaoId: String(prescriptionId),
          patientId,
        }).catch(err => console.error('[memed] Erro ao registrar prescricaoExcluida:', err))
      })

      // 4e. Fecha o widget quando médico clica em fechar
      window.MdHub?.event.add('core:moduleHide', () => setState('ready'))

      initDone.current = true
      setState('open')
    })

  }, [patientId, consultaId, patientName, patientPhone, patientBirthday, patientGender])

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
        : <Pill    className="w-3.5 h-3.5" />}
      {state === 'loading' ? 'Abrindo Memed…' : 'Prescrição Memed'}
    </button>
  )
}
