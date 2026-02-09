/**
 * 4件の求職者を一括更新する
 * - 張博雅: 担当から外す (consultant_id = null)
 * - 廣瀬 妃: 登録日を 2026-01-27 に変更
 * - 阿部 洋子: 担当を戸部に変更
 * - 徳山 友美: 登録日を 2026-01-21 に変更
 *
 * 使い方（hoiku-crm で）:
 *   node scripts/update-four-candidates.js
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

  // 戸部の user id を取得
  const { data: tobeUsers, error: tobeErr } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', '戸部')

  if (tobeErr || !tobeUsers?.length) {
    console.error('戸部 というユーザーが見つかりません:', tobeErr?.message || '')
    process.exit(1)
  }
  const tobeId = tobeUsers[0].id
  console.log('戸部 id:', tobeId, '\n')

  const updates = [
    {
      label: '張博雅: 担当から外す',
      find: { method: 'ilike', name: '%張博雅%' },
      set: { consultant_id: null },
    },
    {
      label: '廣瀬 妃: 登録を 1/27 に変更',
      find: { method: 'eq', name: '廣瀬 妃' },
      set: { registered_at: '2026-01-27' },
    },
    {
      label: '阿部 洋子: 担当を戸部に変更',
      find: { method: 'eq', name: '阿部 洋子' },
      set: { consultant_id: tobeId },
    },
    {
      label: '徳山 友美: 登録を 1/21 に変更',
      find: { method: 'eq', name: '徳山 友美' },
      set: { registered_at: '2026-01-21' },
    },
  ]

  for (const u of updates) {
    let q = supabase.from('candidates').select('id, name, consultant_id, registered_at')
    if (u.find.method === 'eq') {
      q = q.eq('name', u.find.name)
    } else {
      q = q.ilike('name', u.find.name)
    }
    const { data: rows, error: findErr } = await q.limit(1)

    if (findErr) {
      console.error(u.label, '→ 検索エラー:', findErr.message)
      continue
    }
    if (!rows || rows.length === 0) {
      console.error(u.label, '→ 該当求職者なし (name:', u.find.name, ')')
      continue
    }

    const c = rows[0]
    const { error: updateErr } = await supabase
      .from('candidates')
      .update(u.set)
      .eq('id', c.id)

    if (updateErr) {
      console.error(u.label, '→ 更新エラー:', updateErr.message)
      continue
    }
    console.log('OK', u.label, '(id:', c.id, ')')
  }

  console.log('\n完了')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
