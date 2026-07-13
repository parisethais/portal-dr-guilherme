export const HOSPITAIS = [
  { value: 'sirio_libanes',  label: 'Sírio Libanês'  },
  { value: 'vila_nova_star', label: 'Vila Nova Star'  },
  { value: 'einstein',       label: 'Einstein'        },
  { value: 'outro',          label: 'Outro'           },
] as const

export const VISITADORES = ['Guilherme', 'Lecticia', 'Fernando', 'Jeison'] as const

export const DIALISE_OPTIONS = [
  { value: 'nao',  label: 'Não'  },
  { value: 'hdi',  label: 'HDI'  },
  { value: 'sled', label: 'SLED' },
  { value: 'crrt', label: 'CRRT' },
] as const

export function hospitalLabel(hospital: string, outro?: string | null) {
  return HOSPITAIS.find(h => h.value === hospital)?.label ?? outro ?? hospital
}
