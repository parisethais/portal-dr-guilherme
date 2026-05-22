import { MapPin, Phone, Stethoscope, BadgeCheck, Mail } from 'lucide-react'

interface ClinicCardProps {
  clinicName:     string
  doctorName:     string | null
  especialidade:  string | null
  crm:            string | null
  endereco:       string | null
  telefone:       string | null
  email:          string | null
}

export default function ClinicCard({
  clinicName,
  doctorName,
  especialidade,
  crm,
  endereco,
  telefone,
  email,
}: ClinicCardProps) {
  return (
    <div
      className="mb-6 rounded-2xl border border-white/60 overflow-hidden"
      style={{
        backdropFilter: 'blur(14px)',
        backgroundColor: 'rgba(255,255,255,0.65)',
        boxShadow: '0 2px 16px rgba(26,31,46,0.06)',
      }}
    >
      <div className="flex items-start gap-4 px-5 py-4">

        {/* Ícone / selo */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(45,43,107,0.08)' }}
        >
          <Stethoscope className="w-5 h-5" style={{ color: '#2D2B6B' }} />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-base font-bold tracking-tight truncate" style={{ color: '#2D2B6B' }}>
              {doctorName ?? clinicName}
            </p>
            <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: '#7A9E7E' }} />
          </div>

          {/* Especialidade + CRM */}
          {(especialidade || crm) && (
            <p className="text-xs text-gray-400 mb-2">
              {[especialidade, crm].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Endereço · Telefone · E-mail */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
            {endereco && (
              <span className="flex items-start gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3 shrink-0 text-gray-400 mt-0.5" />
                <span>{endereco}</span>
              </span>
            )}
            {telefone && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="w-3 h-3 shrink-0 text-gray-400" />
                {telefone}
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                {email}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
