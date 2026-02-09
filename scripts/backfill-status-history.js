/**
 * timeline_eventsのdescriptionから status_history をバックフィルする
 * description形式: "oldStatus → newStatus"
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

  console.log('=== status_history バックフィル開始 ===\n')

  // 1. ステータス変更のtimeline_eventsを全件取得
  const { data: timelineEvents, error: timelineError } = await supabase
    .from('timeline_events')
    .select('id, candidate_id, title, description, created_at, created_by')
    .eq('event_type', 'status_change')
    .order('created_at', { ascending: true })

  if (timelineError) {
    console.error('timeline_events取得エラー:', timelineError.message)
    process.exit(1)
  }

  console.log(`timeline_eventsから${timelineEvents?.length || 0}件のステータス変更を発見\n`)

  if (!timelineEvents || timelineEvents.length === 0) {
    console.log('処理対象がありません')
    return
  }

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  // 2. 各イベントをstatus_historyに追加
  for (const event of timelineEvents) {
    // descriptionから old_status と new_status を抽出（"oldStatus → newStatus" 形式）
    const match = event.description?.match(/^(.+?)\s*→\s*(.+)$/)
    if (!match) {
      console.log(`スキップ: ${event.id} - description形式が不正: "${event.description}"`)
      skipCount++
      continue
    }

    const oldStatus = match[1].trim()
    const newStatus = match[2].trim()

    // 既にstatus_historyに存在するか確認（同じcandidate_id, new_status, 同日）
    const eventDate = event.created_at.split('T')[0]
    const { data: existing } = await supabase
      .from('status_history')
      .select('id')
      .eq('candidate_id', event.candidate_id)
      .eq('new_status', newStatus)
      .gte('changed_at', eventDate + 'T00:00:00')
      .lte('changed_at', eventDate + 'T23:59:59')
      .limit(1)

    if (existing && existing.length > 0) {
      skipCount++
      continue
    }

    // status_historyに追加
    const { error: insertError } = await supabase
      .from('status_history')
      .insert({
        candidate_id: event.candidate_id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_at: event.created_at,
        changed_by: event.created_by || null,
        note: `timeline_eventsから復元 (event_id: ${event.id})`,
      })

    if (insertError) {
      console.error(`エラー: ${event.id} - ${insertError.message}`)
      errorCount++
    } else {
      successCount++
      if (successCount % 10 === 0) {
        console.log(`進捗: ${successCount}件追加済み...`)
      }
    }
  }

  console.log('\n=== 完了 ===')
  console.log(`追加: ${successCount}件`)
  console.log(`スキップ: ${skipCount}件（既存または形式不正）`)
  console.log(`エラー: ${errorCount}件`)
}

main().catch((e) => { 
  console.error(e)
  process.exit(1) 
})
