#!/usr/bin/env node
/**
 * 下野奈々さん: 2月面接のステータス変更漏れを補完
 * 面接は 2026/2/10 みずほ幼稚園で実施済みのため、status_history に「面接確定済」を追加する。
 * 実行後、瀧澤さんの面接設定一覧に表示される。
 *
 * 使い方: node scripts/add-shimono-nana-feb-status-history.js [--dry-run]
 */

const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('.env.local が見つかりません')
    process.exit(1)
  }
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return
    const m = t.match(/^([^=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  })
}

loadEnv()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CANDIDATE_ID = '20206912' // 下野奈々

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log('=== 下野奈々 2月面接 status_history 追加 ===')
  console.log('モード:', dryRun ? '--dry-run' : '本番')
  console.log('')

  const { data: candidate, error: eC } = await supabase
    .from('candidates')
    .select('id, name, status, consultant_id')
    .eq('id', CANDIDATE_ID)
    .single()

  if (eC || !candidate) {
    console.error('候補者取得エラー:', eC?.message || 'not found')
    process.exit(1)
  }
  console.log('候補者:', candidate.name, candidate.status)

  const { data: existing } = await supabase
    .from('status_history')
    .select('id, new_status, changed_at')
    .eq('candidate_id', CANDIDATE_ID)
    .order('changed_at', { ascending: false })
    .limit(5)

  if (existing?.length) {
    console.log('既存 status_history 直近:', existing.length, '件')
    existing.forEach(h => console.log(' ', h.changed_at?.slice(0, 10), h.new_status))
  } else {
    console.log('既存 status_history: 0 件（今回追加で2月面接にカウントされます）')
  }
  console.log('')

  // 2/10 面接日で「面接確定済」を追加（前ステータスは 面接日程調整中 想定）
  const row = {
    candidate_id: CANDIDATE_ID,
    old_status: '面接日程調整中',
    new_status: '面接確定済',
    changed_at: '2026-02-10T09:00:00.000Z',
    changed_by: candidate.consultant_id || null,
    note: 'ステータス変更漏れのため手動追加（2月面接 みずほ幼稚園）',
  }

  console.log('追加する履歴:', row)
  if (dryRun) {
    console.log('\n[--dry-run] のため実行しませんでした。')
    return
  }

  const { error } = await supabase.from('status_history').insert(row)
  if (error) {
    console.error('insert エラー:', error.message)
    process.exit(1)
  }
  console.log('\n✓ status_history に1件追加しました。')
  console.log('→ 瀧澤さんの面接設定一覧に下野奈々さんが表示されます。')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
