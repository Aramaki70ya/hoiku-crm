/**
 * Verify Itou Reika's registered_at field
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

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const { data, error } = await supabase
    .from('candidates')
    .select('id, name, registered_at, created_at, updated_at')
    .eq('id', '20208134')

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  if (data && data.length > 0) {
    const candidate = data[0]
    console.log('\n✅ 伊藤 玲香の情報:')
    console.log(`  ID: ${candidate.id}`)
    console.log(`  氏名: ${candidate.name}`)
    console.log(`  登録日: ${candidate.registered_at}`)
    console.log(`  登録日時: ${candidate.created_at}`)
    console.log(`  更新日時: ${candidate.updated_at}`)
  } else {
    console.log('No candidate found with ID 20208134')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
