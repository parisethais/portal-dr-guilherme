'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Stethoscope } from 'lucide-react'
import { saveDoctorProfile } from '@/app/actions/doctor-profile'

interface Props {
  initialCrm:            string | null
  initialEspecialidade:  string | null
  initialCpf:            string | null
  initialDataNascimento: string | null  // YYYY-MM-DD
}

export default function DoctorProfileSettings({
  initialCrm,
  initialEspecialidade,
  initialCpf,
  initialDataNascimento,
}: Props) {
  const [crm,            setCrm]            = useState(initialCrm ?? '')
  const [especialidade,  setEspecialidade]  = useState(initialEspecialidade ?? '')
  const [dataNasc,       setDataNasc]       = useState(initialDataNascimento ?? '')
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState('')
  const [isPending,      startTransition]   = useTransition()

  function handleSave() {
    setError('')
    startTransition(async () => {
      const res = await saveDoctorProfile({
        crm,
        especialidade,
        dataNascimento: dataNasc || null,
      })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/8">
          <Stethoscope className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Perfil Médico</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Usado para autenticar com a Memed e emitir prescrições digitais.
          </p>
        </div>
      </div>

      {/* CPF (somente leitura — já cadastrado) */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">CPF</label>
        <input
          type="text"
          value={initialCpf ? initialCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'}
          readOnly
          className="w-full sm:w-72 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
        />
        <p className="text-[11px] text-gray-400 mt-1">
          Para alterar o CPF, entre em contato com o suporte.
        </p>
      </div>

      {/* Data de nascimento — obrigatória para a Memed desde fev/2026 */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Data de nascimento <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          value={dataNasc}
          onChange={e => setDataNasc(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-[11px] text-gray-400 mt-1">
          Obrigatório para emitir prescrições pela Memed.
        </p>
      </div>

      {/* CRM */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          CRM <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={crm}
          onChange={e => setCrm(e.target.value)}
          placeholder="Ex: SP-123456"
          className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Especialidade */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Especialidade</label>
        <input
          type="text"
          value={especialidade}
          onChange={e => setEspecialidade(e.target.value)}
          placeholder="Ex: Nefrologia"
          className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-primary text-white hover:bg-primary-dark disabled:opacity-60'
          }`}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" />
           : <Check   className="w-4 h-4" />}
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
