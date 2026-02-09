/**
 * 当月（2月）に登録した かつ 担当が瀧澤 の求職者数をDBから取得する
 *
 * 使い方（hoiku-crm で）:
 *   node scripts/count-feb-registered-takizawa.js
 *
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY を設定
 */

const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('.env.local が見つかりません:', envPath)
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
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  // 当月（2月）の範囲: 2026-02-01 00:00:00 ～ 2026-02-28 23:59:59
  const year = 2026
  const month = 2
  const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10) // '2026-02-01'
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString().slice(0, 19) // '2026-02-28T23:59:59'

  // 1. 瀧澤の user id を取得
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', '瀧澤')

  if (userError) {
    console.error('users 取得エラー:', userError.message)
    process.exit(1)
  }
  if (!users || users.length === 0) {
    console.log('瀧澤 という名前のユーザーが見つかりませんでした')
    process.exit(0)
  }
  const takizawaId = users[0].id
  console.log('担当者: 瀧澤 (id:', takizawaId, ')\n')

  // 2. 当月（2月）に登録 かつ consultant_id = 瀧澤 の求職者を取得
  const { data: candidates, error: candError } = await supabase
    .from('candidates')
    .select('id, name, registered_at, status')
    .eq('consultant_id', takizawaId)
    .not('registered_at', 'is', null)
    .gte('registered_at', monthStart)
    .lte('registered_at', monthEnd)
    .order('registered_at', { ascending: true })

  if (candError) {
    console.error('candidates 取得エラー:', candError.message)
    process.exit(1)
  }

  const count = (candidates || []).length
  console.log('=== 当月（' + year + '年' + month + '月）に登録 かつ 担当が瀧澤 ===')
  console.log('人数:', count, '人\n')

  if (count > 0) {
    console.log('一覧（id, name, registered_at, status）:')
    ;(candidates || []).forEach((c, i) => {
      console.log('  ' + (i + 1) + '.', c.id, c.name, c.registered_at, c.status || '-')
    })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
