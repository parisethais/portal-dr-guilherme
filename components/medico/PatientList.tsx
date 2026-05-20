'use client'

import { useState, useMemo, useDeferredValue, useEffect } from 'react'
import type { Profile, Consulta } from '@/lib/types'
import { guardNavigation } from '@/lib/prontuario-dirty'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import PatientDetail from './PatientDetail'
import InvitePatientModal from './InvitePatientModal'
import { Search, UserRound, Users, ChevronRight, UserPlus, Loader2 } from 'lucide-react'
import { getPatientDetailData, type PatientDetailData } from '@/app/actions/patient-detail'

interface PatientListProps {
  currentRole:      string
  patients:         Profile[]
  consultas:        Consulta[]
  selectedPatientId: string | null
  onSelectPatient:  (patientId: string | null) => void
}

export default function PatientList({
  currentRole,
  patients,
  consultas,
  selectedPatientId,
  onSelectPatient,
}: PatientListProps) {
  const [search,      setSearch]      = useState('')
  const [inviteOpen,  setInviteOpen]  = useState(false)
  const [detailData,    setDetailData]    = useState<PatientDetailData | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const selectedPatient = selectedPatientId
    ? (patients.find(p => p.id === selectedPatientId) ?? null)
    : null

  // Carrega dados pesados quando o paciente selecionado muda
  useEffect(() => {
    if (!selectedPatient) { setDetailData(null); return }
    setLoadingDetail(true)
    setDetailData(null)
    getPatientDetailData(selectedPatient.id)
      .then(data  => { setDetailData(data);  setLoadingDetail(false) })
      .catch(()   => setLoadingDetail(false))
  }, [selectedPatient?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Índice de busca — apenas nome, CPF, email e diagnóstico do perfil
  const searchIndex = useMemo(() => {
    return new Map(patients.map(p => {
      const parts: string[] = []
      if (p.full_name)   parts.push(p.full_name.toLowerCase())
      if (p.cpf)         parts.push(p.cpf.replace(/\D/g, ''))
      if (p.diagnostico) parts.push(p.diagnostico.toLowerCase())
      if (p.email)       parts.push(p.email.toLowerCase())
      return [p.id, parts.join(' ')]
    }))
  }, [patients])

  const deferredSearch = useDeferredValue(search)

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim()
    if (!q) return patients
    return patients.filter(p => searchIndex.get(p.id)?.includes(q) ?? false)
  }, [deferredSearch, patients, searchIndex])

  // ── Paciente selecionado ──────────────────────────────────────
  if (selectedPatient) {
    if (loadingDetail || !detailData) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-gray-400">Carregando dados do paciente…</p>
        </div>
      )
    }

    const patientConsultas = detailData.consultas
      .slice()
      .sort((a, b) => b.data_hora.localeCompare(a.data_hora))

    return (
      <PatientDetail
        currentRole={currentRole}
        patient={selectedPatient}
        exames={detailData.patientExams}
        carePlan={detailData.carePlans[0] ?? null}
        attachments={detailData.carePlanAttachments}
        invoices={detailData.invoices}
        consultas={patientConsultas}
        labResults={detailData.labResults}
        imagingResults={detailData.imagingResults}
        onBack={() => guardNavigation(() => onSelectPatient(null))}
      />
    )
  }

  // ── Lista de pacientes ────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>
            {patients.length} {patients.length === 1 ? 'paciente' : 'pacientes'} cadastrado
            {patients.length === 1 ? '' : 's'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar paciente
        </button>
      </div>

      <InvitePatientModal open={inviteOpen} onClose={() => setInviteOpen(false)} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar paciente por nome, CPF ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <UserRound className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((patient) => {
            const consultaCount = consultas.filter(c => c.patient_id === patient.id).length
            return (
              <Card
                key={patient.id}
                padding="sm"
                className="cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                onClick={() => guardNavigation(() => onSelectPatient(patient.id))}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: 'rgba(26,31,46,0.07)', color: '#1A1F2E' }}
                  >
                    {(patient.full_name || '?').split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {patient.full_name || 'Nome não informado'}
                    </p>
                    {patient.cpf && (
                      <p className="text-xs text-gray-400 truncate">CPF: {patient.cpf}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Desde {formatDate(patient.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      patient.lgpd_accepted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {patient.lgpd_accepted ? 'LGPD aceita' : 'LGPD pendente'}
                  </span>
                  {consultaCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-primary font-medium">
                      {consultaCount} consulta{consultaCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
