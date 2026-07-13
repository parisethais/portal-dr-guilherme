'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck, X, Smartphone, ExternalLink, Download } from 'lucide-react'

type AssinaturaType = 'prontuario' | 'prescricao'

interface Props {
  consultaId?:  string   // prontuário
  patientId?:   string   // prescrição
  tipo?:        AssinaturaType
  onClose:      () => void
  onSuccess:    (pdfUrl: string, assinaturaUrl: string) => void
}

export default function AssinaturaModal({ consultaId, patientId, tipo = 'prontuario', onClose, onSuccess }: Props) {
  const [otp,      setOtp]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const isPrescricao = tipo === 'prescricao'
  const titulo       = isPrescricao ? 'Assinar prescrição' : 'Assinar prontuário'
  const endpoint     = isPrescricao ? '/api/prescricao/assinar' : '/api/prontuario/assinar'
  const bodyPayload  = isPrescricao
    ? { patientId, otp: otp.trim() }
    : { consultaId, otp: otp.trim() }

  async function handleAssinar() {
    if (!otp.trim()) { setError('Digite o código OTP do app BirdID ou VaultID.'); return }
    setError('')
    setLoading(true)

    try {
      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(bodyPayload),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Erro ao assinar. Tente novamente.')
        return
      }

      onSuccess(json.pdfUrl, json.assinaturaUrl)
    } catch {
      setError('Falha de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{titulo}</h2>
              <p className="text-xs text-gray-400">Assinatura digital ICP-Brasil — BirdID ou VaultID</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-xs font-semibold text-blue-800">Como obter o código OTP</p>
          </div>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Abra o app <strong>BirdID</strong> ou <strong>VaultID</strong> no celular</li>
            <li>Toque em <strong>"Gerar código"</strong></li>
            <li>Digite o código de 6 dígitos abaixo</li>
          </ol>
        </div>

        {/* Campo OTP */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Código OTP (6 dígitos)
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            disabled={loading}
            className="w-full px-4 py-3 text-xl text-center font-mono tracking-widest border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAssinar}
            disabled={loading || otp.length < 4}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Assinando...</>
              : <><ShieldCheck className="w-4 h-4" /> Assinar</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente de sucesso após assinatura ─────────────────────────────────────

interface SuccessProps {
  pdfUrl:        string
  assinaturaUrl: string
  tipo?:         AssinaturaType
  onClose:       () => void
}

export function AssinaturaSuccessModal({ pdfUrl, assinaturaUrl, tipo = 'prontuario', onClose }: SuccessProps) {
  const isPrescricao = tipo === 'prescricao'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">{isPrescricao ? 'Prescrição assinada!' : 'Prontuário assinado!'}</h2>
          <p className="text-xs text-gray-500">
            Assinatura digital ICP-Brasil aplicada com sucesso.
            Valide em{' '}
            <a href="https://validar.iti.gov.br" target="_blank" rel="noreferrer"
               className="text-primary underline">
              validar.iti.gov.br
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" /> {isPrescricao ? 'Baixar PDF da prescrição' : 'Baixar PDF do prontuário'}
          </a>
          <a
            href={assinaturaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Baixar assinatura (.p7s)
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
