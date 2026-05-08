/**
 * seed-prontuarios.js
 * Popula o prontuário (diagnósticos, evolução, conduta, lab_results,
 * imaging_results) para os pacientes já existentes no banco.
 *
 * Pré-requisito: seed-clinic.js já executado (pacientes e consultas criados)
 * Uso: node scripts/seed-prontuarios.js
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

// ── Helpers ───────────────────────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}
function dateMonthsAgo(m, day = 10) {
  const d = new Date()
  d.setMonth(d.getMonth() - m)
  d.setDate(day)
  return d.toISOString().slice(0, 10)
}
function dx(nome, evolucao) { return { nome, evolucao } }
function ok(label, res) {
  if (res.error) console.error(`  ✗ ${label}:`, res.error.message)
  else console.log(`  ✓ ${label}`)
}

// ── Perfis clínicos por e-mail ────────────────────────────────
// Cada entrada define:
//   consultas_prontuario: array ordenado por data asc (índice 0 = mais antiga)
//     Cada item sobrescreve a consulta "realizada" de mesmo índice com:
//       diagnosticos, evolucao, conduta, finalizado
//   lab_series: array de coletas laboratoriais
//   imaging: array de exames de imagem

const PRONTUARIOS = [

  // ────────────────────────────────────────────────────────────
  // Ana Paula Ferreira  — DRC 3a + HAS + Proteinúria
  // ────────────────────────────────────────────────────────────
  {
    email: 'ana.ferreira@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 3a', 'TFG 42 mL/min/1,73m². Provável etiologia hipertensiva.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 158/98 mmHg. Sem tratamento prévio adequado.'),
          dx('Proteinúria', 'Relação Prot/Cr urinária 0,9 g/g. Nefropatia hipertensiva estabelecida.'),
        ],
        evolucao: 'Paciente de 56 anos, professora aposentada, encaminhada pelo clínico geral com hipertensão de difícil controle e achado de creatinina elevada em exame de rotina (Cr 1,9 mg/dL). Nega hematúria. Apresenta poliúria noturna há ~1 ano. Exame físico: PA 158/98 mmHg, IMC 28, sem edema. Fundo de olho: retinopatia hipertensiva grau I. USG renal solicitada.',
        conduta: '1. Enalapril 10 mg 2x/dia (iECA para nefroproteção)\n2. Anlodipino 5 mg 1x/dia\n3. Dieta hipossódica (< 2 g Na/dia) e hipoproteica (0,8 g/kg/dia)\n4. Solicitar: função renal completa, eletrólitos, PTH intacto, USG renal\n5. Retorno em 30 dias com exames',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 3a', 'TFG 44 mL/min/1,73m². Pequena melhora com controle pressórico.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 142/88 mmHg. Em ajuste de medicação.'),
          dx('Proteinúria', 'Relação Prot/Cr 0,65 g/g. Redução com iECA.'),
        ],
        evolucao: 'Retorno com exames. Creatinina 1,8 mg/dL (TFG 44). Potássio 4,6 mEq/L — dentro do limite. Proteinúria em queda. PA ainda não em alvo. Paciente aderiu bem à dieta hipossódica. Refere cansaço leve. Hemoglobina 11,2 g/dL — anemia discreta a investigar.',
        conduta: '1. Aumentar enalapril para 20 mg 2x/dia\n2. Adicionar losartana 50 mg 1x/dia (estratégia combinada — monitorar K+)\n3. Iniciar sulfato ferroso 300 mg 2x/dia se ferritina < 100\n4. Controle de K+ em 15 dias\n5. Retorno em 60 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 3a', 'TFG 48 mL/min/1,73m². Melhora com controle pressórico rigoroso.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 134/82 mmHg. Alvo atingido.'),
          dx('Proteinúria', 'Relação Prot/Cr 0,42 g/g. Boa resposta ao duplo bloqueio.'),
          dx('Anemia da doença renal crônica', 'Hb 11,8 g/dL após reposição de ferro.'),
        ],
        evolucao: 'Evolução favorável. TFG subiu de 44 para 48 com melhor controle da PA. Proteinúria em declínio significativo. K+ 4,4 — seguro manter duplo bloqueio. Anemia respondendo ao ferro. Paciente refere melhora do cansaço. Sem edemas. PA 134/82 — em alvo.',
        conduta: '1. Manter enalapril 20 mg + losartana 50 mg\n2. Manter anlodipino 5 mg\n3. Manter sulfato ferroso por mais 60 dias, depois revisar ferritina\n4. Dieta: reforçar restrição de fósforo\n5. Solicitar: PTH, fósforo, vitamina D 25-OH\n6. Retorno em 90 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 3a', 'TFG 48 mL/min/1,73m². Estabilidade mantida há 3 meses.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 130/80 mmHg. Alvo mantido.'),
          dx('Proteinúria', 'Relação Prot/Cr 0,38 g/g. Boa resposta terapêutica.'),
          dx('Hiperparatireoidismo secundário', 'PTH 112 pg/mL. Leve. Iniciar vitamina D.'),
        ],
        evolucao: 'Consulta de controle trimestral. Paciente estável. TFG mantida em 48. PA em alvo. Proteinúria < 0,5 g/g. PTH levemente elevado (112), vitamina D 25-OH baixa (18 ng/mL). Fósforo normal (3,8 mg/dL). Anemia resolvida (Hb 12,4). Paciente relata boa qualidade de vida.',
        conduta: '1. Manter esquema anti-hipertensivo atual\n2. Iniciar colecalciferol 7.000 UI 1x/semana\n3. Reforçar dieta com restrição de fósforo\n4. Solicitar: função renal, eletrólitos, hemograma, PTH, 25-OH vit D em 3 meses\n5. Retorno trimestral — próximo em 21 dias (já agendado)',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(6, 5),
        exames: [
          { exam_name: 'Creatinina', value: '1,9', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '52', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,8', unit: 'mEq/L' },
          { exam_name: 'Sódio', value: '139', unit: 'mEq/L' },
          { exam_name: 'Hemoglobina', value: '11,2', unit: 'g/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '42', unit: 'mL/min/1,73m²' },
        ],
      },
      {
        data: dateMonthsAgo(3, 12),
        exames: [
          { exam_name: 'Creatinina', value: '1,8', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '48', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,4', unit: 'mEq/L' },
          { exam_name: 'Sódio', value: '140', unit: 'mEq/L' },
          { exam_name: 'Hemoglobina', value: '11,8', unit: 'g/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '48', unit: 'mL/min/1,73m²' },
          { exam_name: 'Fósforo', value: '3,8', unit: 'mg/dL' },
          { exam_name: 'PTH intacto', value: '112', unit: 'pg/mL' },
          { exam_name: 'Vitamina D 25-OH', value: '18', unit: 'ng/mL' },
        ],
      },
      {
        data: dateMonthsAgo(1, 15),
        exames: [
          { exam_name: 'Creatinina', value: '1,75', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '45', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,3', unit: 'mEq/L' },
          { exam_name: 'Hemoglobina', value: '12,4', unit: 'g/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '50', unit: 'mL/min/1,73m²' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'usg_rins',
        data: dateMonthsAgo(5, 20),
        laudo: 'Rim direito: 9,8 cm. Rim esquerdo: 9,6 cm. Parênquima com ecogenicidade levemente aumentada bilateralmente, sem diferenciação corticomedular. Ausência de litíase ou dilatação pielocalicial. Bexiga sem alterações. Conclusão: nefropatia parenquimatosa bilateral — compatível com nefropatia hipertensiva crônica.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Roberto Carlos Nascimento  — DRC 4 + DM2 + HAS
  // ────────────────────────────────────────────────────────────
  {
    email: 'roberto.nascimento@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 4', 'TFG 28 mL/min/1,73m². DM há 15 anos como etiologia principal.'),
          dx('Diabetes mellitus tipo 2', 'HbA1c 8,4%. Em uso de insulina NPH + metformina (suspender quando TFG < 30).'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 164/98 mmHg. Difícil controle.'),
          dx('Nefropatia diabética', 'Proteinúria 1,8 g/24h. Retinopatia confirmada por oftalmo.'),
          dx('Anemia da doença renal crônica', 'Hb 10,2 g/dL. Déficit de EPO.'),
        ],
        evolucao: 'Paciente de 68 anos, engenheiro aposentado, DM2 há 15 anos com complicações microvasculares estabelecidas. Creatinina 2,6 mg/dL (TFG 28). Edema de MMII 2+. PA 164/98 sem ter tomado medicação hoje. Já fez 2 internações por descompensação cardíaca. Fundo de olho: retinopatia diabética não proliferativa.',
        conduta: '1. Suspender metformina (TFG < 30)\n2. Insulina NPH 20 UI manhã + 10 UI noite; insulina regular conforme glicemia\n3. Losartana 100 mg + furosemida 40 mg + amlodipino 10 mg\n4. Iniciar eritropoetina alfa 4.000 UI 3x/semana SC\n5. Restrição hídrica 1,5 L/dia e dietética (K+, P, proteína)\n6. Encaminhar para cirurgia vascular — FAV\n7. Retorno em 30 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 4', 'TFG 25 mL/min/1,73m². Progressão lenta.'),
          dx('Diabetes mellitus tipo 2', 'HbA1c 7,6%. Melhora com ajuste de insulina.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 148/90 mmHg. Melhorando.'),
          dx('Nefropatia diabética', 'Proteinúria 1,4 g/24h.'),
          dx('Anemia da doença renal crônica', 'Hb 11,0 g/dL após 4 semanas de EPO.'),
        ],
        evolucao: 'Creatinina 2,8 (TFG 25). Edema reduzido. HbA1c melhorou de 8,4 para 7,6 com ajuste insulínico. EPO com boa resposta (Hb 11). PA ainda não em alvo. Cirurgia vascular avaliou — FAV programada para daqui 30 dias. Paciente ansioso, orientado sobre modalidades de TSR.',
        conduta: '1. Manter EPO 4.000 UI 3x/semana — reavaliar dose com Hb-alvo 11-12\n2. Aumentar furosemida para 80 mg\n3. Adicionar carvedilol 6,25 mg 2x/dia\n4. Preparar psicologicamente para diálise\n5. Retorno em 45 dias ou antes se sintomas',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 4', 'TFG 21 mL/min/1,73m². Declínio gradual.'),
          dx('Diabetes mellitus tipo 2', 'HbA1c 7,2%. Bom controle.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 138/86 mmHg. Alvo próximo.'),
          dx('Nefropatia diabética', 'Proteinúria 1,2 g/24h.'),
          dx('Anemia da doença renal crônica', 'Hb 11,8 g/dL. Controlada.'),
          dx('Hiperfosfatemia', 'Fósforo 5,8 mg/dL. Iniciar quelante.'),
        ],
        evolucao: 'Pós-FAV (realizada há 3 semanas). Fistula com boa faixa audível. TFG 21. Anemia controlada. Fósforo elevando — orientação dietética e quelante iniciado. Paciente mais tranquilo em relação à diálise. Glicemia bem controlada. PA próxima do alvo.',
        conduta: '1. Iniciar carbonato de cálcio 1,5g 3x/dia (quelante de fósforo junto às refeições)\n2. Manter EPO — reduzir para 3.000 UI 3x/semana (Hb 11,8)\n3. Monitorar FAV semanalmente\n4. Aguardar TFG < 15 ou sintomas urêmicos para inicio de HD\n5. Retorno em 30 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 4', 'TFG 19 mL/min/1,73m². Preparação para TSR.'),
          dx('Diabetes mellitus tipo 2', 'HbA1c 7,0%. Controle adequado.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 136/84 mmHg. Alvo atingido.'),
          dx('Nefropatia diabética', 'Proteinúria 1,0 g/24h. Estável.'),
          dx('Anemia da doença renal crônica', 'Hb 11,5 g/dL. Estável.'),
          dx('Hiperfosfatemia', 'Fósforo 5,2 mg/dL. Melhorando com quelante.'),
        ],
        evolucao: 'Consulta de acompanhamento pré-diálise. TFG 19. Sem sintomas urêmicos francos (refere cansaço moderado e náuseas ocasionais). FAV madura, pronta para uso. Creatinina 3,2. Fósforo melhorou com quelante (5,2). Paciente e família orientados sobre início de hemodiálise quando necessário.',
        conduta: '1. Manter toda a medicação atual\n2. FAV pronta — hemodiálise a iniciar quando TFG < 15 ou sintomas\n3. Evitar punção de FAV (reservar para HD)\n4. Solicitar: creatinina, K+, fósforo, PTH, hemograma\n5. Retorno em 14 dias — próxima consulta já agendada',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(9, 3),
        exames: [
          { exam_name: 'Creatinina', value: '2,6', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '78', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '5,1', unit: 'mEq/L' },
          { exam_name: 'Hemoglobina', value: '10,2', unit: 'g/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '28', unit: 'mL/min/1,73m²' },
          { exam_name: 'HbA1c', value: '8,4', unit: '%' },
          { exam_name: 'Fósforo', value: '5,5', unit: 'mg/dL' },
          { exam_name: 'PTH intacto', value: '285', unit: 'pg/mL' },
        ],
      },
      {
        data: dateMonthsAgo(5, 6),
        exames: [
          { exam_name: 'Creatinina', value: '2,9', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '88', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '5,3', unit: 'mEq/L' },
          { exam_name: 'Hemoglobina', value: '11,0', unit: 'g/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '22', unit: 'mL/min/1,73m²' },
          { exam_name: 'HbA1c', value: '7,6', unit: '%' },
          { exam_name: 'Fósforo', value: '5,8', unit: 'mg/dL' },
        ],
      },
      {
        data: dateMonthsAgo(1, 10),
        exames: [
          { exam_name: 'Creatinina', value: '3,2', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '96', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '5,2', unit: 'mEq/L' },
          { exam_name: 'Hemoglobina', value: '11,5', unit: 'g/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '19', unit: 'mL/min/1,73m²' },
          { exam_name: 'HbA1c', value: '7,0', unit: '%' },
          { exam_name: 'Fósforo', value: '5,2', unit: 'mg/dL' },
          { exam_name: 'PTH intacto', value: '342', unit: 'pg/mL' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'usg_rins',
        data: dateMonthsAgo(7, 15),
        laudo: 'Rim direito: 9,2 cm. Rim esquerdo: 9,0 cm. Parênquima hiperecogênico bilateral, redução da diferenciação corticomedular. Sem litíase. Bexiga com paredes espessadas — bexiga de bexiga. Compatível com nefropatia diabética avançada.',
      },
      {
        tipo: 'eco',
        data: dateMonthsAgo(4, 8),
        laudo: 'FE 54%. Hipertrofia ventricular esquerda concêntrica (septo 12mm). Disfunção diastólica grau I. Sem derrame pericárdico. Valvas sem alterações significativas. Aorta não dilatada.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Fernanda Oliveira Costa  — Síndrome nefrótica em remissão
  // ────────────────────────────────────────────────────────────
  {
    email: 'fernanda.costa@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Síndrome nefrótica', 'Proteinúria 4,2 g/24h. Edema anasarca. Albumina 2,1 g/dL.'),
          dx('Edema', 'Anasarca. Ganho de 8 kg em 3 semanas.'),
        ],
        evolucao: 'Nutricionista de 44 anos, sem comorbidades prévias. Início agudo de edema importante há 3 semanas. Proteinúria maciça (4,2 g/24h). Albumina 2,1 g/dL. Creatinina normal (0,8 mg/dL). Biópsia renal indicada para definição etiológica.',
        conduta: '1. Internação para investigação e controle do edema\n2. Furosemida 80 mg IV 2x/dia\n3. Albumina 20% 100 mL IV 12/12h\n4. Solicitar sorologias (HBsAg, anti-HCV, FAN, anti-dsDNA, complemento, ANCA)\n5. Agendar biópsia renal em caráter semi-urgente\n6. Dieta hipossódica estrita',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Síndrome nefrótica', 'Proteinúria 4,2 g/24h. Glomerulonefrite membranosa classe II à biópsia.'),
          dx('Edema', 'Reduzindo com diurético. Perdeu 5 kg desde a internação.'),
        ],
        evolucao: 'Resultado de biópsia: glomerulonefrite membranosa classe II (padrão IgG4-dominante, PLA2R positivo). Etiologia primária. Sorologias negativas. Início de imunossupressão. Edema parcialmente controlado com furosemida oral.',
        conduta: '1. Prednisona 1 mg/kg/dia (60 mg/dia)\n2. Micofenolato mofetil 1g 2x/dia\n3. Furosemida 40 mg 2x/dia VO\n4. Profilaxia: omeprazol 20 mg + calcitriol 0,25 mcg + cálcio 500 mg\n5. Monitorar glicemia (corticoide)\n6. Retorno em 30 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Síndrome nefrótica', 'Em remissão parcial. Proteinúria 1,1 g/24h. Boa resposta ao corticoide.'),
          dx('Edema', 'Resolvido. Peso basal atingido.'),
        ],
        evolucao: 'Boa resposta ao tratamento. Proteinúria caiu de 4,2 para 1,1 g/24h em 60 dias. Albumina subiu para 3,2 g/dL. Creatinina estável (0,85). Edema resolvido. Tolerando bem a prednisona, sem ganho de peso excessivo. Glicemia em jejum 108 (monitorar).',
        conduta: '1. Reduzir prednisona gradualmente — 5 mg a cada 2 semanas\n2. Manter micofenolato mofetil 1g 2x/dia\n3. Suspender furosemida (sem edema)\n4. Monitorar glicemia semanalmente\n5. Retorno em 60 dias com relação prot/creat urinária',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Síndrome nefrótica', 'Remissão completa. Proteinúria 0,18 g/24h. PLA2R negativo.'),
        ],
        evolucao: 'Remissão completa atingida. Proteinúria 0,18 g/24h, abaixo de 0,3 (critério de remissão). PLA2R agora negativo — resposta imunológica. Albumina 4,1 g/dL. Creatinina 0,82. Prednisona em desmame (atualmente 10 mg). Paciente muito satisfeita e aderiu a todas as orientações.',
        conduta: '1. Continuar desmame de prednisona: 5 mg agora, suspender em 30 dias\n2. Manter micofenolato por mais 6 meses\n3. Solicitar anti-PLA2R após 3 meses\n4. Retorno semestral — atenção a recidiva (proteinúria pode voltar)',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(8, 4),
        exames: [
          { exam_name: 'Creatinina', value: '0,80', unit: 'mg/dL' },
          { exam_name: 'Albumina sérica', value: '2,1', unit: 'g/dL' },
          { exam_name: 'Proteinúria 24h', value: '4,2', unit: 'g/24h' },
          { exam_name: 'Colesterol total', value: '285', unit: 'mg/dL' },
          { exam_name: 'LDL', value: '198', unit: 'mg/dL' },
          { exam_name: 'Hemoglobina', value: '12,8', unit: 'g/dL' },
        ],
      },
      {
        data: dateMonthsAgo(5, 9),
        exames: [
          { exam_name: 'Creatinina', value: '0,85', unit: 'mg/dL' },
          { exam_name: 'Albumina sérica', value: '3,2', unit: 'g/dL' },
          { exam_name: 'Proteinúria 24h', value: '1,1', unit: 'g/24h' },
          { exam_name: 'Colesterol total', value: '228', unit: 'mg/dL' },
        ],
      },
      {
        data: dateMonthsAgo(1, 7),
        exames: [
          { exam_name: 'Creatinina', value: '0,82', unit: 'mg/dL' },
          { exam_name: 'Albumina sérica', value: '4,1', unit: 'g/dL' },
          { exam_name: 'Proteinúria 24h', value: '0,18', unit: 'g/24h' },
          { exam_name: 'Colesterol total', value: '182', unit: 'mg/dL' },
          { exam_name: 'Glicemia de jejum', value: '98', unit: 'mg/dL' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'usg_rins',
        data: dateMonthsAgo(7, 10),
        laudo: 'Rins de dimensões e ecogenicidade normais. Rim direito: 11,2 cm; Rim esquerdo: 10,9 cm. Boa diferenciação corticomedular. Sem litíase. Sem sinais de obstrução.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Carlos Eduardo Mendes  — DRPAD + DRC 3b + HAS
  // ────────────────────────────────────────────────────────────
  {
    email: 'carlos.mendes@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Rim policístico autossômico dominante (DRPAD)', 'Diagnóstico familiar confirmado. Pai e irmão transplantados.'),
          dx('Doença renal crônica estágio 3b', 'TFG 42 mL/min/1,73m². Declínio estimado 3-4 mL/ano.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 152/96 mmHg. Início recente.'),
        ],
        evolucao: 'Advogado de 62 anos, diagnóstico de DRPAD por história familiar (pai e irmão transplantados). Crise de lombalgia foi o motivo da busca por atendimento. USG abdominal evidenciou rins policísticos volumosos. Creatinina 2,1 (TFG 42). Hipertensão em início. Sem hematúria macroscópica no momento.',
        conduta: '1. Telmisartana 80 mg 1x/dia (SRAA para nefroproteção e controle PA)\n2. Dieta com restrição de sódio e proteína moderada\n3. Hidratação adequada (> 3L/dia)\n4. Solicitar TC abdominal para volumetria renal total\n5. Avaliar elegibilidade para tolvaptana (volume renal total, TFG, progressão)\n6. Encaminhar para aconselhamento genético\n7. Retorno em 60 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Rim policístico autossômico dominante (DRPAD)', 'Volume renal total: 1.840 mL (alto risco de progressão pelo MAYO 1C).'),
          dx('Doença renal crônica estágio 3b', 'TFG 38 mL/min/1,73m². Declínio de 4 mL em 3 meses.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 138/88 mmHg. Parcialmente controlada.'),
        ],
        evolucao: 'TC abdominal: volume renal total 1.840 mL (classe MAYO 1C — alto risco). TFG reduziu 4 mL em 3 meses, confirmando progressão. Tolvaptana indicada. Paciente foi informado sobre mecanismo de ação, efeitos colaterais (poliúria, polidipsia) e necessidade de abstinência de álcool. Aceitou iniciar.',
        conduta: '1. Iniciar tolvaptana 45/15 mg (manhã/tarde) — programa TEMPO 2:4\n2. Manter telmisartana 80 mg\n3. Hidratação rigorosa ≥ 3,5 L/dia (especialmente com tolvaptana)\n4. Monitorar função hepática em 1 semana e 1 mês (hepatotoxicidade)\n5. Evitar álcool absolutamente\n6. Retorno em 30 dias para avaliação de tolerância',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Rim policístico autossômico dominante (DRPAD)', 'Em uso de tolvaptana. Boa tolerância.'),
          dx('Doença renal crônica estágio 3b', 'TFG 38 mL/min/1,73m². Estabilizado após 3 meses de tolvaptana.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 132/84 mmHg. Melhorando.'),
        ],
        evolucao: 'Boa tolerância ao tolvaptana. Refere poliúria esperada (8-10x/dia). Nega hepatotoxicidade — TGO e TGP normais. TFG estabilizou em 38 (sem queda no trimestre, contra declínio esperado). PA melhora. Creatinina 2,1. Paciente motivado para manter tratamento.',
        conduta: '1. Aumentar tolvaptana para 60/30 mg (escalonamento protocolo)\n2. Manter telmisartana\n3. Solicitar: função renal, TGO, TGP, bilirrubinas, Na, K em 1 mês\n4. Retorno em 60 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Rim policístico autossômico dominante (DRPAD)', 'Em tolvaptana 60/30 mg. Estabilidade mantida.'),
          dx('Doença renal crônica estágio 3b', 'TFG 39 mL/min/1,73m². Discreto ganho — possível efeito do tolvaptana.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 128/82 mmHg. Em alvo.'),
        ],
        evolucao: 'Controle trimestral. TFG 39 (subiu 1 ponto — provavelmente resposta hemodinâmica). Sem hepatotoxicidade (enzimas normais). PA em alvo. Sódio 140, K+ 4,1. Sem eventos de dor lombar no período. Paciente tolerando bem o regime de alta ingestão hídrica.',
        conduta: '1. Manter tolvaptana 60/30 mg\n2. Manter telmisartana 80 mg\n3. Solicitar TC abdominal para volumetria anual (referência: 1.840 mL)\n4. Retorno em 90 dias — próximo já agendado',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(11, 2),
        exames: [
          { exam_name: 'Creatinina', value: '2,1', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '55', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,6', unit: 'mEq/L' },
          { exam_name: 'Sódio', value: '140', unit: 'mEq/L' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '42', unit: 'mL/min/1,73m²' },
        ],
      },
      {
        data: dateMonthsAgo(5, 4),
        exames: [
          { exam_name: 'Creatinina', value: '2,2', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '58', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,4', unit: 'mEq/L' },
          { exam_name: 'Sódio', value: '141', unit: 'mEq/L' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '38', unit: 'mL/min/1,73m²' },
          { exam_name: 'TGO (AST)', value: '22', unit: 'U/L' },
          { exam_name: 'TGP (ALT)', value: '18', unit: 'U/L' },
        ],
      },
      {
        data: dateMonthsAgo(2, 6),
        exames: [
          { exam_name: 'Creatinina', value: '2,1', unit: 'mg/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '39', unit: 'mL/min/1,73m²' },
          { exam_name: 'Potássio', value: '4,1', unit: 'mEq/L' },
          { exam_name: 'Sódio', value: '140', unit: 'mEq/L' },
          { exam_name: 'TGO (AST)', value: '24', unit: 'U/L' },
          { exam_name: 'TGP (ALT)', value: '20', unit: 'U/L' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'tc_abdomen',
        data: dateMonthsAgo(8, 5),
        laudo: 'Rins aumentados de volume com inúmeros cistos de diversos tamanhos bilateralmente, o maior medindo 6,8 cm no rim direito. Volume renal total estimado: 1.840 mL (rim D: 985 mL, rim E: 855 mL). Fígado com 4 cistos simples, o maior com 2,2 cm. Sem sinais de complicação (hemorragia ou infecção de cisto). Classificação Mayo: 1C (alto risco de progressão).',
      },
      {
        tipo: 'usg_rins',
        data: dateMonthsAgo(10, 20),
        laudo: 'Rins policísticos volumosos bilateralmente. Rim direito: 19 cm; Rim esquerdo: 18 cm. Inúmeros cistos de diversos tamanhos. Sem litíase identificável. Sem dilatação pielocalicial.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Sílvia Aparecida Gomes  — DRC 5D (hemodiálise)
  // ────────────────────────────────────────────────────────────
  {
    email: 'silvia.gomes@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 5D (diálise)', 'Em hemodiálise 3x/semana (seg/qua/sex) no Instituto do Rim.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA interdialítica 158/96. Ajuste de medicação em andamento.'),
          dx('Anemia da doença renal crônica', 'Hb 9,8 g/dL. EPO em uso.'),
          dx('Hiperfosfatemia', 'Fósforo pré-diálise 7,4 mg/dL. Quelante insuficiente ou não aderência.'),
          dx('Hiperparatireoidismo secundário', 'PTH 680 pg/mL. Osso de alta remodelação.'),
        ],
        evolucao: 'Comerciante de 66 anos, em HD há 2 anos. Crises hipertensivas frequentes no interdialítico. Ganho de peso interdialítico médio de 3,2 kg (excessivo — ideal < 2 kg). Fósforo muito elevado apesar do quelante prescrito — investigar adesão à dieta e horário correto do quelante.',
        conduta: '1. Reforçar orientação: carbonato de cálcio deve ser tomado JUNTO com a refeição\n2. Adicionar sevelamer 800 mg 3x/dia (quelante sem cálcio)\n3. Iniciar cinacalcete 30 mg 1x/dia (hiperPTH)\n4. Ajuste de anti-hipertensivos — adicionar carvedilol 12,5 mg 2x/dia\n5. Revisão dietética urgente com nutricionista\n6. Retorno em 30 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 5D (diálise)', 'Em HD 3x/semana. Kt/V 1,4 (adequado).'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 145/88 mmHg. Melhor controle.'),
          dx('Anemia da doença renal crônica', 'Hb 10,8 g/dL. Respondendo à EPO.'),
          dx('Hiperfosfatemia', 'Fósforo 5,9 mg/dL. Melhora significativa.'),
          dx('Hiperparatireoidismo secundário', 'PTH 485 pg/mL. Reduzindo com cinacalcete.'),
        ],
        evolucao: 'Melhora importante. Fósforo caiu de 7,4 para 5,9 com sevelamer e orientação correta. PTH em queda (480). PA melhor com carvedilol. Hb subindo. Ganho de peso interdialítico ainda elevado (2,8 kg) — persistir na orientação de restrição hídrica.',
        conduta: '1. Manter sevelamer 800 mg + carbonato de cálcio 500 mg\n2. Aumentar cinacalcete para 60 mg\n3. Manter EPO — dose atual adequada\n4. Reforçar limite hídrico: 500 mL + diurese residual\n5. Retorno em 45 dias com relatório da sessão de diálise',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(7, 3),
        exames: [
          { exam_name: 'Creatinina (pré-HD)', value: '9,2', unit: 'mg/dL' },
          { exam_name: 'Ureia (pré-HD)', value: '128', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '5,8', unit: 'mEq/L' },
          { exam_name: 'Fósforo', value: '7,4', unit: 'mg/dL' },
          { exam_name: 'PTH intacto', value: '680', unit: 'pg/mL' },
          { exam_name: 'Hemoglobina', value: '9,8', unit: 'g/dL' },
          { exam_name: 'Cálcio total', value: '8,2', unit: 'mg/dL' },
          { exam_name: 'Albumina sérica', value: '3,6', unit: 'g/dL' },
        ],
      },
      {
        data: dateMonthsAgo(2, 6),
        exames: [
          { exam_name: 'Creatinina (pré-HD)', value: '8,8', unit: 'mg/dL' },
          { exam_name: 'Ureia (pré-HD)', value: '118', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '5,2', unit: 'mEq/L' },
          { exam_name: 'Fósforo', value: '5,9', unit: 'mg/dL' },
          { exam_name: 'PTH intacto', value: '485', unit: 'pg/mL' },
          { exam_name: 'Hemoglobina', value: '10,8', unit: 'g/dL' },
          { exam_name: 'Cálcio total', value: '8,8', unit: 'mg/dL' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'eco',
        data: dateMonthsAgo(4, 12),
        laudo: 'FE 48% (levemente reduzida). Hipertrofia ventricular esquerda excêntrica. Dilatação de câmara esquerda (diâmetro diastólico 58mm). Disfunção diastólica grau II. Derrame pericárdico discreto (5mm posterior). Calcificação valvar aórtica leve. Compatível com cardiomiopatia urêmica.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Jorge Luis Carvalho  — Nefropatia IgA + HAS
  // ────────────────────────────────────────────────────────────
  {
    email: 'jorge.carvalho@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Nefropatia por IgA (Berger)', 'Biópsia confirmada. Hematúria macroscópica recorrente.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 148/92 mmHg. Início precoce para a idade (38 anos).'),
          dx('Hematúria', 'Episódios de hematúria macroscópica após infecções de vias aéreas.'),
          dx('Proteinúria', '0,8 g/24h. Fator de risco para progressão.'),
        ],
        evolucao: 'Analista de sistemas de 38 anos. Hematúria macroscópica recorrente há 3 anos, sempre após episódio de infecção de vias aéreas. Biópsia renal confirmou IgA. Score Oxford: M1 E0 S1 T0 C0. Creatinina 1,3 (TFG 72). Proteinúria 0,8 g/24h — fator de risco para progressão.',
        conduta: '1. Losartana 100 mg 1x/dia (SRAA — nefroproteção e redução de proteinúria)\n2. Amigdalectomia: encaminhar para otorrinolaringologista (amígdalas são foco de infecção)\n3. Restrição de sódio e proteína moderada\n4. Ômega-3 6g/dia (evidência para IgA)\n5. Retorno em 60 dias com nova relação prot/creat',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Nefropatia por IgA (Berger)', 'Sem episódios de hematúria macroscópica após amigdalectomia.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 132/84 mmHg. Em alvo.'),
          dx('Proteinúria', '0,4 g/24h. Boa resposta ao iECA.'),
        ],
        evolucao: 'Evolução excelente. Sem novos episódios de hematúria macroscópica após amigdalectomia (realizada há 4 meses). Proteinúria caiu para 0,4 g/24h. PA em alvo. Creatinina 1,2 (TFG 78). Hematúria microscópica persistente (esperada). Paciente aderente e bem informado sobre a doença.',
        conduta: '1. Manter losartana 100 mg\n2. Manter ômega-3\n3. Aguardar resposta por mais 6 meses — se proteinúria persistir > 0,5 considerar corticoide\n4. Solicitar nova relação prot/creat em 3 meses\n5. Retorno semestral',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(11, 20),
        exames: [
          { exam_name: 'Creatinina', value: '1,3', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '32', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,2', unit: 'mEq/L' },
          { exam_name: 'Hemoglobina', value: '14,2', unit: 'g/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '72', unit: 'mL/min/1,73m²' },
          { exam_name: 'Proteinúria 24h', value: '0,8', unit: 'g/24h' },
        ],
      },
      {
        data: dateMonthsAgo(4, 3),
        exames: [
          { exam_name: 'Creatinina', value: '1,2', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '28', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,0', unit: 'mEq/L' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '78', unit: 'mL/min/1,73m²' },
          { exam_name: 'Proteinúria 24h', value: '0,4', unit: 'g/24h' },
          { exam_name: 'IgA sérica', value: '380', unit: 'mg/dL' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'usg_rins',
        data: dateMonthsAgo(10, 10),
        laudo: 'Rins de dimensões normais (D: 11,4 cm; E: 11,0 cm) e ecogenicidade preservada. Boa diferenciação corticomedular. Sem litíase ou dilatação. Bexiga sem alterações.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Lúcia Maria Fonseca  — HAS com microalbuminúria
  // ────────────────────────────────────────────────────────────
  {
    email: 'lucia.fonseca@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 162/104 mmHg. Hipertensão estágio 2. Sem tratamento prévio adequado.'),
          dx('Proteinúria', 'Microalbuminúria 85 mg/g de creatinina. Marcador de lesão de órgão-alvo renal.'),
        ],
        evolucao: 'Enfermeira de 59 anos, HAS há 10 anos em uso irregular de atenolol. PA 162/104. Microalbuminúria 85 mg/g — lesão de órgão-alvo renal. Creatinina 0,9 (TFG 72). ECG: hipertrofia de VE. Adesão ao tratamento precária (esquecimento frequente).',
        conduta: '1. Substituir atenolol por telmisartana 80 mg (SRAA — antiproteinúrico)\n2. Adicionar anlodipino 5 mg\n3. Dieta DASH — restrição de sódio\n4. Reforçar importância da adesão medicamentosa\n5. App de lembrete de medicação (sugestão: Medisafe)\n6. Retorno em 45 dias com MRPA (monitorização residencial)',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 138/88 mmHg. Melhorando com telmisartana.'),
          dx('Proteinúria', 'Microalbuminúria 42 mg/g. Queda de 50% — boa resposta ao SRAA.'),
        ],
        evolucao: 'Boa resposta ao tratamento. PA caiu de 162/104 para 138/88. Microalbuminúria reduziu 50% com telmisartana. Paciente aderiu bem — usando app de lembrete. Creatinina 0,88. K+ 4,3 — seguro. MRPA média: 134/86.',
        conduta: '1. Manter telmisartana 80 mg + anlodipino 5 mg\n2. Aumentar anlodipino para 10 mg se PA não atingir alvo em 30 dias\n3. Meta: PA < 130/80\n4. Retorno em 90 dias com microalbuminúria de controle',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(7, 8),
        exames: [
          { exam_name: 'Creatinina', value: '0,90', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,5', unit: 'mEq/L' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '72', unit: 'mL/min/1,73m²' },
          { exam_name: 'Microalbuminúria', value: '85', unit: 'mg/g creat' },
          { exam_name: 'Hemoglobina', value: '13,2', unit: 'g/dL' },
        ],
      },
      {
        data: dateMonthsAgo(2, 15),
        exames: [
          { exam_name: 'Creatinina', value: '0,88', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,3', unit: 'mEq/L' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '74', unit: 'mL/min/1,73m²' },
          { exam_name: 'Microalbuminúria', value: '42', unit: 'mg/g creat' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'ecg',
        data: dateMonthsAgo(6, 20),
        laudo: 'Ritmo sinusal, FC 72 bpm. Sobrecarga de ventrículo esquerdo (índice de Sokolov 38mm). Alteração de repolarização em V4-V6 (padrão strain). Sem sinais de isquemia aguda.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Miguel Augusto Torres  — HAS + DRC 3 + nefropatia hipertensiva
  // ────────────────────────────────────────────────────────────
  {
    email: 'miguel.torres@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 168/102 mmHg. Hipertensão estágio 2, sem tratamento.'),
          dx('Doença renal crônica estágio 3a', 'TFG 46 mL/min/1,73m². Nefropatia hipertensiva.'),
          dx('Proteinúria', 'Relação Prot/Cr 0,65 g/g. Lesão tubuloglomerular.'),
        ],
        evolucao: 'Contador de 54 anos. Descobriu a hipertensão em exame admissional há 6 anos, mas nunca tratou adequadamente. Creatinina 1,7 (TFG 46). Proteinúria 0,65 g/g. Sem sintomas urêmicos. Sem edema. Fundoscopia: retinopatia grau II. Encaminhado por clínico para avaliação nefrologica.',
        conduta: '1. Perindopril 10 mg 1x/dia + amlodipino 5 mg\n2. Dieta hipossódica (< 2g sódio/dia)\n3. Atividade física regular — mínimo 150 min/semana\n4. Meta PA < 130/80\n5. Solicitar: ecocardiograma, função renal, eletrólitos, relação Prot/Cr\n6. Retorno em 30 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 142/90 mmHg. Melhora com tratamento.'),
          dx('Doença renal crônica estágio 3a', 'TFG 48 mL/min/1,73m². Pequena melhora com controle da PA.'),
          dx('Proteinúria', 'Relação Prot/Cr 0,45 g/g. Em queda.'),
        ],
        evolucao: 'Boa resposta inicial. PA reduziu de 168/102 para 142/90. TFG subiu de 46 para 48 (melhora hemodinâmica). Proteinúria em queda. Paciente aderiu à dieta e iniciou caminhada 30 min/dia. K+ 4,4 — seguro para iECA.',
        conduta: '1. Aumentar amlodipino para 10 mg\n2. Manter perindopril 10 mg\n3. Manter restrição de sódio\n4. Retorno em 60 dias com novos exames\n5. Meta: Prot/Cr < 0,3 g/g',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(8, 10),
        exames: [
          { exam_name: 'Creatinina', value: '1,7', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '44', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,6', unit: 'mEq/L' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '46', unit: 'mL/min/1,73m²' },
          { exam_name: 'Hemoglobina', value: '14,0', unit: 'g/dL' },
        ],
      },
      {
        data: dateMonthsAgo(3, 15),
        exames: [
          { exam_name: 'Creatinina', value: '1,6', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '40', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,4', unit: 'mEq/L' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '48', unit: 'mL/min/1,73m²' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'eco',
        data: dateMonthsAgo(5, 8),
        laudo: 'FE 62%. Hipertrofia ventricular esquerda concêntrica (septo 11mm, parede posterior 11mm). Disfunção diastólica grau I. Valvas normais. Sem derrame.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Paulo Henrique Rocha  — LES + Nefrite lúpica
  // ────────────────────────────────────────────────────────────
  {
    email: 'paulo.rocha@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Lupus eritematoso sistêmico (LES)', 'Diagnóstico há 8 anos. SLEDAI atual: 4.'),
          dx('Nefrite lúpica', 'Classe III confirmada por biópsia. Creatinina 1,8.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 148/96 mmHg. Relacionada à nefrite ativa.'),
          dx('Proteinúria', '0,9 g/24h. Em atividade.'),
        ],
        evolucao: 'Paciente de 74 anos com LES de longa data. Biópsia renal confirmou nefrite lúpica classe III. Anti-dsDNA 1:160 (ativo). C3 58 mg/dL, C4 8 mg/dL (baixos). Em uso de hidroxicloroquina. Creatinina 1,8 (TFG 38). Refere artralgia e fotossensibilidade.',
        conduta: '1. Pulsoterapia com metilprednisolona 500mg IV por 3 dias\n2. Prednisona 60 mg/dia VO após pulso\n3. Micofenolato mofetil 2g/dia (indução)\n4. Manter hidroxicloroquina 400 mg/dia\n5. Losartana 50 mg (nefroproteção)\n6. Fotoproteção rigorosa\n7. Solicitar anti-dsDNA e complemento mensalmente\n8. Retorno em 30 dias',
        finalizado: true,
      },
      {
        diagnosticos: [
          dx('Lupus eritematoso sistêmico (LES)', 'SLEDAI 2. Remissão parcial.'),
          dx('Nefrite lúpica', 'Classe III em remissão. Creatinina 1,5.'),
          dx('Hipertensão arterial sistêmica (HAS)', 'PA 135/86 mmHg. Alvo atingido.'),
          dx('Proteinúria', '0,4 g/24h. Queda após indução.'),
        ],
        evolucao: 'Boa resposta à pulsoterapia. Anti-dsDNA caiu de 1:160 para 1:40. Complemento normalizando (C3 88, C4 14). Creatinina 1,5 (TFG 48). Proteinúria em queda (0,4 g). PA controlada. Paciente tolerando bem o micofenolato. Iniciando desmame gradual de corticoide.',
        conduta: '1. Reduzir prednisona: 5 mg/semana até 20 mg, depois 2,5 mg/semana\n2. Manter micofenolato 2g/dia por 6 meses (manutenção)\n3. Manter hidroxicloroquina e losartana\n4. Retorno em 60 dias com anti-dsDNA e complemento',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(10, 7),
        exames: [
          { exam_name: 'Creatinina', value: '1,8', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '44', unit: 'mg/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '38', unit: 'mL/min/1,73m²' },
          { exam_name: 'Anti-dsDNA', value: '1:160', unit: 'títulos' },
          { exam_name: 'Complemento C3', value: '58', unit: 'mg/dL' },
          { exam_name: 'Complemento C4', value: '8', unit: 'mg/dL' },
          { exam_name: 'Proteína urinária 24h', value: '0,9', unit: 'g/24h' },
          { exam_name: 'Hemoglobina', value: '10,8', unit: 'g/dL' },
        ],
      },
      {
        data: dateMonthsAgo(4, 3),
        exames: [
          { exam_name: 'Creatinina', value: '1,5', unit: 'mg/dL' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '48', unit: 'mL/min/1,73m²' },
          { exam_name: 'Anti-dsDNA', value: '1:40', unit: 'títulos' },
          { exam_name: 'Complemento C3', value: '88', unit: 'mg/dL' },
          { exam_name: 'Complemento C4', value: '14', unit: 'mg/dL' },
          { exam_name: 'Proteína urinária 24h', value: '0,4', unit: 'g/24h' },
          { exam_name: 'Hemoglobina', value: '12,2', unit: 'g/dL' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'usg_rins',
        data: dateMonthsAgo(9, 5),
        laudo: 'Rim direito: 10,2 cm; Rim esquerdo: 10,0 cm. Ecogenicidade discretamente aumentada. Boa diferenciação corticomedular. Sem litíase ou dilatação. Sem sinais de obstrução.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Renata Ferraz Duarte  — DRC 2 em investigação
  // ────────────────────────────────────────────────────────────
  {
    email: 'renata.duarte@email.com',
    consultas_prontuario: [
      {
        diagnosticos: [
          dx('Doença renal crônica estágio 2', 'TFG 72 mL/min/1,73m². Creatinina 1,0 mg/dL. Em investigação etiológica.'),
          dx('Hematúria', 'Hematúria microscópica persistente — causa a definir.'),
          dx('Proteinúria', 'Relação Prot/Cr 0,35 g/g. Sem síndrome nefrótica.'),
        ],
        evolucao: 'Designer de 33 anos, sem comorbidades. Encaminhada após exame de saúde com hematúria e proteinúria. Creatinina 1,0 (TFG 72). PA normal (118/76). USG normal. Biópsia renal indicada para definição etiológica — suspeita de nefropatia por IgA ou outras glomerulopatias primárias.',
        conduta: '1. Solicitar sorologias: FAN, anti-dsDNA, ANCA, anti-GBM, complemento, IgA sérica\n2. Urina tipo 1 + fase de eritrócitos (dismorfismo?)\n3. Agendar biópsia renal eletiva\n4. Losartana 50 mg 1x/dia — nefroproteção\n5. Retorno com resultado de sorologias em 3 semanas',
        finalizado: false,
      },
    ],
    lab_series: [
      {
        data: dateMonthsAgo(1, 5),
        exames: [
          { exam_name: 'Creatinina', value: '1,0', unit: 'mg/dL' },
          { exam_name: 'Ureia', value: '24', unit: 'mg/dL' },
          { exam_name: 'Potássio', value: '4,0', unit: 'mEq/L' },
          { exam_name: 'TFG estimada (CKD-EPI)', value: '72', unit: 'mL/min/1,73m²' },
          { exam_name: 'Hemoglobina', value: '13,8', unit: 'g/dL' },
          { exam_name: 'Proteinúria 24h', value: '0,4', unit: 'g/24h' },
          { exam_name: 'IgA sérica', value: '310', unit: 'mg/dL' },
        ],
      },
    ],
    imaging: [
      {
        tipo: 'usg_rins',
        data: dateMonthsAgo(1, 10),
        laudo: 'Rins de dimensões normais (D: 11,0 cm; E: 10,8 cm). Ecogenicidade e diferenciação corticomedular preservadas. Ausência de litíase, cistos ou malformações. Bexiga normal.',
      },
    ],
  },

]

// ── Função principal ──────────────────────────────────────────
async function main() {
  console.log('🏥  Seed de prontuários — Portal Dr. Guilherme\n')

  for (const profile of PRONTUARIOS) {
    console.log(`\n👤  ${profile.email}`)

    // 1. Buscar patient_id
    const { data: patient, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', profile.email)
      .single()

    if (pErr || !patient) {
      console.log(`  ⚠️  Paciente não encontrado — pulando`)
      continue
    }
    console.log(`  → ${patient.full_name} (${patient.id.slice(0, 8)}...)`)

    // 2. Buscar consultas realizadas (ordenadas por data asc)
    const { data: consultas } = await supabase
      .from('consultas')
      .select('id, data_hora, status')
      .eq('patient_id', patient.id)
      .in('status', ['realizada', 'confirmada', 'agendada'])
      .order('data_hora', { ascending: true })

    const realizadas = (consultas ?? []).filter(c => c.status === 'realizada')
    const templates  = profile.consultas_prontuario ?? []

    // 3. Atualizar consultas com prontuário
    for (let i = 0; i < Math.min(templates.length, realizadas.length); i++) {
      const c   = realizadas[i]
      const tmpl = templates[i]
      const payload = {
        diagnosticos:             JSON.stringify(tmpl.diagnosticos),
        evolucao:                 tmpl.evolucao,
        conduta:                  tmpl.conduta,
        prontuario_finalizado:    tmpl.finalizado ?? false,
        prontuario_finalizado_at: tmpl.finalizado ? new Date().toISOString() : null,
        updated_at:               new Date().toISOString(),
      }
      const res = await supabase.from('consultas').update(payload).eq('id', c.id)
      ok(`Prontuário consulta ${i + 1}${tmpl.finalizado ? ' [🔒 finalizado]' : ' [rascunho]'}`, res)
    }

    // 4. Inserir lab_results
    if (profile.lab_series?.length) {
      const labRows = []
      for (const serie of profile.lab_series) {
        for (const exame of serie.exames) {
          labRows.push({
            id:           uuid(),
            patient_id:   patient.id,
            consulta_id:  null,
            exam_name:    exame.exam_name,
            value:        exame.value,
            unit:         exame.unit ?? null,
            collected_at: serie.data,
            created_at:   new Date().toISOString(),
          })
        }
      }
      const res = await supabase
        .from('lab_results')
        .upsert(labRows, { onConflict: 'patient_id,exam_name,collected_at' })
      ok(`${labRows.length} resultados laboratoriais`, res)
    }

    // 5. Inserir imaging_results
    if (profile.imaging?.length) {
      const imgRows = profile.imaging.map(img => ({
        id:             uuid(),
        patient_id:     patient.id,
        tipo:           img.tipo,
        data_realizado: img.data,
        laudo_resumido: img.laudo ?? null,
        created_at:     new Date().toISOString(),
      }))
      const res = await supabase
        .from('imaging_results')
        .upsert(imgRows, { onConflict: 'id' })
      ok(`${imgRows.length} exame(s) de imagem`, res)
    }
  }

  console.log('\n✅  Seed de prontuários concluído!\n')
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1) })
