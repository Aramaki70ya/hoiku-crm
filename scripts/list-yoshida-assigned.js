/**
 * 吉田さんの担当求職者をDBから取得して人数と名前を羅列
 *   node scripts/list-yoshida-assigned.js
 */
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('.env.local が見つかりません')
    process.exit(1)
  }
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return
    const m = t.match(/^([^=]+)=(.*)$/)
    if (m) {
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[m[1].trim()] = v
    }
  })
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('env 未設定')
    process.exit(1)
  }
  const supabase = createClient(url, key)

  const { data: users } = await supabase.from('users').select('id, name').eq('name', '吉田')
  if (!users?.length) {
    console.log('吉田 が見つかりません')
    return
  }
  const yoshidaId = users[0].id

  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('id, name, registered_at')
    .eq('consultant_id', yoshidaId)
    .order('name', { ascending: true })

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  const list = candidates || []
  console.log('吉田さん 担当: ' + list.length + ' 人\n')
  list.forEach((c, i) => {
    console.log((i + 1) + '. ' + c.name + ' (id: ' + c.id + ', 登録: ' + (c.registered_at || '-') + ')')
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
