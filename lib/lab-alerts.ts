import type { LabResult } from './types'

export type AlertSeverity = 'critical' | 'warning'
export type AlertDirection = 'high' | 'low'

export interface LabAlert {
  id:          string
  exam_name:   string
  severity:    AlertSeverity
  direction:   AlertDirection
  message:     string
  count:       number        // consecutive abnormal measurements
  latestValue: string
  latestUnit:  string | null
  latestDate:  string        // YYYY-MM-DD
}

interface RefRange {
  low?:          number   // below = abnormal low
  high?:         number   // above = abnormal high
  criticalLow?:  number   // emergency low threshold
  criticalHigh?: number   // emergency high threshold
}

// Keys matched case-insensitively against exam_name (partial substring both ways)
const RANGES: Record<string, RefRange> = {
  'Creatinina':                  { low: 0.5,  high: 1.3,  criticalHigh: 5.0,  criticalLow: 0.3  },
  'Ureia':                       { low: 10,   high: 50,   criticalHigh: 200                     },
  'Potássio':                    { low: 3.5,  high: 5.0,  criticalHigh: 6.0,  criticalLow: 3.0  },
  'Sódio':                       { low: 135,  high: 145,  criticalHigh: 155,  criticalLow: 125  },
  'TFG':                         { low: 60,               criticalLow: 15                       },
  'eGFR':                        { low: 60,               criticalLow: 15                       },
  'Hemoglobina':                 { low: 10,               criticalLow: 7                        },
  'Fósforo':                     { low: 2.5,  high: 5.5,  criticalHigh: 7.0                     },
  'Cálcio':                      { low: 8.5,  high: 10.5, criticalHigh: 12.0, criticalLow: 7.5  },
  'Ácido Úrico':                 {            high: 7.0,  criticalHigh: 10.0                    },
  'Hemoglobina Glicada':         {            high: 7.0,  criticalHigh: 10.0                    },
  'HbA1c':                       {            high: 7.0,  criticalHigh: 10.0                    },
  'Albumina':                    { low: 3.5,              criticalLow: 2.5                      },
  'PTH':                         {            high: 300,  criticalHigh: 600                     },
  'Bicarbonato':                 { low: 22,   high: 29,   criticalLow: 15                       },
  'PCR':                         {            high: 1.0,  criticalHigh: 5.0                     },
  'Proteínas na Urina':          {            high: 150,  criticalHigh: 3000                    },
  'Proteína na Urina':           {            high: 150,  criticalHigh: 3000                    },
  'Microalbuminúria':            {            high: 30,   criticalHigh: 300                     },
  'Relação Proteína/Creatinina': {            high: 0.2,  criticalHigh: 3.5                     },
  'Triglicerídeos':              {            high: 150,  criticalHigh: 500                     },
  'Colesterol LDL':              {            high: 100,  criticalHigh: 190                     },
}

// Minimum consecutive abnormal values to fire a "sustained" alert
const SUSTAINED_N = 3

function parseVal(v: string): number | null {
  const m = v.replace(',', '.').match(/[\d.]+/)
  if (!m) return null
  const n = parseFloat(m[0])
  return isNaN(n) ? null : n
}

function findRange(examName: string): RefRange | null {
  const lower = examName.toLowerCase()
  for (const [key, range] of Object.entries(RANGES)) {
    const kl = key.toLowerCase()
    if (lower.includes(kl) || kl.includes(lower)) return range
  }
  return null
}

export function computeLabAlerts(labResults: LabResult[]): LabAlert[] {
  const alerts: LabAlert[] = []

  // Group by exam_name
  const byExam: Record<string, LabResult[]> = {}
  for (const r of labResults) {
    ;(byExam[r.exam_name] ??= []).push(r)
  }

  for (const [examName, results] of Object.entries(byExam)) {
    const range = findRange(examName)
    if (!range) continue

    // Newest first
    const sorted = [...results].sort((a, b) => b.collected_at.localeCompare(a.collected_at))
    const latest    = sorted[0]
    const latestVal = parseVal(latest.value)
    if (latestVal === null) continue

    const base = {
      exam_name:   examName,
      latestValue: latest.value,
      latestUnit:  latest.unit,
      latestDate:  latest.collected_at,
      count:       1,
    }

    // ── 1. Critical single value ───────────────────────────────
    if (range.criticalHigh !== undefined && latestVal >= range.criticalHigh) {
      alerts.push({ ...base, id: `${examName}|crit-high`, severity: 'critical', direction: 'high',
        message: `${examName} em nível crítico elevado` })
      continue
    }
    if (range.criticalLow !== undefined && latestVal <= range.criticalLow) {
      alerts.push({ ...base, id: `${examName}|crit-low`, severity: 'critical', direction: 'low',
        message: `${examName} em nível crítico baixo` })
      continue
    }

    // ── 2. Sustained abnormal high ────────────────────────────
    if (range.high !== undefined) {
      let n = 0
      for (const r of sorted) {
        const v = parseVal(r.value)
        if (v !== null && v > range.high) n++
        else break
      }
      if (n >= SUSTAINED_N) {
        alerts.push({ ...base, id: `${examName}|sust-high`, severity: 'warning', direction: 'high',
          count: n,
          message: `${examName} acima do normal em ${n} exame${n > 1 ? 's' : ''} seguido${n > 1 ? 's' : ''}` })
        continue
      }
    }

    // ── 3. Sustained abnormal low ─────────────────────────────
    if (range.low !== undefined) {
      let n = 0
      for (const r of sorted) {
        const v = parseVal(r.value)
        if (v !== null && v < range.low) n++
        else break
      }
      if (n >= SUSTAINED_N) {
        alerts.push({ ...base, id: `${examName}|sust-low`, severity: 'warning', direction: 'low',
          count: n,
          message: `${examName} abaixo do normal em ${n} exame${n > 1 ? 's' : ''} seguido${n > 1 ? 's' : ''}` })
        continue
      }
    }

    // ── 4. Worsening trend (≥3 values, each newer worse than previous) ──
    if (sorted.length >= 3) {
      const v3 = sorted.slice(0, 3).map(r => parseVal(r.value))
      if (v3.every(v => v !== null)) {
        const [v0, v1, v2] = v3 as number[]
        if (range.high !== undefined && v0 > v1 && v1 > v2 && v0 > range.high) {
          alerts.push({ ...base, id: `${examName}|trend-high`, severity: 'warning', direction: 'high',
            count: 3, message: `${examName} em alta progressiva nos últimos 3 exames` })
          continue
        }
        if (range.low !== undefined && v0 < v1 && v1 < v2 && v0 < range.low) {
          alerts.push({ ...base, id: `${examName}|trend-low`, severity: 'warning', direction: 'low',
            count: 3, message: `${examName} em queda progressiva nos últimos 3 exames` })
          continue
        }
      }
    }
  }

  // Critical first, then warning; within same severity alphabetical
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1
    return a.exam_name.localeCompare(b.exam_name, 'pt-BR')
  })
}

/** Convenience summary count for patient list badges */
export function countLabAlerts(labResults: LabResult[]): { critical: number; warning: number } {
  const alerts = computeLabAlerts(labResults)
  return {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning:  alerts.filter(a => a.severity === 'warning').length,
  }
}
