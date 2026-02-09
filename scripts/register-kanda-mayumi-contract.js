/**
 * 神田 真弓さんを担当吉田・成約済みで登録
 * - candidates: consultant_id → 吉田, status → closed_won
 * - contracts: ゆめわかば保育園 883,200円 の成約を追加
 *
 * 使い方: node scripts/register-kanda-mayumi-contract.js
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs')
const path = require('path')
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

const CANDIDATE_ID = '20206847'
const REVENUE_INCLUDING_TAX = 883200
const PLACEMENT_COMPANY = 'ゆめわかば保育園（株式会社ゆめのもり）'
const ACCEPTED_DATE = '2026-01-15' // 承諾日（未指定のため仮）

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  console.log('=== 神田 真弓さん 担当吉田・成約済み登録 ===\n')

  // 1. 吉田の user id を取得
  const { data: yoshida, error: errUser } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', '吉田')
    .maybeSingle()

  if (errUser || !yoshida) {
    console.error('吉田さんのユーザーが見つかりません:', errUser?.message || '該当なし')
    process.exit(1)
  }
  console.log('担当者 吉田:', yoshida.id)

  // 2. candidates を更新: consultant_id, status
  const { error: errCand } = await supabase
    .from('candidates')
    .update({
      consultant_id: yoshida.id,
      status: 'closed_won',
      updated_at: new Date().toISOString()
    })
    .eq('id', CANDIDATE_ID)

  if (errCand) {
    console.error('candidates 更新エラー:', errCand.message)
    process.exit(1)
  }
  console.log('candidates 更新完了: consultant_id=吉田, status=closed_won')

  // 3. contracts に成約を挿入
  const revenue_excluding_tax = Math.round(REVENUE_INCLUDING_TAX / 1.1)
  const contract = {
    candidate_id: CANDIDATE_ID,
    accepted_date: ACCEPTED_DATE,
    employment_restriction_until: null,
    employment_type: null,
    job_type: null,
    revenue_excluding_tax,
    revenue_including_tax: REVENUE_INCLUDING_TAX,
    payment_date: null,
    invoice_sent_date: null,
    calculation_basis: null,
    document_url: null,
    placement_company: PLACEMENT_COMPANY,
    note: null
  }

  const { data: inserted, error: errContract } = await supabase
    .from('contracts')
    .insert(contract)
    .select('id')
    .single()

  if (errContract) {
    console.error('contracts 挿入エラー:', errContract.message)
    process.exit(1)
  }
  console.log('contracts 挿入完了:')
  console.log('  成約先:', PLACEMENT_COMPANY)
  console.log('  成約金額（税込）:', REVENUE_INCLUDING_TAX.toLocaleString(), '円')
  console.log('  承諾日:', ACCEPTED_DATE)
  console.log('  成約ID:', inserted?.id)

  // 4. status_history に成約変更を記録（テーブルが存在する場合）
  const { error: errHist } = await supabase.from('status_history').insert({
    candidate_id: CANDIDATE_ID,
    project_id: null,
    old_status: null,
    new_status: 'closed_won',
    changed_by: null,
    changed_at: ACCEPTED_DATE + 'T00:00:00.000Z',
    note: null
  })
  if (errHist) {
    console.log('status_history 記録スキップ:', errHist.message)
  } else {
    console.log('status_history 記録完了')
  }

  console.log('\n✅ 登録完了')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
