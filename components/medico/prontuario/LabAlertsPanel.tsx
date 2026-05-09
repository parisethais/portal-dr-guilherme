'use client'

import { computeLabAlerts } from '@/lib/lab-alerts'
import type { LabResult } from '@/lib/types'
import { AlertCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

function fmt(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

interface Props { labResults: LabResult[] }

export default function LabAlertsPanel({ labResults }: Props) {
  const alerts = computeLabAlerts(labResults)
  if (alerts.length === 0) return null

  const critCount = alerts.filter(a => a.severity === 'critical').length
  const warnCount = alerts.filter(a => a.severity === 'warning').length

  return (
    <div className="space-y-3 mb-6">

      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-800">Alertas laboratoriais</h3>
        {critCount > 0 && (
          <span className="text-[11px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full leading-none">
            {critCount} crítico{critCount > 1 ? 's' : ''}
          </span>
        )}
        {warnCount > 0 && (
          <span className="text-[11px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full leading-none">
            {warnCount} atenção
          </span>
        )}
      </div>

      {/* Alert cards */}
      <div className="space-y-2">
        {alerts.map(alert => {
          const isCrit = alert.severity === 'critical'
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${
                isCrit ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              {/* Icon */}
              <div className={`mt-0.5 flex-shrink-0 ${isCrit ? 'text-red-500' : 'text-amber-500'}`}>
                {isCrit
                  ? <AlertCircle className="w-4 h-4" />
                  : alert.direction === 'high'
                    ? <TrendingUp className="w-4 h-4" />
                    : <TrendingDown className="w-4 h-4" />
                }
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isCrit ? 'text-red-800' : 'text-amber-800'}`}>
                  {alert.message}
                </p>
                <p className={`text-xs mt-0.5 ${isCrit ? 'text-red-600' : 'text-amber-600'}`}>
                  Último:{' '}
                  <strong>
                    {alert.latestValue}{alert.latestUnit ? ` ${alert.latestUnit}` : ''}
                  </strong>
                  {' '}em {fmt(alert.latestDate)}
                  {alert.count > 1 && ` · ${alert.count} medições consecutivas`}
                </p>
              </div>

              {/* Badge */}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${
                isCrit ? 'bg-red-600 text-white' : 'bg-amber-200 text-amber-800'
              }`}>
                {isCrit ? 'Crítico' : 'Atenção'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
