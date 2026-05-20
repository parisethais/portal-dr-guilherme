/**
 * migrate-obs-consulta.js
 *
 * Extrai a observação de consulta da migração do iClinic.
 *
 * Regra: se o campo `evolucao` começa com conteúdo em <em> ou <i>
 * (antes de qualquer outro bloco de texto), esse conteúdo é a observação
 * pessoal do médico — salva em `obs_consulta` e remove do início de `evolucao`.
 *
 * Uso:
 *   node scripts/migrate-obs-consulta.js           → dry-run
 *   node scripts/migrate-obs-consulta.js --live    → aplica no banco
 */

const fs   = require('fs')
const path = require('path')

const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const { createClient } = require('@supabase/supabase-js')
const DRY_RUN = !process.argv.includes('--live')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Extrai texto de <em>...</em> ou <i>...</i> no INÍCIO do HTML.
 * Ignora tags <p> e <br> vazios que aparecem antes.
 * Retorna { obs, evolucaoLimpa } ou null se não encontrar.
 */
function extrairObsInicial(html) {
  if (!html) return null

  // Remove espaços e tags vazias do início: <p></p>, <p><br></p>, <br>
  let s = html.trim()
  s = s.replace(/^(<p>(\s|<br\s*\/?>)*<\/p>\s*|<br\s*\/?>\s*)*/i, '')

  // Verifica se o primeiro conteúdo real é <em> ou <i>
  const match = s.match(/^<(em|i)>([\s\S]*?)<\/\1>/i)
  if (!match) return null

  const obsText = match[2]
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!obsText) return null

  // Remove o bloco inicial do evolucao
  // Pode estar dentro de <p><em>...</em></p>
  let evolucaoLimpa = html

  // Tenta remover <p><em>...</em></p> ou <p><i>...</i></p> do início
  evolucaoLimpa = evolucaoLimpa.replace(
    /^(\s*<p>(\s|<br\s*\/?>)*<\/p>\s*)*\s*<p>\s*<(em|i)>[\s\S]*?<\/\3>\s*<\/p>\s*/i,
    ''
  )
  // Ou só <em>...</em> sem <p>
  if (evolucaoLimpa === html) {
    evolucaoLimpa = evolucaoLimpa.replace(
      /^(\s*<p>(\s|<br\s*\/?>)*<\/p>\s*)*\s*<(em|i)>[\s\S]*?<\/\3>\s*/i,
      ''
    )
  }

  return { obs: obsText, evolucaoLimpa: evolucaoLimpa.trim() || null }
}

async function main() {
  console.log(`\n🔧 migrate-obs-consulta.js — modo: ${DRY_RUN ? 'DRY-RUN' : '🔴 LIVE'}`)
  console.log('─'.repeat(60))

  // Busca todas as consultas com evolucao preenchida e obs_consulta ainda vazia
  const { data: consultas, error } = await supabase
    .from('consultas')
    .select('id, evolucao, obs_consulta')
    .not('evolucao', 'is', null)
    .is('obs_consulta', null)

  if (error) { console.error('Erro ao buscar consultas:', error.message); process.exit(1) }

  console.log(`📋 ${consultas.length} consultas com evolucao preenchida e obs_consulta vazia\n`)

  let found = 0, updated = 0, errors = 0

  for (const c of consultas) {
    const result = extrairObsInicial(c.evolucao)
    if (!result) continue

    found++
    console.log(`  → ${c.id.slice(0, 8)}...`)
    console.log(`     obs: "${result.obs.slice(0, 80)}"`)
    if (DRY_RUN) continue

    const { error: err } = await supabase
      .from('consultas')
      .update({
        obs_consulta:  result.obs,
        evolucao:      result.evolucaoLimpa,
      })
      .eq('id', c.id)

    if (err) { console.error(`     ❌ ${err.message}`); errors++ }
    else { updated++; console.log('     ✅ ok') }
  }

  console.log('\n' + '─'.repeat(60))
  if (DRY_RUN) {
    console.log(`📋 Dry-run: ${found} consultas teriam obs_consulta extraída`)
    console.log('\n▶  Para aplicar: node scripts/migrate-obs-consulta.js --live')
  } else {
    console.log(`✅ ${updated} atualizadas | ❌ ${errors} erros`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
