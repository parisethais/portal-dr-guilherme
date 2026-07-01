'use client'

import { Pill } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MemedPrescricaoProps {
  patientId:        string
  consultaId?:      string | null
  patientName:      string
  patientCpf?:      string | null
  patientPhone?:    string | null
  patientBirthday?: string | null
  patientGender?:   'M' | 'F' | null
}

export default function MemedPrescricao({
  patientId,
  consultaId,
  patientName,
  patientCpf,
  patientPhone,
  patientBirthday,
  patientGender,
}: MemedPrescricaoProps) {
  const openPopup = () => {
    const params = new URLSearchParams({ patientId, name: patientName })
    if (consultaId)      params.set('consultaId', consultaId)
    if (patientCpf)      params.set('cpf', patientCpf)
    if (patientPhone)    params.set('phone', patientPhone)
    if (patientBirthday) params.set('birthday', patientBirthday)
    if (patientGender)   params.set('gender', patientGender)

    // Abre o popup com ~90% da tela para maximizar a área visível do widget Memed
    const sw = window.screen.availWidth
    const sh = window.screen.availHeight
    const w  = Math.min(Math.round(sw * 0.92), 1400)
    const h  = Math.min(Math.round(sh * 0.94), 950)
    const x  = Math.round((sw - w) / 2)
    const y  = Math.round((sh - h) / 2)

    const popup = window.open(
      `/prescricao?${params.toString()}`,
      'memed-prescricao',
      `width=${w},height=${h},left=${x},top=${y},resizable=yes,scrollbars=yes,menubar=no,toolbar=no,status=no`,
    )

    if (!popup) {
      alert('Por favor, permita pop-ups para este site para abrir a prescrição Memed.')
    }
  }

  return (
    <button
      type="button"
      onClick={openPopup}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
        'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10',
      )}
    >
      <Pill className="w-3.5 h-3.5" />
      Prescrição Memed
    </button>
  )
}
