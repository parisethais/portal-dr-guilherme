/**
 * migrate-iclinic.js
 * Migra o export do iClinic para o Portal Dr. Guilherme (Supabase).
 *
 * Uso:
 *   node scripts/migrate-iclinic.js            → dry-run (mostra o que faria, sem escrever)
 *   node scripts/migrate-iclinic.js --live     → executa de verdade
 *   node scripts/migrate-iclinic.js --step=1   → só pacientes
 *   node scripts/migrate-iclinic.js --step=2   → só agendamentos (precisa do id-map)
 *   node scripts/migrate-iclinic.js --step=3   → só prontuários  (precisa do id-map)
 *
 * Requer:
 *   NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local
 */

const fs   = require('fs')
const path = require('path')

// ── Carrega .env.local ────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const { createClient } = require('@supabase/supabase-js')

// ── Config ────────────────────────────────────────────────────────────────

const EXPORT_DIR = path.resolve(process.env.HOME, 'Downloads/202225-guilhermepsantacatharina-19-05-2026-all')
const CLINIC_ID  = 'c1000000-0000-0000-0000-000000000001'
const DOCTOR_ID  = 'b892c4bf-7a5c-4afb-a1fd-a3e1f3f36bca'
const ID_MAP_FILE = path.resolve(__dirname, 'iclinic-id-map.json')
const CRED_FILE   = path.resolve(__dirname, 'patient-credentials.csv')
const ERR_FILE    = path.resolve(__dirname, 'migrate-errors.log')

const DRY_RUN = !process.argv.includes('--live')
const STEP    = (() => { const s = process.argv.find(a => a.startsWith('--step=')); return s ? parseInt(s.split('=')[1]) : null })()
const BATCH   = 10 // usuários criados por vez (evita rate limit)

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ Variáveis de ambiente não encontradas.')
  console.error('   Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local\n')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Mapeamentos ───────────────────────────────────────────────────────────

const STATUS_MAP = {
  cp: 'realizada',   // completed/paid
  sc: 'confirmada',  // scheduled/confirmed
  re: 'agendada',    // rescheduled
  eo: 'falta',       // no-show
  ec: 'cancelada',   // cancelled
  cw: 'agendada',
  ow: 'agendada',
  co: 'agendada',
}

const TIPO_MAP = {
  'Primeira Consulta':          'primeira_consulta',
  'Retorno Gratuito':           'retorno',
  'Nova Consulta':              'nova_consulta',
  'Reunião':                    'nova_consulta',
  'Consulta com desconto':      'nova_consulta_desconto',
  'Consulta Excepcional':       'nova_consulta',
  'Exame':                      'nova_consulta',
}

// ── Helpers ───────────────────────────────────────────────────────────────

function parseJsonPack(s) {
  if (!s || !s.startsWith('json::')) return null
  try { return JSON.parse(s.slice(6)) } catch { return null }
}

function genPassword() {
  return 'Portal' + String(Math.floor(1000 + Math.random() * 9000))
}

function buildEndereco(r) {
  const parts = [
    r.address ? (r.number ? `${r.address}, ${r.number}` : r.address) : null,
    r.complement || null,
    r.neighborhood || null,
    r.city ? (r.state ? `${r.city} - ${r.state}` : r.city) : null,
  ].filter(Boolean)
  return parts.join(', ')
}

function buildEmail(r) {
  if (r.email && r.email.includes('@')) return r.email.toLowerCase().trim()
  const slug = (r.name || 'paciente')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/, '')
    .slice(0, 30)
  return `noreply.${r.patient_id}.${slug}@iclinic.medrenal.internal`
}

function logError(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  fs.appendFileSync(ERR_FILE, line)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── CSV Parser (sem dependências externas) ────────────────────────────────

function parseCsv(content) {
  // Fase 1: divide em linhas LÓGICAS respeitando aspas.
  // Preserva todos os caracteres (incluindo aspas) para a fase 2.
  const lines = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch   = content[i]
    const next = content[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '""'; i++          // preserva "" escapado
      } else {
        inQuotes = !inQuotes
        current += '"'                 // preserva a aspas delimitadora
      }
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current); current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) lines.push(current)

  // Fase 2: quebra cada linha em campos, processando aspas CSV
  const parseRow = (line) => {
    const raw = line.endsWith('\r') ? line.slice(0, -1) : line
    const fields = []
    let field = ''
    let inQ = false
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]
      const nx = raw[i + 1]
      if (ch === '"') {
        if (inQ && nx === '"') { field += '"'; i++ }  // "" → "
        else inQ = !inQ                                 // abre/fecha campo quoted
      } else if (ch === ',' && !inQ) {
        fields.push(field); field = ''
      } else {
        field += ch
      }
    }
    fields.push(field)
    return fields
  }

  const headers = parseRow(lines[0])
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim() })
    return obj
  })
}

function readCsv(filename) {
  const file = path.join(EXPORT_DIR, filename)
  console.log(`   Lendo ${path.basename(file)}...`)
  const content = fs.readFileSync(file, 'utf-8')
  return parseCsv(content)
}

// ── ID Map (persiste entre steps) ─────────────────────────────────────────

function loadIdMap() {
  if (fs.existsSync(ID_MAP_FILE)) {
    return JSON.parse(fs.readFileSync(ID_MAP_FILE, 'utf-8'))
  }
  return { patients: {}, consultas: {} }
}

function saveIdMap(map) {
  fs.writeFileSync(ID_MAP_FILE, JSON.stringify(map, null, 2))
}

// ── Step 1: Pacientes ─────────────────────────────────────────────────────

async function migratePatients(rows, idMap) {
  console.log(`\n👥 STEP 1 — Migrando ${rows.length} pacientes...`)

  const credentials = ['nome,email,senha,tem_email_real']
  let created = 0, skipped = 0, errors = 0

  // Checar quais já foram migrados
  const alreadyMapped = new Set(Object.keys(idMap.patients))

  const todo = rows.filter(r => !alreadyMapped.has(r.patient_id))
  console.log(`   ${alreadyMapped.size} já migrados, ${todo.length} a processar`)

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)

    for (const r of batch) {
      const email    = buildEmail(r)
      const password = genPassword()
      const hasReal  = !!(r.email && r.email.includes('@'))

      const summary       = parseJsonPack(r.summary_pack)
      const healthins     = parseJsonPack(r.healthinsurance_pack)
      const convenio      = healthins?.[0]?.name || 'Particular'

      const obs = [
        r.observation,
        r.indication       ? `Indicação: ${r.indication}` : null,
        r.indication_observation,
        convenio !== 'Particular' ? `Convênio: ${convenio}` : null,
        summary?.[0]?.summary,
      ].filter(Boolean).join('\n')

      const profileData = {
        role:             'paciente',
        full_name:        r.name || r.civil_name || 'Paciente',
        email,
        cpf:              r.cpf  || null,
        phone:            r.mobile_phone || r.home_phone || null,
        data_nascimento:  r.birthdate || null,
        sexo:             r.gender === 'm' ? 'M' : r.gender === 'f' ? 'F' : null,
        cep:              r.zip_code || null,
        endereco:         buildEndereco(r) || null,
        cns:              r.cns || null,
        profissao:        r.occupation || null,
        obs_secretaria:   obs || null,
        como_conheceu:    r.indication || null,
        diagnostico:      summary?.[0]?.summary || null,
        status_paciente:  r.died === 'True' ? 'obito' : r.active === 'True' ? 'ativo' : 'inativo',
        clinic_id:        CLINIC_ID,
        lgpd_accepted:    false,
        perfil_completo:  true,
      }

      if (DRY_RUN) {
        idMap.patients[r.patient_id] = `dry-${r.patient_id}`
        credentials.push(`"${r.name}","${email}","${password}",${hasReal}`)
        created++
        if (created <= 5) console.log(`   [DRY] ${r.name} → ${email}`)
        continue
      }

      try {
        // Verificar se perfil com esse email já existe
        const { data: existing } = await supabase
          .from('profiles').select('id').eq('email', email).maybeSingle()

        if (existing) {
          idMap.patients[r.patient_id] = existing.id
          skipped++
          continue
        }

        // Criar usuário no Auth
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: profileData.full_name },
        })

        if (authErr) {
          // Se já existe no auth, tenta buscar pelo email
          if (authErr.message?.includes('already')) {
            const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
            const found = users?.find(u => u.email === email)
            if (found) {
              idMap.patients[r.patient_id] = found.id
              await supabase.from('profiles').upsert({ id: found.id, ...profileData })
              skipped++
              continue
            }
          }
          logError(`Auth error ${email}: ${authErr.message}`)
          errors++
          continue
        }

        const userId = authData.user.id

        // Inserir perfil
        const { error: profErr } = await supabase
          .from('profiles')
          .upsert({ id: userId, ...profileData })

        if (profErr) {
          logError(`Profile error ${email}: ${profErr.message}`)
          errors++
          continue
        }

        idMap.patients[r.patient_id] = userId
        credentials.push(`"${r.name}","${email}","${password}",${hasReal}`)
        created++

      } catch (e) {
        logError(`Unexpected error ${r.patient_id}: ${e.message}`)
        errors++
      }
    }

    // Salva progresso a cada batch
    saveIdMap(idMap)
    if ((i + BATCH) % 100 === 0 || i + BATCH >= todo.length) {
      process.stdout.write(`   ... ${Math.min(i + BATCH, todo.length)}/${todo.length} (${errors} erros)\r`)
    }
    if (!DRY_RUN) await sleep(200) // respeita rate limit
  }

  console.log(`\n   ✅ Criados: ${created} | Já existiam: ${skipped} | Erros: ${errors}`)

  if (credentials.length > 1) {
    fs.writeFileSync(CRED_FILE, credentials.join('\n'))
    console.log(`   📄 Credenciais → scripts/patient-credentials.csv`)
  }
}

// ── Step 2: Agendamentos ──────────────────────────────────────────────────

async function migrateScheduling(rows, idMap) {
  console.log(`\n📅 STEP 2 — Migrando ${rows.length} agendamentos...`)

  let created = 0, skipped = 0, errors = 0
  const alreadyMapped = new Set(Object.keys(idMap.consultas))

  const todo = rows.filter(r => !alreadyMapped.has(r.pk))
  console.log(`   ${alreadyMapped.size} já migrados, ${todo.length} a processar`)

  for (const r of todo) {
    const patientId = idMap.patients[r.patient_id]
    if (!patientId || patientId.startsWith('dry-')) {
      if (!DRY_RUN) { skipped++; continue }
    }

    const procedure   = parseJsonPack(r.procedure_pack)
    const extra       = parseJsonPack(r.extra_pack)
    const procName    = procedure?.[0]?.name || 'Nova Consulta'
    const tipo        = TIPO_MAP[procName] || 'nova_consulta'
    const status      = STATUS_MAP[r.status] || 'realizada'
    const duracao     = parseInt(extra?.duration || procedure?.[0]?.duration || '30') || 30
    const dataHora    = `${r.date}T${r.start_time || '08:00:00'}`
    const realizada   = status === 'realizada'

    if (DRY_RUN) {
      idMap.consultas[r.pk] = `dry-${r.pk}`
      created++
      if (created <= 5) console.log(`   [DRY] ${r.patient_name} | ${r.date} | ${tipo} | ${status}`)
      continue
    }

    try {
      const { data, error } = await supabase
        .from('consultas')
        .insert({
          patient_id:              patientId,
          tipo,
          local:                   'consultorio',
          data_hora:               dataHora,
          duracao_min:             duracao,
          status,
          created_by:              DOCTOR_ID,
          prontuario_finalizado:   realizada,
          prontuario_finalizado_at: realizada ? new Date(dataHora).toISOString() : null,
        })
        .select('id')
        .single()

      if (error) { logError(`Consulta ${r.pk}: ${error.message}`); errors++; continue }

      idMap.consultas[r.pk] = data.id
      created++

    } catch (e) {
      logError(`Consulta unexpected ${r.pk}: ${e.message}`)
      errors++
    }
  }

  saveIdMap(idMap)
  console.log(`   ✅ Criados: ${created} | Sem paciente: ${skipped} | Erros: ${errors}`)
}

// ── Step 3: Prontuários ───────────────────────────────────────────────────

async function migrateRecords(rows, idMap) {
  console.log(`\n📝 STEP 3 — Migrando ${rows.length} registros de prontuário...`)

  let labTotal = 0, docsTotal = 0, notesTotal = 0, errors = 0

  for (let i = 0; i < rows.length; i++) {
    const r         = rows[i]
    const patientId = idMap.patients[r.patient_id]
    const consultaId = idMap.consultas[r.pk]

    if (!patientId) { errors++; continue }

    const blocks = parseJsonPack(r.eventblock_pack)
    if (!blocks) continue

    const allBlocks = blocks.block || []

    // ── Notas da consulta → evolução / conduta / diagnósticos ─────────────

    const evolucaoBlocks = allBlocks
      .filter(b => b.tab === 'Consulta')
      .sort((a, b) => a.ordering - b.ordering)
      .map(b => `**${b.name}:**\n${b.value}`)
    const evolucao = evolucaoBlocks.join('\n\n') || null

    const condutaBlocks = allBlocks
      .filter(b => b.tab === 'Condutas')
      .sort((a, b) => a.ordering - b.ordering)
      .map(b => b.value)
    const conduta = condutaBlocks.join('\n\n') || null

    const diagBlocks = allBlocks.filter(b => b.tab === 'Diagnósticos')
    const diagnosticos = diagBlocks.length
      ? diagBlocks.map(b => ({ nome: b.value, cid: '' }))
      : null

    if (!DRY_RUN && consultaId && (evolucao || conduta || diagnosticos)) {
      const { error } = await supabase
        .from('consultas')
        .update({ evolucao, conduta, diagnosticos })
        .eq('id', consultaId)
      if (!error) notesTotal++
      else logError(`Notes ${r.pk}: ${error.message}`)
    } else if (DRY_RUN && (evolucao || conduta || diagnosticos)) {
      notesTotal++
    }

    // ── Exames laboratoriais → lab_results ────────────────────────────────

    const labBlocks = allBlocks.filter(b =>
      b.tab === 'Exames Laboratoriais' && b.kind === 'nu' && b.value
    )

    for (const lab of labBlocks) {
      if (DRY_RUN) { labTotal++; continue }

      const { error } = await supabase
        .from('lab_results')
        .upsert({
          patient_id:   patientId,
          consulta_id:  consultaId || null,
          exam_name:    lab.name,
          value:        lab.value,
          unit:         lab.unity || '',
          collected_at: r.date,
        }, { onConflict: 'patient_id,exam_name,collected_at' })

      if (!error) labTotal++
      else { logError(`Lab ${lab.name} p${r.patient_id}: ${error.message}`); errors++ }
    }

    // ── Documentos (atestados, prescrições, solicitações) → documents ──────

    // Atestados
    for (const doc of blocks.attest || []) {
      docsTotal++
      if (DRY_RUN) continue
      await supabase.from('documents').insert({
        patient_id:  patientId,
        uploaded_by: DOCTOR_ID,
        title:       doc.name || 'Atestado',
        description: `iClinic • ${r.date}`,
        file_url:    null,
        file_name:   null,
        file_type:   'text/html',
      })
    }

    // Prescrições e medicações (como texto no description)
    const textDocs = allBlocks.filter(b =>
      ['Prescrição', 'Medicações', 'Solicitação de exames'].includes(b.tab)
    )
    for (const doc of textDocs) {
      docsTotal++
      if (DRY_RUN) continue
      await supabase.from('documents').insert({
        patient_id:  patientId,
        uploaded_by: DOCTOR_ID,
        title:       `${doc.tab} — ${r.date}`,
        description: doc.value?.replace(/<[^>]+>/g, '').slice(0, 500) || '',
        file_url:    null,
        file_name:   null,
        file_type:   'text/plain',
      })
    }

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`   ... ${i + 1}/${rows.length}\r`)
    }
  }

  console.log(`\n   ✅ Exames laboratoriais: ${labTotal}`)
  console.log(`   ✅ Notas de consulta: ${notesTotal}`)
  console.log(`   ✅ Documentos/atestados: ${docsTotal}`)
  if (errors > 0) console.log(`   ❌ Erros: ${errors} (ver scripts/migrate-errors.log)`)
}

// ── Resumo do dry run ─────────────────────────────────────────────────────

async function dryRunSummary(patients, scheduling, records) {
  console.log('\n' + '═'.repeat(60))
  console.log('📊 RESUMO DO DRY RUN')
  console.log('═'.repeat(60))

  // Análise de emails reais vs placeholder
  const withEmail    = patients.filter(r => r.email && r.email.includes('@')).length
  const withoutEmail = patients.length - withEmail

  console.log(`\n👥 Pacientes (${patients.length}):`)
  console.log(`   ${withEmail} com e-mail real (receberão acesso)`)
  console.log(`   ${withoutEmail} sem e-mail (receberão e-mail placeholder)`)
  console.log(`   ${patients.filter(r => r.died === 'True').length} falecidos`)
  console.log(`   ${patients.filter(r => r.cpf).length} com CPF`)

  // Análise de consultas
  const statusCounts = {}
  for (const r of scheduling) {
    const s = STATUS_MAP[r.status] || r.status
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }
  console.log(`\n📅 Agendamentos (${scheduling.length}):`)
  for (const [k, v] of Object.entries(statusCounts)) {
    console.log(`   ${k}: ${v}`)
  }

  // Análise de prontuários
  let labCount = 0, docCount = 0, noteCount = 0
  for (const r of records) {
    const blocks = parseJsonPack(r.eventblock_pack)
    if (!blocks) continue
    const all = blocks.block || []
    labCount  += all.filter(b => b.tab === 'Exames Laboratoriais' && b.kind === 'nu').length
    docCount  += (blocks.attest || []).length + all.filter(b => ['Prescrição','Medicações','Solicitação de exames'].includes(b.tab)).length
    noteCount += all.filter(b => ['Consulta','Condutas','Diagnósticos'].includes(b.tab)).length
  }

  console.log(`\n📝 Prontuários (${records.length} consultas):`)
  console.log(`   ${labCount.toLocaleString()} resultados de exames laboratoriais`)
  console.log(`   ${noteCount.toLocaleString()} notas clínicas (evolução/conduta/diagnóstico)`)
  console.log(`   ${docCount.toLocaleString()} documentos (atestados/prescrições/solicitações)`)

  console.log('\n' + '═'.repeat(60))
  console.log('💡 Para executar:')
  console.log('   node scripts/migrate-iclinic.js --live')
  console.log('   node scripts/migrate-iclinic.js --live --step=1  (só pacientes)')
  console.log('   node scripts/migrate-iclinic.js --live --step=2  (só agendamentos)')
  console.log('   node scripts/migrate-iclinic.js --live --step=3  (só prontuários)')
  console.log('═'.repeat(60) + '\n')
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Migração iClinic → Portal Dr. Guilherme')
  console.log(`   Modo: ${DRY_RUN ? '🔍 DRY RUN — sem escrita no banco' : '⚡ LIVE — escrevendo no banco!'}`)
  if (STEP) console.log(`   Step: ${STEP}`)
  console.log(`   Export: ${EXPORT_DIR}\n`)

  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Pasta do export não encontrada: ${EXPORT_DIR}`)
    process.exit(1)
  }

  // Limpa log de erros a cada run
  if (!DRY_RUN) fs.writeFileSync(ERR_FILE, '')

  // Lê CSVs
  console.log('📂 Lendo arquivos CSV...')
  const patients   = (!STEP || STEP === 1) ? readCsv('19-05-2026-patient.csv') : []
  const scheduling = (!STEP || STEP === 2) ? readCsv('19-05-2026-event_scheduling.csv') : []
  const records    = (!STEP || STEP === 3) ? readCsv('19-05-2026-event_record.csv') : []

  // Dry run: só mostra resumo
  if (DRY_RUN) {
    const p = patients.length ? patients : readCsv('19-05-2026-patient.csv')
    const s = scheduling.length ? scheduling : readCsv('19-05-2026-event_scheduling.csv')
    const r = records.length ? records : readCsv('19-05-2026-event_record.csv')
    await dryRunSummary(p, s, r)
    return
  }

  // Carrega mapa de IDs (persiste entre runs/steps)
  const idMap = loadIdMap()

  if (!STEP || STEP === 1) await migratePatients(patients, idMap)
  if (!STEP || STEP === 2) await migrateScheduling(scheduling, idMap)
  if (!STEP || STEP === 3) await migrateRecords(records, idMap)

  saveIdMap(idMap)

  console.log('\n' + '═'.repeat(60))
  console.log('✅ MIGRAÇÃO CONCLUÍDA!')
  if (fs.existsSync(CRED_FILE)) {
    console.log(`\n📄 Credenciais dos pacientes salvas em:`)
    console.log(`   scripts/patient-credentials.csv`)
    console.log(`\n   ⚠️  Compartilhe com cuidado — contém senhas temporárias!`)
  }
  if (fs.existsSync(ERR_FILE) && fs.statSync(ERR_FILE).size > 0) {
    console.log(`\n⚠️  Alguns erros ocorreram. Veja:`)
    console.log(`   scripts/migrate-errors.log`)
  }
  console.log('═'.repeat(60) + '\n')
}

main().catch(e => {
  console.error('\n❌ Erro fatal:', e.message)
  logError(`FATAL: ${e.message}\n${e.stack}`)
  process.exit(1)
})
