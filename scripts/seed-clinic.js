/**
 * seed-clinic.js
 * Popula o Portal Dr. Guilherme com dados realistas de consultório de nefrologia.
 *
 * Uso: node scripts/seed-clinic.js
 */

const fs   = require('fs')
const path = require('path')

// ── Lê .env.local ─────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local')
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=')
  if (idx > 0) {
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
})

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Helpers de data ───────────────────────────────────────────
function daysAgo(n)   { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString() }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString() }
function monthsAgo(m, day = 10, hour = 10) {
  const d = new Date()
  d.setMonth(d.getMonth() - m)
  d.setDate(day)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
function nextDate(daysFromNow, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ── Dados dos pacientes ───────────────────────────────────────
const PATIENTS = [
  {
    email: 'ana.ferreira@email.com',
    full_name: 'Ana Paula Ferreira',
    phone: '11987654321',
    data_nascimento: '1968-03-15',
    sexo: 'F',
    profissao: 'Professora aposentada',
    nome_mae: 'Maria das Graças Ferreira',
    cpf: '123.456.789-01',
    cep: '01310-100',
    endereco: 'Av. Paulista, 1000, Apto 52 — Bela Vista',
    cidade_estado: 'São Paulo, SP',
    clinica: 'MedRenal',
    diagnostico: 'DRC estágio 3 — Hipertensão arterial',
    como_conheceu: 'Google',
    status_paciente: 'ativo',
    obs_secretaria: 'Prefere consultas às terças. Muito pontual.',
    perfil_completo: true,
  },
  {
    email: 'roberto.nascimento@email.com',
    full_name: 'Roberto Carlos Nascimento',
    phone: '11976543210',
    data_nascimento: '1955-07-22',
    sexo: 'M',
    profissao: 'Engenheiro civil',
    nome_mae: 'Benedita Nascimento',
    cpf: '234.567.890-12',
    cep: '04543-011',
    endereco: 'R. Funchal, 263, Cj 45 — Vila Olímpia',
    cidade_estado: 'São Paulo, SP',
    clinica: 'MedRenal',
    diagnostico: 'DRC estágio 4 — Diabete mellitus tipo 2',
    como_conheceu: 'Indicação: Dr. Octávio Silva',
    status_paciente: 'ativo',
    obs_secretaria: 'Acompanha com endocrinologista. Trazer exames de glicemia.',
    perfil_completo: true,
  },
  {
    email: 'fernanda.costa@email.com',
    full_name: 'Fernanda Oliveira Costa',
    phone: '11965432109',
    data_nascimento: '1979-11-08',
    sexo: 'F',
    profissao: 'Nutricionista',
    nome_mae: 'Rosa Oliveira',
    cpf: '345.678.901-23',
    cep: '05407-002',
    endereco: 'R. Oscar Freire, 740, Apto 31 — Jardins',
    cidade_estado: 'São Paulo, SP',
    clinica: 'MedRenal',
    diagnostico: 'Síndrome nefrótica — em remissão',
    como_conheceu: 'Instagram',
    status_paciente: 'ativo',
    obs_secretaria: 'Paciente bem informada, faz muitas perguntas. Reservar +15 min.',
    perfil_completo: true,
  },
  {
    email: 'carlos.mendes@email.com',
    full_name: 'Carlos Eduardo Mendes',
    phone: '11954321098',
    data_nascimento: '1962-05-30',
    sexo: 'M',
    profissao: 'Advogado',
    nome_mae: 'Helena Mendes',
    cpf: '456.789.012-34',
    cep: '01452-001',
    endereco: 'Alameda Santos, 800, 12º andar — Cerqueira César',
    cidade_estado: 'São Paulo, SP',
    clinica: 'MedRenal',
    diagnostico: 'Rim policístico autossômico dominante (DRPAD)',
    como_conheceu: 'Indicação: Dr. Fernando Lima',
    status_paciente: 'ativo',
    obs_secretaria: 'Pai e irmão com mesma doença. Monitorar função renal.',
    perfil_completo: true,
  },
  {
    email: 'marcia.lima@email.com',
    full_name: 'Márcia Santos Lima',
    phone: '11943210987',
    data_nascimento: '1972-09-14',
    sexo: 'F',
    profissao: 'Secretária',
    nome_mae: 'Aparecida Santos',
    cpf: '567.890.123-45',
    cep: '08210-000',
    endereco: 'R. das Flores, 220 — Penha',
    cidade_estado: 'São Paulo, SP',
    clinica: 'Hospital São Luiz',
    diagnostico: 'Glomerulonefrite membranosa',
    como_conheceu: 'Google',
    status_paciente: 'ativo',
    obs_secretaria: '',
    perfil_completo: true,
  },
  {
    email: 'paulo.rocha@email.com',
    full_name: 'Paulo Henrique Rocha',
    phone: '11932109876',
    data_nascimento: '1949-02-18',
    sexo: 'M',
    profissao: 'Aposentado',
    nome_mae: 'Conceição Rocha',
    cpf: '678.901.234-56',
    cep: '09190-615',
    endereco: 'Av. Industrial, 350 — Santo André',
    cidade_estado: 'Santo André, SP',
    clinica: 'MedRenal',
    diagnostico: 'LES com nefrite lúpica classe III',
    como_conheceu: 'Indicação: familiar',
    status_paciente: 'ativo',
    obs_secretaria: 'Em uso de hidroxicloroquina. Trazer exames de complemento.',
    perfil_completo: true,
  },
  {
    email: 'silvia.gomes@email.com',
    full_name: 'Sílvia Aparecida Gomes',
    phone: '11921098765',
    data_nascimento: '1958-06-03',
    sexo: 'F',
    profissao: 'Comerciante',
    nome_mae: 'Izabel Gomes',
    cpf: '789.012.345-67',
    cep: '04726-000',
    endereco: 'R. Taquari, 180 — Mooca',
    cidade_estado: 'São Paulo, SP',
    clinica: 'MedRenal',
    diagnostico: 'DRC estágio 5 — hemodiálise 3x/semana',
    como_conheceu: 'Indicação: Dr. Marcos Ribeiro',
    status_paciente: 'ativo',
    obs_secretaria: 'Faz diálise no Instituto do Rim às seg/qua/sex. Consultas às quintas.',
    perfil_completo: true,
  },
  {
    email: 'jorge.carvalho@email.com',
    full_name: 'Jorge Luis Carvalho',
    phone: '11910987654',
    data_nascimento: '1985-12-20',
    sexo: 'M',
    profissao: 'Analista de sistemas',
    nome_mae: 'Vera Carvalho',
    cpf: '890.123.456-78',
    cep: '05001-100',
    endereco: 'R. Cerro Corá, 1010, Apto 12 — Alto de Pinheiros',
    cidade_estado: 'São Paulo, SP',
    clinica: 'Hospital Israelita Albert Einstein',
    diagnostico: 'Nefropatia por IgA (Doença de Berger)',
    como_conheceu: 'Instagram',
    status_paciente: 'ativo',
    obs_secretaria: 'Jovem, bem engajado no tratamento. Usa app para controlar PA.',
    perfil_completo: true,
  },
  {
    email: 'teresa.andrade@email.com',
    full_name: 'Teresa Cristina Andrade',
    phone: '11999887766',
    data_nascimento: '1950-04-25',
    sexo: 'F',
    profissao: 'Professora aposentada',
    nome_mae: 'Josefa Andrade',
    cpf: '901.234.567-89',
    cep: '07095-030',
    endereco: 'R. Bom Jesus, 45 — Guarulhos',
    cidade_estado: 'Guarulhos, SP',
    clinica: 'MedRenal',
    diagnostico: 'DRC estágio 5 — transplantada (2019)',
    como_conheceu: 'Google',
    status_paciente: 'inativo',
    obs_secretaria: 'Alta do acompanhamento em jan/2025. Encaminhada para centro de transplante.',
    perfil_completo: true,
  },
  {
    email: 'antonio.sousa@email.com',
    full_name: 'Antônio Pereira Souza',
    phone: '11988776655',
    data_nascimento: '1943-08-10',
    sexo: 'M',
    profissao: 'Agricultor aposentado',
    nome_mae: 'Francisca Pereira',
    cpf: '012.345.678-90',
    cep: '09521-040',
    endereco: 'R. das Palmeiras, 88 — São Caetano do Sul',
    cidade_estado: 'São Caetano do Sul, SP',
    clinica: 'MedRenal',
    diagnostico: 'Amiloidose renal — AA secundária',
    como_conheceu: 'Indicação: Dr. Marcos Ribeiro',
    status_paciente: 'inativo',
    obs_secretaria: 'Saiu do acompanhamento por dificuldade de locomoção. Sugerir teleconsulta.',
    perfil_completo: true,
  },
  {
    email: 'lucia.fonseca@email.com',
    full_name: 'Lúcia Maria Fonseca',
    phone: '11977665544',
    data_nascimento: '1965-01-30',
    sexo: 'F',
    profissao: 'Enfermeira',
    nome_mae: 'Marlene Fonseca',
    cpf: '111.222.333-44',
    cep: '04551-060',
    endereco: 'R. Dr. Tomás Carvalhal, 140 — Paraíso',
    cidade_estado: 'São Paulo, SP',
    clinica: 'Hospital São Luiz',
    diagnostico: 'Hipertensão arterial com microalbuminúria',
    como_conheceu: 'Google',
    status_paciente: 'ativo',
    obs_secretaria: 'Sem retorno agendado. Ligar para remarcar.',
    perfil_completo: true,
  },
  {
    email: 'renata.duarte@email.com',
    full_name: 'Renata Ferraz Duarte',
    phone: '11966554433',
    data_nascimento: '1990-10-05',
    sexo: 'F',
    profissao: 'Designer gráfica',
    nome_mae: 'Claudia Ferraz',
    cpf: '222.333.444-55',
    cep: '01416-000',
    endereco: 'R. Augusta, 2400, Apto 71 — Consolação',
    cidade_estado: 'São Paulo, SP',
    clinica: 'MedRenal',
    diagnostico: 'DRC estágio 2 — investigação de causa',
    como_conheceu: 'Instagram',
    status_paciente: 'ativo',
    obs_secretaria: 'Primeira consulta recente. Aguardando biópsia renal.',
    perfil_completo: true,
  },
  {
    email: 'miguel.torres@email.com',
    full_name: 'Miguel Augusto Torres',
    phone: '11955443322',
    data_nascimento: '1970-07-17',
    sexo: 'M',
    profissao: 'Contador',
    nome_mae: 'Neusa Torres',
    cpf: '333.444.555-66',
    cep: '05652-000',
    endereco: 'Av. Rebouças, 3200, Apto 82 — Pinheiros',
    cidade_estado: 'São Paulo, SP',
    clinica: 'MedRenal',
    diagnostico: 'HAS + DRC estágio 3 — nefropatia hipertensiva',
    como_conheceu: 'Indicação: amigo',
    status_paciente: 'ativo',
    obs_secretaria: '',
    perfil_completo: true,
  },
  {
    email: 'benedito.lima@email.com',
    full_name: 'Benedito Correia Lima',
    phone: '11944332211',
    data_nascimento: '1938-11-29',
    sexo: 'M',
    profissao: 'Aposentado',
    nome_mae: 'Cecília Correia',
    cpf: '444.555.666-77',
    cep: '07200-000',
    endereco: 'R. Sete de Setembro, 120 — Guarulhos',
    cidade_estado: 'Guarulhos, SP',
    clinica: 'MedRenal',
    diagnostico: 'DRC estágio 5 — falecido em março/2025',
    como_conheceu: 'Indicação: família',
    status_paciente: 'obito',
    obs_secretaria: 'Paciente faleceu em 12/03/2025. Família muito grata pelo cuidado.',
    perfil_completo: true,
  },
]

// ── Consultas por paciente (índice = posição em PATIENTS) ─────
// Cada item: { mesesAtras, dia, hora, tipo, local, status, obs }
const CONSULTAS_TEMPLATE = [
  // Ana Paula (0) — DRC estágio 3, ativa com retorno
  [
    { m: 6, d: 5,  h: 9,  tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'Primeira consulta. Diagnóstico DRC estágio 3. Solicitados exames.' },
    { m: 5, d: 8,  h: 10, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Resultados: creatinina 1.9. Ajuste de anti-hipertensivos.' },
    { m: 3, d: 12, h: 9,  tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Estável. Creatinina 1.8. Reforço dietético.' },
    { m: 1, d: 15, h: 10, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Boa evolução. TFG 48. Manter conduta.' },
    { futuro: 21, h: 9, tipo: 'retorno', local: 'consultorio', status: 'confirmada', obs: 'Retorno trimestral.' },
  ],
  // Roberto (1) — DRC estágio 4 + DM, ativo com retorno
  [
    { m: 9, d: 3,  h: 11, tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'DM há 15 anos. TFG 28. Início do preparo para diálise.' },
    { m: 7, d: 7,  h: 10, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 25. Orientações sobre modalidades de diálise.' },
    { m: 5, d: 6,  h: 11, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Confecção de FAV indicada. Encaminhado para cirurgia vascular.' },
    { m: 3, d: 8,  h: 10, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Pós-FAV. TFG 21. Monitorar hemoglobina.' },
    { m: 1, d: 10, h: 11, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 19. Anemia corrigida. Aguardar TFG < 15 para iniciar diálise.' },
    { futuro: 14, h: 10, tipo: 'retorno', local: 'consultorio', status: 'agendada', obs: '' },
  ],
  // Fernanda (2) — síndrome nefrótica em remissão, ativa com retorno
  [
    { m: 8, d: 4,  h: 14, tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'Edema importante. Proteinúria 4.2g/24h. Biópsia indicada.' },
    { m: 7, d: 2,  h: 14, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Resultado biópsia: membranosa classe II. Início de prednisona.' },
    { m: 5, d: 9,  h: 15, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Boa resposta ao corticoide. Proteinúria 1.1g/24h.' },
    { m: 3, d: 5,  h: 14, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Remissão parcial. Reduzindo corticoide gradualmente.' },
    { m: 1, d: 7,  h: 15, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Remissão completa. Proteinúria 0.18g/24h. Manter vigilância.' },
    { futuro: 45, h: 14, tipo: 'retorno', local: 'consultorio', status: 'agendada', obs: 'Controle semestral.' },
  ],
  // Carlos (3) — DRPAD, ativo com retorno
  [
    { m: 11, d: 2, h: 8,  tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'Rim policístico. TFG 52. Pai e irmão transplantados.' },
    { m: 8,  d: 5, h: 9,  tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 48. RM evidenciou crescimento dos cistos. Tolvaptana discutida.' },
    { m: 5,  d: 4, h: 8,  tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 45. Início de tolvaptana. Orientações sobre hidratação.' },
    { m: 2,  d: 6, h: 9,  tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Boa tolerância. TFG 44. Estável.' },
    { futuro: 30, h: 8, tipo: 'retorno', local: 'consultorio', status: 'agendada', obs: '' },
  ],
  // Márcia (4) — glomerulonefrite, ativa sem retorno
  [
    { m: 7, d: 3,  h: 16, tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'Glomerulonefrite membranosa. Início de tratamento imunossupressor.' },
    { m: 5, d: 6,  h: 16, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Resposta parcial. Ajuste de micofenolato.' },
    { m: 3, d: 4,  h: 16, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Estável. TFG 55. Manter.' },
    { m: 2, d: 8,  h: 16, tipo: 'retorno',             local: 'consultorio', status: 'falta',    obs: 'Paciente não compareceu. Não remarcou.' },
    // sem retorno futuro — aparece na lista de sem retorno
  ],
  // Paulo (5) — LES com nefrite, ativo com retorno
  [
    { m: 10, d: 7, h: 9,  tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'LES há 8 anos. Nefrite lúpica classe III. Biópsia confirmada.' },
    { m: 7,  d: 5, h: 9,  tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Complemento baixo. Ajuste de azatioprina. Reforço sobre fotoproteção.' },
    { m: 4,  d: 3, h: 10, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Estável. Anti-dsDNA 1:40. TFG 62.' },
    { m: 1,  d: 9, h: 9,  tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Remissão imunológica. Manter hidroxicloroquina.' },
    { futuro: 60, h: 9, tipo: 'retorno', local: 'consultorio', status: 'agendada', obs: 'Controle semestral.' },
  ],
  // Sílvia (6) — DRC estágio 5 em hemodiálise, ativa com retorno
  [
    { m: 12, d: 4, h: 13, tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'DRC terminal. Iniciando HD há 3 meses. Kt/V 1.3.' },
    { m: 9,  d: 6, h: 13, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Anemia corrigida. Ajuste de eritropoietina.' },
    { m: 6,  d: 5, h: 14, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Kt/V 1.45. Boa aderência. Avaliação para transplante iniciada.' },
    { m: 3,  d: 7, h: 13, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Lista de transplante aguardando resultado de cross-match.' },
    { m: 1,  d: 5, h: 14, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Intercorrência: peritonite. Tratada. Recuperada.' },
    { futuro: 7, h: 13, tipo: 'retorno', local: 'consultorio', status: 'confirmada', obs: 'Revisão pós-intercorrência.' },
  ],
  // Jorge (7) — nefropatia IgA, ativo com retorno
  [
    { m: 5, d: 2,  h: 17, tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'Hematúria recorrente há 2 anos. Biópsia: nefropatia por IgA.' },
    { m: 3, d: 4,  h: 17, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 72. IECAS iniciados. Proteinúria 0.6g/24h.' },
    { m: 1, d: 6,  h: 17, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 75. Proteinúria 0.4g. Boa resposta.' },
    { futuro: 55, h: 17, tipo: 'retorno', local: 'consultorio', status: 'agendada', obs: 'Retorno de 4 meses.' },
  ],
  // Teresa (8) — inativa, transplantada
  [
    { m: 18, d: 3, h: 9,  tipo: 'retorno', local: 'consultorio', status: 'realizada', obs: 'Pós-transplante 6 meses. Creatinina 1.3. Ajuste de tacrolimus.' },
    { m: 12, d: 5, h: 9,  tipo: 'retorno', local: 'consultorio', status: 'realizada', obs: 'Estável. Biópsia de protocolo sem alterações.' },
    { m: 6,  d: 7, h: 9,  tipo: 'retorno', local: 'consultorio', status: 'realizada', obs: 'Alta. Encaminhada para centro de transplante de referência.' },
  ],
  // Antônio (9) — inativo, amiloidose
  [
    { m: 14, d: 8, h: 10, tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'Amiloidose AA secundária a artrite reumatoide. TFG 42.' },
    { m: 10, d: 5, h: 10, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 38. Discussão com reumatologista. Ajuste do imunossupressor.' },
    { m: 6,  d: 3, h: 10, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'Dificuldade de locomoção. Teleconsulta sugerida para próximos.' },
  ],
  // Lúcia (10) — ativa SEM retorno agendado
  [
    { m: 4, d: 7,  h: 11, tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'HAS com microalbuminúria. Lisinopril iniciado.' },
    { m: 2, d: 9,  h: 11, tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'PA controlada. Albumina urinária reduzindo. Manter.' },
    // sem retorno futuro
  ],
  // Renata (11) — ativa, nova paciente, com retorno
  [
    { m: 2, d: 14, h: 14, tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'DRC estágio 2 descoberto em exame de rotina. Biópsia indicada.' },
    { futuro: 10, h: 14, tipo: 'retorno', local: 'consultorio', status: 'confirmada', obs: 'Resultado da biópsia.' },
  ],
  // Miguel (12) — ativo com retorno
  [
    { m: 7,  d: 3, h: 8,  tipo: 'primeira_consulta', local: 'consultorio', status: 'realizada', obs: 'HAS descontrolada + DRC identificada. TFG 52.' },
    { m: 4,  d: 5, h: 8,  tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 50. Ajuste de losartana. PA melhor controlada.' },
    { m: 1,  d: 7, h: 8,  tipo: 'retorno',            local: 'consultorio', status: 'realizada', obs: 'TFG 49. Estável. Orientações dietéticas.' },
    { futuro: 35, h: 8, tipo: 'retorno', local: 'consultorio', status: 'agendada', obs: '' },
  ],
  // Benedito (13) — óbito
  [
    { m: 9, d: 4,  h: 15, tipo: 'retorno', local: 'consultorio', status: 'realizada', obs: 'Piora clínica. TFG 8. Família informada sobre prognóstico.' },
    { m: 7, d: 6,  h: 15, tipo: 'retorno', local: 'consultorio', status: 'realizada', obs: 'Cuidados paliativos discutidos. Família presente.' },
    { m: 5, d: 3,  h: 15, tipo: 'retorno', local: 'consultorio', status: 'realizada', obs: 'Último atendimento presencial. Internado em seguida.' },
  ],
]

// ── Solicitações de contato ───────────────────────────────────
// Será preenchida com IDs reais após criar os pacientes
const CONTACT_REQUESTS_TEMPLATE = [
  {
    patientIndex: 0, // Ana Paula
    subject: 'Dúvida sobre exames',
    message: 'Bom dia, Dr. Guilherme. Fiz os exames solicitados na última consulta e queria saber se preciso trazer o resultado impresso ou posso trazer pelo celular. Obrigada!',
    status: 'resolvido',
  },
  {
    patientIndex: 3, // Carlos
    subject: 'Renovação de receita',
    message: 'Olá! Preciso renovar a receita do tolvaptana. Posso passar na clínica para pegar ou precisa de consulta? Grato.',
    status: 'resolvido',
  },
  {
    patientIndex: 6, // Sílvia
    subject: 'Intercorrência urgente',
    message: 'Dr. Guilherme, estou com febre e dor abdominal forte desde ontem. Fui ao PA e me disseram que pode ser peritonite. Estou internada no São Luiz. Por favor, entrar em contato.',
    status: 'resolvido',
  },
  {
    patientIndex: 1, // Roberto
    subject: 'Dúvida sobre dieta',
    message: 'Boa tarde. A nutricionista me passou uma dieta mas ela é diferente do que o senhor orientou na consulta sobre restrição de potássio. Qual devo seguir?',
    status: 'em_andamento',
  },
  {
    patientIndex: 11, // Renata
    subject: 'Resultado da biópsia',
    message: 'Dr. Guilherme, recebi o resultado da biópsia renal pelo app do hospital. Não entendi nada do laudo. Posso enviar aqui? Estou ansiosa.',
    status: 'pendente',
  },
  {
    patientIndex: 10, // Lúcia
    subject: 'Reagendar consulta',
    message: 'Olá! Preciso remarcar minha consulta pois tenho viagem marcada na semana que estava agendada. Qual data tem disponível?',
    status: 'pendente',
  },
]

// ── Funções de seed ───────────────────────────────────────────
async function createPatient(data) {
  // 1. Cria usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: 'Portal1234',
    email_confirm: true,
    user_metadata: { full_name: data.full_name, role: 'paciente' },
  })

  if (authError) {
    console.error(`  ✗ Auth error para ${data.full_name}: ${authError.message}`)
    return null
  }

  const userId = authData.user.id

  // 2. Upserta o perfil
  const { error: profileError } = await supabase.from('profiles').upsert({
    id:              userId,
    role:            'paciente',
    full_name:       data.full_name,
    email:           data.email,
    phone:           data.phone,
    data_nascimento: data.data_nascimento,
    sexo:            data.sexo,
    profissao:       data.profissao,
    nome_mae:        data.nome_mae,
    cpf:             data.cpf,
    cep:             data.cep,
    endereco:        data.endereco,
    cidade_estado:   data.cidade_estado,
    clinica:         data.clinica,
    diagnostico:     data.diagnostico,
    como_conheceu:   data.como_conheceu,
    status_paciente: data.status_paciente,
    obs_secretaria:  data.obs_secretaria,
    perfil_completo: data.perfil_completo,
    lgpd_accepted:   true,
    lgpd_accepted_at: new Date().toISOString(),
  })

  if (profileError) {
    console.error(`  ✗ Profile error para ${data.full_name}: ${profileError.message}`)
    return null
  }

  console.log(`  ✓ ${data.full_name} (${data.status_paciente})`)
  return userId
}

async function createConsultas(patientId, templates, medicoId) {
  for (const t of templates) {
    let data_hora
    if (t.futuro !== undefined) {
      data_hora = nextDate(t.futuro, t.h)
    } else {
      const d = new Date()
      d.setMonth(d.getMonth() - t.m)
      d.setDate(t.d)
      d.setHours(t.h, 0, 0, 0)
      data_hora = d.toISOString()
    }

    const { error } = await supabase.from('consultas').insert({
      id:          uuid(),
      patient_id:  patientId,
      tipo:        t.tipo,
      local:       t.local,
      data_hora,
      duracao_min: 30,
      status:      t.status,
      observacoes: t.obs || null,
      created_by:  medicoId,
    })

    if (error) console.error(`    ✗ Consulta error: ${error.message}`)
  }
}

async function createContactRequests(requests, patientIds) {
  for (const r of requests) {
    const patientId = patientIds[r.patientIndex]
    if (!patientId) continue

    const { error } = await supabase.from('contact_requests').insert({
      id:         uuid(),
      patient_id: patientId,
      subject:    r.subject,
      message:    r.message,
      status:     r.status,
    })

    if (error) console.error(`  ✗ ContactRequest error: ${error.message}`)
    else console.log(`  ✓ Solicitação "${r.subject}" (${r.status})`)
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n🏥 Seed — Portal Dr. Guilherme\n')

  // Busca o médico (para usar como created_by nas consultas)
  const { data: medico } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'medico')
    .single()

  const medicoId = medico?.id ?? null
  if (!medicoId) console.warn('⚠️  Médico não encontrado — consultas sem created_by\n')

  // Cria pacientes
  console.log('👤 Criando pacientes...')
  const patientIds = []
  for (const p of PATIENTS) {
    const id = await createPatient(p)
    patientIds.push(id)
  }

  // Cria consultas
  console.log('\n📅 Criando consultas...')
  for (let i = 0; i < patientIds.length; i++) {
    if (!patientIds[i]) continue
    const templates = CONSULTAS_TEMPLATE[i] ?? []
    if (templates.length === 0) continue
    await createConsultas(patientIds[i], templates, medicoId)
    console.log(`  ✓ ${PATIENTS[i].full_name} — ${templates.length} consulta(s)`)
  }

  // Cria solicitações de contato
  console.log('\n📬 Criando solicitações de contato...')
  await createContactRequests(CONTACT_REQUESTS_TEMPLATE, patientIds)

  console.log('\n✅ Seed concluído!\n')
  console.log('Pacientes criados com senha: Portal1234')
  console.log('Use os e-mails de cada paciente para testar o login.\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
