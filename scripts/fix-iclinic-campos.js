/**
 * fix-iclinic-campos.js
 * Corrige dois campos que vieram errados na migração do iClinic:
 *
 *  1. como_conheceu  → usa indication_observation (texto real) em vez do código (pf, ot…)
 *  2. obs_secretaria → limpa o lixo de migração ("Indicação: pf", convênio, summary)
 *                      e mantém SOMENTE o campo `observation` original do iClinic
 *                      (que é a nota real da secretaria, ex: "só pode às terças")
 *
 * Uso:
 *   node scripts/fix-iclinic-campos.js           → dry-run (mostra o que faria)
 *   node scripts/fix-iclinic-campos.js --live    → executa
 */

const fs   = require('fs')
const path = require('path')

// Carrega .env.local
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const { createClient } = require('@supabase/supabase-js')

const EXPORT_DIR  = path.resolve(process.env.HOME, 'Downloads/202225-guilhermepsantacatharina-19-05-2026-all')
const ID_MAP_FILE = path.resolve(__dirname, 'iclinic-id-map.json')
const DRY_RUN     = !process.argv.includes('--live')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas. Verifique .env.local')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Parser CSV (reutiliza lógica do migrate-iclinic) ─────────────────────────

function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch   = line[i]
    const next = line[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const lines = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < raw.length; i++) {
    const ch   = raw[i]
    const next = raw[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
      current += ch
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current); current = ''
    } else {
      current += ch
    }
  }
  if (current) lines.push(current)

  const headers = parseCsvLine(lines[0])
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCsvLine(line)
    const obj  = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim() })
    return obj
  })
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧 fix-iclinic-campos.js — modo: ${DRY_RUN ? 'DRY-RUN (sem alterações)' : '🔴 LIVE'}`)
  console.log('─'.repeat(60))

  // Carrega id-map (patient_id iClinic → UUID Supabase)
  if (!fs.existsSync(ID_MAP_FILE)) {
    console.error('❌ iclinic-id-map.json não encontrado. Execute a migração primeiro.')
    process.exit(1)
  }
  const idMap = JSON.parse(fs.readFileSync(ID_MAP_FILE, 'utf-8'))

  // Lê CSV de pacientes
  const csvFile = path.join(EXPORT_DIR, '19-05-2026-patient.csv')
  console.log(`📂 Lendo ${csvFile}`)
  const rows = parseCsv(csvFile)
  console.log(`   ${rows.length} pacientes no CSV\n`)

  let updates = 0, skipped = 0, errors = 0

  for (const r of rows) {
    const supabaseId = idMap.patients?.[r.patient_id]
    if (!supabaseId) { skipped++; continue }

    // ── como_conheceu ─────────────────────────────────────────────────────────
    // Usa indication_observation (texto real) quando disponível.
    // Se não tiver, usa rótulo legível para o código.
    const CODE_LABEL = {
      'in': 'Internet',
      'ho': 'Hospital',
      'pi': 'Indicação de paciente',
      'pf': 'Indicação médica',
      'pg': 'Indicação médica',
      'ot': 'Outro',
    }
    const indObs  = r.indication_observation?.trim() || null
    const indCode = r.indication?.trim() || null
    const comoConheceu = indObs || (indCode ? CODE_LABEL[indCode] ?? null : null)

    // ── obs_secretaria ────────────────────────────────────────────────────────
    // SOMENTE o campo `observation` original do iClinic (nota real da secretaria).
    // Remove tudo que o script de migração adicionou: "Indicação:", convênio, summary.
    const obsSecretaria = r.observation?.trim() || null

    const hasChanges = comoConheceu !== undefined || obsSecretaria !== undefined

    if (DRY_RUN) {
      if (updates < 10) {
        console.log(`  ${r.name?.slice(0,30).padEnd(30)} | como_conheceu: ${String(comoConheceu ?? '—').slice(0,30)} | obs: ${String(obsSecretaria ?? '—').slice(0,30)}`)
      }
      updates++
      continue
    }

    // Live: atualiza no banco
    const { error } = await supabase
      .from('profiles')
      .update({
        como_conheceu:  comoConheceu,
        obs_secretaria: obsSecretaria,
      })
      .eq('id', supabaseId)

    if (error) {
      console.error(`  ❌ ${r.name}: ${error.message}`)
      errors++
    } else {
      updates++
      if (updates % 100 === 0) console.log(`  ✅ ${updates} atualizados...`)
    }
  }

  console.log('\n' + '─'.repeat(60))
  if (DRY_RUN) {
    console.log(`📋 Dry-run: ${updates} pacientes seriam atualizados, ${skipped} sem id-map`)
    console.log('\n▶  Para aplicar: node scripts/fix-iclinic-campos.js --live')
  } else {
    console.log(`✅ ${updates} pacientes atualizados`)
    console.log(`⚠️  ${errors} erros | ${skipped} sem mapeamento`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
