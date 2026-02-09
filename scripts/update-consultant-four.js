/**
 * 担当変更・追加（4件）
 * - 橘田(きった) あみ → 担当を西田に変更
 * - 玉城 知美 → 担当を吉田に追加
 * - 道厘 栞(再登録) → 担当を吉田に追加
 * - 佐別當(さべっとう) 優奈 → 担当を吉田に追加
 *
 *   node scripts/update-consultant-four.js
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
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
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

  const { data: users } = await supabase.from('users').select('id, name').in('name', ['西田', '吉田'])
  if (!users?.length) {
    console.error('西田 or 吉田 が見つかりません')
    process.exit(1)
  }
  const nishidaId = users.find((u) => u.name === '西田')?.id
  const yoshidaId = users.find((u) => u.name === '吉田')?.id
  if (!nishidaId || !yoshidaId) {
    console.error('西田・吉田の id 取得失敗')
    process.exit(1)
  }
  console.log('西田 id:', nishidaId, ' / 吉田 id:', yoshidaId, '\n')

  const updates = [
    { label: '橘田(きった) あみ → 西田', find: '橘田(きった) あみ', consultantId: nishidaId },
    { label: '玉城 知美 → 吉田', find: '玉城 知美', consultantId: yoshidaId },
    { label: '道厘 栞(再登録) → 吉田', find: '道厘 栞(再登録)', consultantId: yoshidaId },
    { label: '佐別當(さべっとう) 優奈 → 吉田', find: '佐別當(さべっとう) 優奈', consultantId: yoshidaId },
  ]

  for (const u of updates) {
    const { data: rows, error: findErr } = await supabase
      .from('candidates')
      .select('id, name, consultant_id')
      .eq('name', u.find)
      .limit(1)

    if (findErr) {
      console.error(u.label, '→ 検索エラー:', findErr.message)
      continue
    }
    if (!rows?.length) {
      console.error(u.label, '→ 該当求職者なし (name:', u.find, ')')
      continue
    }

    const c = rows[0]
    const { error: updateErr } = await supabase.from('candidates').update({ consultant_id: u.consultantId }).eq('id', c.id)
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
