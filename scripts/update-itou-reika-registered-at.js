/**
 * Update Itou Reika: set registered_at to 2026-05-15 on production Supabase.
 *
 * Usage: node scripts/update-itou-reika-registered-at.js
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local:', envPath)
    process.exit(1)
  }
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const m = trimmed.match(/^([^=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    }
  })
}

const REGISTERED_AT = '2026-05-15'
const NAME_PRIMARY = '伊藤 玲香'
const NAME_ALT = '伊藤玲香'

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY が .env.local にありません。'
    )
    process.exit(1)
  }

  const supabase = createClient(url, key)

  // Search for existing candidate
  for (const name of [NAME_PRIMARY, NAME_ALT]) {
    const { data: rows, error: findErr } = await supabase
      .from('candidates')
      .select('id, name, registered_at')
      .ilike('name', `%${name.replace(/\s+/g, '%')}%`)
      .limit(10)

    if (findErr) {
      console.error('Search error:', findErr.message)
      process.exit(1)
    }

    if (rows && rows.length > 0) {
      console.log(`Found ${rows.length} candidate(s):`)
      for (const c of rows) {
        console.log(`  - ${c.name} (id: ${c.id}, registered_at: ${c.registered_at})`)
      }

      // Update the first matching candidate
      const c = rows[0]
      const { error: updateErr } = await supabase
        .from('candidates')
        .update({ registered_at: REGISTERED_AT })
        .eq('id', c.id)

      if (updateErr) {
        console.error('Update error:', updateErr.message)
        process.exit(1)
      }
      console.log(`\nOK updated registered_at: ${c.name} (id: ${c.id}) -> ${REGISTERED_AT}`)
      return
    }
  }

  console.log(`No candidate found with name containing "${NAME_PRIMARY}"`)
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
