export interface ExamDef {
  name: string
  group: string
  unit: string          // unidade padrão
  altUnits?: string[]   // unidades alternativas de outros labs
  qualitative?: boolean
  normalAnswer?: string // para qualitativos: valor "normal"
  noRef?: boolean       // sem faixa de referência (descritivos)
  // Faixas numéricas
  refMin?: number; refMax?: number     // normal
  warnLow?: number; warnHigh?: number  // atenção (amarelo)
  critLow?: number; critHigh?: number  // alterado (vermelho)
  higherBetter?: boolean // para HDL, VitD, etc.
  // Faixas por unidade alternativa
  unitRanges?: Record<string, { refMin?: number; refMax?: number; warnLow?: number; warnHigh?: number; critLow?: number; critHigh?: number }>
}

export const EXAM_CATALOG: ExamDef[] = [
  // ── FUNÇÃO RENAL ─────────────────────────────────────────────
  { group: 'Função Renal', name: 'Ureia', unit: 'mg/dL', refMin: 10, refMax: 50, warnLow: 5, warnHigh: 80, critLow: 0, critHigh: 120 },
  { group: 'Função Renal', name: 'Creatinina', unit: 'mg/dL', refMin: 0.7, refMax: 1.3, warnHigh: 2.0, critHigh: 4.0 },
  { group: 'Função Renal', name: 'Sódio', unit: 'mEq/L', refMin: 136, refMax: 145, warnLow: 130, warnHigh: 150, critLow: 125, critHigh: 155 },
  { group: 'Função Renal', name: 'Potássio', unit: 'mEq/L', refMin: 3.5, refMax: 5.0, warnLow: 3.0, warnHigh: 5.5, critLow: 2.5, critHigh: 6.0 },
  {
    group: 'Função Renal', name: 'Cálcio iônico', unit: 'mmol/L', altUnits: ['mg/dL'],
    refMin: 1.12, refMax: 1.32, warnLow: 1.05, warnHigh: 1.45, critLow: 0.9, critHigh: 1.6,
    unitRanges: { 'mg/dL': { refMin: 4.5, refMax: 5.2, warnLow: 4.0, warnHigh: 5.6, critLow: 3.5, critHigh: 6.0 } },
  },
  {
    group: 'Função Renal', name: 'Magnésio', unit: 'mg/dL', altUnits: ['mmol/L'],
    refMin: 1.6, refMax: 2.6, warnLow: 1.2, warnHigh: 3.0, critLow: 0.8, critHigh: 4.0,
    unitRanges: { 'mmol/L': { refMin: 0.66, refMax: 1.07, warnLow: 0.49, warnHigh: 1.23, critLow: 0.33, critHigh: 1.65 } },
  },
  { group: 'Função Renal', name: 'Fósforo', unit: 'mg/dL', refMin: 2.5, refMax: 4.5, warnLow: 1.5, warnHigh: 6.0, critLow: 1.0, critHigh: 8.0 },
  { group: 'Função Renal', name: 'Ácido úrico', unit: 'mg/dL', refMin: 3.4, refMax: 7.0, warnHigh: 9.0, critHigh: 12.0 },
  { group: 'Função Renal', name: 'Cistatina C', unit: 'mg/L', refMin: 0.53, refMax: 0.95, warnHigh: 1.2, critHigh: 2.0 },
  { group: 'Função Renal', name: 'Clearance Creatinina 24h: volume urinário', unit: 'mL/24h', refMin: 600, refMax: 2500, warnLow: 400, warnHigh: 3500, critLow: 200 },
  { group: 'Função Renal', name: 'Clearance Creatinina 24h: clearance', unit: 'mL/min/1,73m²', refMin: 90, warnLow: 60, critLow: 30 },

  // ── HEMATOLOGIA ────────────────────────────────────────────────
  { group: 'Hematologia', name: 'Hemoglobina', unit: 'g/dL', refMin: 12.0, refMax: 17.5, warnLow: 10.0, warnHigh: 18.5, critLow: 8.0, critHigh: 20.0 },
  { group: 'Hematologia', name: 'Hematócrito', unit: '%', refMin: 36, refMax: 53, warnLow: 24, warnHigh: 57, critLow: 18, critHigh: 65 },
  { group: 'Hematologia', name: 'Leucócitos', unit: '/mm³', refMin: 4000, refMax: 10000, warnLow: 3000, warnHigh: 15000, critLow: 2000, critHigh: 30000 },
  { group: 'Hematologia', name: 'Neutrófilos', unit: '/mm³', refMin: 1800, refMax: 7500, warnLow: 1000, warnHigh: 10000, critLow: 500, critHigh: 20000 },
  { group: 'Hematologia', name: 'Linfócitos', unit: '/mm³', refMin: 1000, refMax: 4800, warnLow: 700, warnHigh: 6000, critLow: 400, critHigh: 10000 },
  { group: 'Hematologia', name: 'Plaquetas', unit: '/mm³', refMin: 150000, refMax: 400000, warnLow: 100000, warnHigh: 600000, critLow: 50000, critHigh: 1000000 },

  // ── METABOLISMO ÓSSEO / MINERAL ───────────────────────────────
  { group: 'Metabolismo Ósseo', name: 'PTH', unit: 'pg/mL', refMin: 15, refMax: 65, warnHigh: 150, critHigh: 300 },
  { group: 'Metabolismo Ósseo', name: 'Vitamina D 25-OH', unit: 'ng/mL', refMin: 30, refMax: 100, warnLow: 20, warnHigh: 150, critLow: 10, critHigh: 200, higherBetter: true },
  { group: 'Metabolismo Ósseo', name: 'Fosfatase alcalina', unit: 'U/L', refMin: 40, refMax: 130, warnHigh: 300, critHigh: 500 },

  // ── GLICEMIA ──────────────────────────────────────────────────
  { group: 'Glicemia', name: 'Glicemia de jejum', unit: 'mg/dL', refMin: 70, refMax: 99, warnLow: 60, warnHigh: 125, critLow: 50, critHigh: 250 },
  { group: 'Glicemia', name: 'Hemoglobina glicada', unit: '%', refMin: 4.0, refMax: 5.6, warnHigh: 8.0, critHigh: 10.0 },

  // ── TIREÓIDE ─────────────────────────────────────────────────
  { group: 'Tireóide', name: 'TSH', unit: 'mUI/L', refMin: 0.4, refMax: 4.0, warnLow: 0.1, warnHigh: 10.0, critLow: 0.05, critHigh: 20.0 },
  { group: 'Tireóide', name: 'T4 livre', unit: 'ng/dL', refMin: 0.8, refMax: 1.8, warnLow: 0.5, warnHigh: 3.0, critLow: 0.3, critHigh: 5.0 },

  // ── FERRO ────────────────────────────────────────────────────
  { group: 'Ferro', name: 'Ferritina', unit: 'ng/mL', refMin: 12, refMax: 300, warnLow: 5, warnHigh: 500, critLow: 0, critHigh: 1000 },
  { group: 'Ferro', name: 'Índice de saturação de transferrina', unit: '%', refMin: 20, refMax: 50, warnLow: 10, warnHigh: 60, critLow: 5, critHigh: 80 },

  // ── PROTEÍNAS SÉRICAS ─────────────────────────────────────────
  { group: 'Proteínas Séricas', name: 'Albumina', unit: 'g/dL', refMin: 3.5, refMax: 5.0, warnLow: 3.0, critLow: 2.5 },
  { group: 'Proteínas Séricas', name: 'Proteínas totais', unit: 'g/dL', refMin: 6.0, refMax: 8.0, warnLow: 5.0, critLow: 4.0 },

  // ── ELETROFORESE / PROTEÍNAS SÉRICAS ──────────────────────────
  { group: 'Proteínas Séricas', name: 'Eletroforese: pico monoclonal', unit: 'neg/pos', qualitative: true, normalAnswer: 'neg' },
  { group: 'Proteínas Séricas', name: 'Eletroforese: conc. pico monoclonal', unit: 'g/dL', altUnits: ['g/L'], refMax: 0, warnHigh: 1.0, critHigh: 2.0,
    unitRanges: { 'g/L': { refMax: 0, warnHigh: 10, critHigh: 20 } } },
  { group: 'Proteínas Séricas', name: 'Imunofixação proteínas séricas', unit: 'neg/pos', qualitative: true, normalAnswer: 'neg', noRef: false },

  // ── LIPÍDIOS ─────────────────────────────────────────────────
  { group: 'Lipídios', name: 'Colesterol total', unit: 'mg/dL', refMax: 200, warnHigh: 239, critHigh: 300 },
  { group: 'Lipídios', name: 'HDL-colesterol', unit: 'mg/dL', refMin: 50, warnLow: 35, critLow: 25, higherBetter: true },
  { group: 'Lipídios', name: 'LDL-colesterol', unit: 'mg/dL', refMax: 130, warnHigh: 160, critHigh: 190 },
  { group: 'Lipídios', name: 'Triglicerídeos', unit: 'mg/dL', refMax: 150, warnHigh: 200, critHigh: 500 },
  {
    group: 'Lipídios', name: 'Lp(a)', unit: 'mg/dL', altUnits: ['nmol/L'],
    refMax: 30, warnHigh: 50, critHigh: 75,
    unitRanges: { 'nmol/L': { refMax: 75, warnHigh: 100, critHigh: 125 } },
  },
  { group: 'Lipídios', name: 'ApoB', unit: 'mg/dL', refMax: 100, warnHigh: 130, critHigh: 160 },
  { group: 'Lipídios', name: 'CPK', unit: 'U/L', refMax: 200, warnHigh: 500, critHigh: 1000 },
  { group: 'Lipídios', name: 'DHL', unit: 'U/L', refMin: 135, refMax: 225, warnHigh: 400, critHigh: 600 },

  // ── FÍGADO ────────────────────────────────────────────────────
  { group: 'Fígado', name: 'Gama GT', unit: 'U/L', refMax: 73, warnHigh: 150, critHigh: 300 },
  { group: 'Fígado', name: 'Bilirrubina total', unit: 'mg/dL', refMax: 1.2, warnHigh: 3.0, critHigh: 6.0 },
  { group: 'Fígado', name: 'Bilirrubina direta', unit: 'mg/dL', refMax: 0.3, warnHigh: 1.5, critHigh: 3.0 },
  { group: 'Fígado', name: 'Bilirrubina indireta', unit: 'mg/dL', refMax: 0.8, warnHigh: 2.5, critHigh: 5.0 },
  { group: 'Fígado', name: 'TGO/AST', unit: 'U/L', refMax: 40, warnHigh: 120, critHigh: 300 },
  { group: 'Fígado', name: 'TGP/ALT', unit: 'U/L', refMax: 40, warnHigh: 120, critHigh: 300 },

  // ── VITAMINAS ─────────────────────────────────────────────────
  { group: 'Vitaminas', name: 'Ácido fólico', unit: 'ng/mL', refMin: 3.1, warnLow: 2.0, critLow: 1.5, higherBetter: true },
  { group: 'Vitaminas', name: 'Vitamina B12', unit: 'pg/mL', refMin: 200, refMax: 900, warnLow: 150, critLow: 100, higherBetter: true },

  // ── GASOMETRIA VENOSA ─────────────────────────────────────────
  { group: 'Gasometria Venosa', name: 'Gasometria venosa: pH', unit: 'sem unidade', refMin: 7.32, refMax: 7.42, warnLow: 7.25, warnHigh: 7.50, critLow: 7.10, critHigh: 7.60 },
  { group: 'Gasometria Venosa', name: 'Gasometria venosa: bicarbonato', unit: 'mmol/L', refMin: 22, refMax: 28, warnLow: 15, warnHigh: 35, critLow: 10, critHigh: 40 },
  { group: 'Gasometria Venosa', name: 'Gasometria venosa: pCO₂', unit: 'mmHg', refMin: 40, refMax: 52, warnLow: 30, warnHigh: 60, critLow: 20, critHigh: 70 },
  { group: 'Gasometria Venosa', name: 'Gasometria venosa: BE', unit: 'mmol/L', refMin: -3, refMax: 3, warnLow: -8, warnHigh: 8, critLow: -12, critHigh: 12 },

  // ── AUTOIMUNE ─────────────────────────────────────────────────
  { group: 'Autoimune', name: 'FAN', unit: 'neg/pos', altUnits: ['título'], qualitative: true, normalAnswer: 'neg' },
  { group: 'Autoimune', name: 'Fator Reumatoide', unit: 'UI/mL', refMax: 14, warnHigh: 60, critHigh: 100 },
  { group: 'Autoimune', name: 'Anti-CCP', unit: 'U/mL', refMax: 17, warnHigh: 50, critHigh: 100 },
  { group: 'Autoimune', name: 'Anti-Sm', unit: 'neg/pos', qualitative: true, normalAnswer: 'neg' },
  { group: 'Autoimune', name: 'Anti-DNA', unit: 'neg/pos', altUnits: ['UI/mL'], qualitative: true, normalAnswer: 'neg' },
  { group: 'Autoimune', name: 'Anti-RNP', unit: 'neg/pos', qualitative: true, normalAnswer: 'neg' },
  { group: 'Autoimune', name: 'Anti-Ro/SSA', unit: 'neg/pos', qualitative: true, normalAnswer: 'neg' },
  { group: 'Autoimune', name: 'Anti-La/SSB', unit: 'neg/pos', qualitative: true, normalAnswer: 'neg' },
  { group: 'Autoimune', name: 'Complemento C3', unit: 'mg/dL', refMin: 90, refMax: 180, warnLow: 60, critLow: 40 },
  { group: 'Autoimune', name: 'Complemento C4', unit: 'mg/dL', refMin: 16, refMax: 47, warnLow: 8, critLow: 4 },

  // ── SOROLOGIAS ────────────────────────────────────────────────
  { group: 'Sorologias', name: 'Anti-HCV', unit: 'react/n.react', qualitative: true, normalAnswer: 'n.react' },
  { group: 'Sorologias', name: 'HBsAg', unit: 'react/n.react', qualitative: true, normalAnswer: 'n.react' },
  { group: 'Sorologias', name: 'Anti-HBs', unit: 'mUI/mL', refMin: 10, warnLow: 10, critLow: 0, higherBetter: true },
  { group: 'Sorologias', name: 'Anti-HBc total', unit: 'react/n.react', qualitative: true, normalAnswer: 'n.react' },
  { group: 'Sorologias', name: 'Anti-HBc IgM', unit: 'react/n.react', qualitative: true, normalAnswer: 'n.react' },
  { group: 'Sorologias', name: 'HIV 1/2', unit: 'react/n.react', qualitative: true, normalAnswer: 'n.react' },
  { group: 'Sorologias', name: 'Sífilis: VDRL', unit: 'título', noRef: true },
  { group: 'Sorologias', name: 'Sífilis: teste treponêmico', unit: 'react/n.react', qualitative: true, normalAnswer: 'n.react' },

  // ── URINA ─────────────────────────────────────────────────────
  { group: 'Urina', name: 'Urina 1: pH urinário', unit: 'sem unidade', refMin: 4.5, refMax: 8.0 },
  { group: 'Urina', name: 'Urina 1: glicose', unit: 'neg/pos', qualitative: true, normalAnswer: 'neg' },
  { group: 'Urina', name: 'Urina 1: hemácias', unit: '/campo', altUnits: ['/mL'],
    refMax: 5, warnHigh: 10, critHigh: 20,
    unitRanges: { '/mL': { refMax: 10000, warnHigh: 25000, critHigh: 100000 } } },
  { group: 'Urina', name: 'Urina 1: leucócitos', unit: '/campo', altUnits: ['/mL'],
    refMax: 5, warnHigh: 10, critHigh: 20,
    unitRanges: { '/mL': { refMax: 10000, warnHigh: 25000, critHigh: 100000 } } },
  { group: 'Urina', name: 'Urina 1: proteína', unit: 'neg/pos', qualitative: true, normalAnswer: 'neg' },
  {
    group: 'Urina', name: 'Relação proteína/creatinina urinária', unit: 'mg/g creatinina', altUnits: ['g/g creatinina'],
    refMax: 200, warnHigh: 500, critHigh: 3500,
    unitRanges: { 'g/g creatinina': { refMax: 0.2, warnHigh: 0.5, critHigh: 3.5 } },
  },
  { group: 'Urina', name: 'Relação albumina/creatinina urinária', unit: 'mg/g creatinina', refMax: 30, warnHigh: 300, critHigh: 3000 },
  {
    group: 'Urina', name: 'Proteína urinária 24h', unit: 'mg/24h', altUnits: ['g/24h'],
    refMax: 150, warnHigh: 500, critHigh: 3500,
    unitRanges: { 'g/24h': { refMax: 0.15, warnHigh: 0.5, critHigh: 3.5 } },
  },
]

// Grupo único de exames na ordem definida
export const EXAM_GROUPS = [...new Set(EXAM_CATALOG.map(e => e.group))]

// Lookup por nome
export const EXAM_BY_NAME = Object.fromEntries(EXAM_CATALOG.map(e => [e.name, e]))

// Converte número formatado em pt-BR para float
// Exemplos: "7.380" → 7380 | "222.000" → 222000 | "0,88" → 0.88 | "1.234,56" → 1234.56
function parseLocalizedFloat(value: string): number {
  const s = value.trim()
  // Tem vírgula E ponto → formato europeu: 1.234,56
  if (s.includes(',') && s.includes('.')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  }
  // Só vírgula → decimal: 0,88
  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.'))
  }
  // Só ponto seguido de exatamente 3 dígitos no final → separador de milhar: 7.380
  if (/\.\d{3}$/.test(s)) {
    return parseFloat(s.replace(/\./g, ''))
  }
  // Ponto decimal normal: 0.88
  return parseFloat(s)
}

// Classifica o valor: null = sem dado, 'normal' | 'warn' | 'crit'
export function classifyValue(
  def: ExamDef,
  value: string,
  unit: string | null,
): 'normal' | 'warn' | 'crit' | null {
  if (!value || !value.trim()) return null

  if (def.noRef) return null

  if (def.qualitative) {
    const v = value.toLowerCase().trim()
    if (!def.normalAnswer) return null
    // Aliases para variações laboratoriais de resultados negativos/normais
    const NORMAL_ALIASES: Record<string, string[]> = {
      'neg':     ['neg', 'negativo', 'negative', 'não detectado', 'nao detectado',
                  'ausente', 'normal', 'não reagente', 'nao reagente', 'nao reag', 'não reag',
                  'sem alteração', 'sem alteracao'],
      'n.react': ['n.react', 'não reagente', 'nao reagente', 'nao reag', 'não reag',
                  'não reativo', 'nao reativo', 'negativo', 'neg', 'nr'],
    }
    const aliases = NORMAL_ALIASES[def.normalAnswer] ?? [def.normalAnswer]
    const isNormal = aliases.some(a => v.startsWith(a))
    return isNormal ? 'normal' : 'crit'
  }

  const num = parseLocalizedFloat(value)
  if (isNaN(num)) return null

  // Usa faixas específicas da unidade se disponível
  const ranges: Partial<ExamDef> =
    unit && def.unitRanges?.[unit] ? def.unitRanges[unit] : def

  const { refMin, refMax, critLow, critHigh, warnLow, warnHigh } = ranges as any

  // Crítico
  if (critLow  !== undefined && num <= critLow)  return 'crit'
  if (critHigh !== undefined && num >= critHigh) return 'crit'
  // Atenção — limites explícitos de warn
  if (warnLow  !== undefined && num <= warnLow)  return 'warn'
  if (warnHigh !== undefined && num >= warnHigh) return 'warn'
  // Atenção — fora do intervalo de referência (ex: Creatinina 1,92 > refMax 1,3)
  if (refMin !== undefined && num < refMin) return 'warn'
  if (refMax !== undefined && num > refMax) return 'warn'
  return 'normal'
}
