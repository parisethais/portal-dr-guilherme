// Categorias padrão — Dr. Guilherme tem clínica + fontes pessoais
export interface FinancialCategory {
  value: string
  label: string
  scope: 'clinic' | 'personal' | 'both'
  type:  'receita' | 'despesa' | 'both'
  color: string
}

export const FINANCIAL_CATEGORIES: FinancialCategory[] = [
  // ── Receitas clínica ──────────────────────────────────────────
  { value: 'consulta_particular', label: 'Consulta particular', scope: 'clinic',   type: 'receita', color: '#22c55e' },
  { value: 'consulta_convenio',   label: 'Convênio',            scope: 'clinic',   type: 'receita', color: '#16a34a' },
  { value: 'procedimento',        label: 'Procedimento',        scope: 'clinic',   type: 'receita', color: '#4ade80' },
  { value: 'retorno',             label: 'Retorno',             scope: 'clinic',   type: 'receita', color: '#60a5fa' },

  // ── Receitas pessoais ─────────────────────────────────────────
  { value: 'plantao',             label: 'Plantão',             scope: 'personal', type: 'receita', color: '#3b82f6' },
  { value: 'aula_palestra',       label: 'Aula / Palestra',     scope: 'personal', type: 'receita', color: '#6366f1' },
  { value: 'hospital_externo',    label: 'Hospital externo',    scope: 'personal', type: 'receita', color: '#8b5cf6' },
  { value: 'preceptoria',         label: 'Preceptoria',         scope: 'personal', type: 'receita', color: '#a78bfa' },
  { value: 'receita_outros',      label: 'Outros (receita)',    scope: 'both',     type: 'receita', color: '#94a3b8' },

  // ── Despesas clínica ──────────────────────────────────────────
  { value: 'aluguel',             label: 'Aluguel',             scope: 'clinic',   type: 'despesa', color: '#ef4444' },
  { value: 'funcionario',         label: 'Funcionário / RH',    scope: 'clinic',   type: 'despesa', color: '#f97316' },
  { value: 'material_consumo',    label: 'Material de consumo', scope: 'clinic',   type: 'despesa', color: '#f59e0b' },
  { value: 'equipamento',         label: 'Equipamento',         scope: 'clinic',   type: 'despesa', color: '#eab308' },
  { value: 'software_sistema',    label: 'Software / Sistema',  scope: 'clinic',   type: 'despesa', color: '#84cc16' },
  { value: 'marketing',           label: 'Marketing',           scope: 'clinic',   type: 'despesa', color: '#06b6d4' },
  { value: 'contador',            label: 'Contador / Escritório', scope: 'both',   type: 'despesa', color: '#0ea5e9' },
  { value: 'imposto',             label: 'Imposto / DAS',       scope: 'both',     type: 'despesa', color: '#f43f5e' },
  { value: 'despesa_outros',      label: 'Outros (despesa)',    scope: 'both',     type: 'despesa', color: '#94a3b8' },
]

export const PAYMENT_METHODS = [
  { value: 'pix',           label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cartao',        label: 'Cartão' },
  { value: 'dinheiro',      label: 'Dinheiro' },
  { value: 'boleto',        label: 'Boleto' },
  { value: 'cheque',        label: 'Cheque' },
]

export function getCategoryMeta(value: string): FinancialCategory | undefined {
  return FINANCIAL_CATEGORIES.find(c => c.value === value)
}

export function categoryLabel(value: string): string {
  return getCategoryMeta(value)?.label ?? value
}

export function categoryColor(value: string): string {
  return getCategoryMeta(value)?.color ?? '#94a3b8'
}

export function categoriesByType(type: 'receita' | 'despesa') {
  return FINANCIAL_CATEGORIES.filter(c => c.type === type || c.type === 'both')
}
