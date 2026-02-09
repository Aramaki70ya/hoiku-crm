/**
 * 2026年1月成約データを正しい実データで上書きする
 *
 * 使い方（hoiku-crm で）:
 *   node scripts/fix-2026-01-contracts.js --dry-run   # 更新せずに内容だけ表示
 *   node scripts/fix-2026-01-contracts.js             # 実際に DB を更新
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

// 2026年1月の正しい成約データ（実データ）
const JAN_2026_CONTRACTS = [
  { candidate_id: '20206672', accepted_date: '2026-01-02', revenue_including_tax: 777750 },   // 瀧澤: 長倉 あみ
  { candidate_id: '20206855', accepted_date: '2026-01-23', revenue_including_tax: 587976 },   // 瀧澤
  { candidate_id: '20206056', accepted_date: '2026-01-01', revenue_including_tax: 1550000 },  // 松澤: 杉谷 美保子
  { candidate_id: '20206190', accepted_date: '2026-01-01', revenue_including_tax: 1041600 },  // 後藤: 小熊 知子
  { candidate_id: '20206387', accepted_date: '2026-01-01', revenue_including_tax: 1131414 },  // 吉田: 柴田 実穂
  { candidate_id: '20206619', accepted_date: '2026-01-01', revenue_including_tax: 942660 },   // 吉田: 室井 郁恵
  { candidate_id: '20206795', accepted_date: '2026-01-15', revenue_including_tax: 1041300 },  // 吉田: 小林 美洸
  { candidate_id: '20206879', accepted_date: '2026-01-28', revenue_including_tax: 800400 },   // 小畦: 前田彩花
  { candidate_id: '20206642', accepted_date: '2026-01-01', revenue_including_tax: 1237800 },  // 鈴木: 塚本 佑香
  { candidate_id: '20206656', accepted_date: '2026-01-01', revenue_including_tax: 1110162 },  // 鈴木: 星野 理沙
]

async function main() {
  loadEnvLocal()

  const dryRun = process.argv.includes('--dry-run')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
    process.exit(1)
  }

  console.log('2026年1月成約データ修正')
  console.log('モード:', dryRun ? '--dry-run（DBは更新しません）' : '本番（DBを更新）')
  console.log('')

  const supabase = createClient(url, key)

  // 1. 既存の2026年1月成約を削除
  const { data: existing } = await supabase
    .from('contracts')
    .select('id, candidate_id, revenue_including_tax')
    .gte('accepted_date', '2026-01-01')
    .lte('accepted_date', '2026-01-31')

  if (existing?.length > 0) {
    console.log('削除する既存の1月成約:', existing.length, '件')
    if (!dryRun) {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .gte('accepted_date', '2026-01-01')
        .lte('accepted_date', '2026-01-31')
      if (error) {
        console.error('削除エラー:', error.message)
        process.exit(1)
      }
      console.log('削除完了')
    }
  } else {
    console.log('削除対象の既存1月成約はありません')
  }

  // 2. candidates に存在する ID だけ挿入
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id')
  const validIds = new Set((candidates || []).map((c) => String(c.id)))

  const toInsert = JAN_2026_CONTRACTS.map((c) => {
    const revenue_excluding_tax = Math.round(c.revenue_including_tax / 1.1)
    return {
      candidate_id: c.candidate_id,
      accepted_date: c.accepted_date,
      employment_restriction_until: null,
      employment_type: null,
      job_type: null,
      revenue_excluding_tax,
      revenue_including_tax: c.revenue_including_tax,
      payment_date: null,
      invoice_sent_date: null,
      calculation_basis: null,
      document_url: null,
      placement_company: null,
    }
  })

  const skipped = toInsert.filter((c) => !validIds.has(c.candidate_id))
  const insertable = toInsert.filter((c) => validIds.has(c.candidate_id))

  if (skipped.length > 0) {
    console.log('candidates に存在しないためスキップ:', skipped.map((s) => s.candidate_id).join(', '))
  }

  console.log('挿入する成約:', insertable.length, '件')

  if (!dryRun && insertable.length > 0) {
    const { data: inserted, error } = await supabase.from('contracts').insert(insertable).select('id')
    if (error) {
      console.error('挿入エラー:', error.message)
      process.exit(1)
    }
    console.log('挿入完了:', inserted?.length || 0, '件')
  }

  const total = insertable.reduce((s, c) => s + c.revenue_including_tax, 0)
  console.log('1月成約合計:', insertable.length, '件, ¥' + total.toLocaleString())
  console.log('')

  const ids = insertable.map((c) => c.candidate_id)
  if (ids.length === 0) {
    if (dryRun) console.log('（--dry-run のため DB は変更していません。）')
    return
  }

  // 3. candidates のステータスを成約に更新
  console.log('candidates ステータス → closed_won に更新:', ids.length, '件')
  if (!dryRun) {
    const { error: errC } = await supabase
      .from('candidates')
      .update({ status: 'closed_won', updated_at: new Date().toISOString() })
      .in('id', ids)
    if (errC) {
      console.error('candidates 更新エラー:', errC.message)
      process.exit(1)
    }
    console.log('candidates 更新完了')
  }
  console.log('')

  // 4. status_history に成約への変更を1月で記録（既にある場合はスキップ）
  const { data: existingClosed } = await supabase
    .from('status_history')
    .select('candidate_id')
    .eq('new_status', 'closed_won')
    .in('candidate_id', ids)
  const alreadyHasClosed = new Set((existingClosed || []).map((r) => r.candidate_id))

  const toInsertHistory = []
  for (const c of JAN_2026_CONTRACTS) {
    if (!validIds.has(c.candidate_id) || alreadyHasClosed.has(c.candidate_id)) continue
    const changedAt = c.accepted_date + 'T00:00:00.000Z'
    toInsertHistory.push({
      candidate_id: c.candidate_id,
      project_id: null,
      old_status: null,
      new_status: 'closed_won',
      changed_by: null,
      changed_at: changedAt,
      note: null,
    })
  }

  if (toInsertHistory.length > 0) {
    console.log('status_history に成約履歴を追加:', toInsertHistory.length, '件')
    if (!dryRun) {
      const { error: errH } = await supabase.from('status_history').insert(toInsertHistory)
      if (errH) {
        console.error('status_history 挿入エラー:', errH.message)
        process.exit(1)
      }
      console.log('status_history 追加完了')
    }
  } else {
    console.log('status_history: 追加不要（既に成約履歴あり）')
  }

  console.log('')
  if (dryRun) {
    console.log('（--dry-run のため DB は変更していません。本番で実行するにはオプションを外してください。）')
  } else {
    console.log('修正完了。確認: node scripts/check-jan-2026-status-discrepancy.js')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
