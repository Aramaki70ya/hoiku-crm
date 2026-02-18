#!/usr/bin/env node
/**
 * 下野奈々さんのDB状態を確認（瀧澤さんの面接カウントに含まれる理由の調査）
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

async function main() {
  const name = '下野 奈々'
  const candidateId = '20206912'

  console.log('=== 下野奈々 調査 ===\n')

  // 候補者
  const { data: cand, error: eC } = await supabase
    .from('candidates')
    .select('id, name, status, consultant_id, created_at, updated_at')
    .or(`id.eq.${candidateId},name.ilike.%下野%`)
  if (eC) {
    console.error('candidates error:', eC.message)
    return
  }
  console.log('【候補者】', cand?.length, '件')
  cand?.forEach(c => console.log(' ', c))

  const cid = cand?.[0]?.id
  if (!cid) {
    console.log('候補者なし')
    return
  }

  // 担当者名
  const consultantId = cand?.[0]?.consultant_id
  if (consultantId) {
    const { data: user } = await supabase.from('users').select('id, name').eq('id', consultantId).single()
    console.log(' 担当:', user?.name, `(${consultantId})`)
  }
  console.log('')

  // status_history（時系列）
  const { data: history } = await supabase
    .from('status_history')
    .select('old_status, new_status, changed_at')
    .eq('candidate_id', cid)
    .order('changed_at', { ascending: true })
  console.log('【status_history】', history?.length ?? 0, '件')
  history?.forEach(h => console.log(' ', h.changed_at?.slice(0, 10), h.old_status, '→', h.new_status))
  console.log('')

  // 面接
  const { data: projs } = await supabase.from('projects').select('id').eq('candidate_id', cid)
  const projectIds = projs?.map(p => p.id) ?? []
  if (projectIds.length) {
    const { data: inv } = await supabase
      .from('interviews')
      .select('id, project_id, start_at, status, is_voided')
      .in('project_id', projectIds)
      .order('start_at', { ascending: true })
    console.log('【interviews】', inv?.length ?? 0, '件')
    inv?.forEach(i => console.log(' ', i.start_at?.slice(0, 10), i.status, 'is_voided:', i.is_voided))
  } else {
    console.log('【interviews】案件なし')
  }
  console.log('')

  // 成約
  const { data: cont } = await supabase
    .from('contracts')
    .select('id, candidate_id, revenue_including_tax, contract_date, created_at')
    .eq('candidate_id', cid)
  console.log('【contracts】', cont?.length ?? 0, '件')
  cont?.forEach(c => console.log(' ', c))
  console.log('')

  // 2月の面接カウントに含まれるか
  const febStart = new Date('2026-02-01')
  const febEnd = new Date('2026-02-29')
  const hasInterviewStatusInFeb = history?.some(h => {
    const d = new Date(h.changed_at)
    const ok = (h.new_status === '面接確定済' || h.new_status === '面接実施済（結果待ち）') &&
      d >= febStart && d <= febEnd
    return ok
  })
  const hadInterviewBeforeFeb = history?.some(h => {
    const d = new Date(h.changed_at)
    return (h.new_status === '面接確定済' || h.new_status === '面接実施済（結果待ち）') && d < febStart
  })
  const hasContractInFeb = cont?.some(c => {
    const d = c.contract_date ? new Date(c.contract_date) : new Date(c.created_at)
    return d >= febStart && d <= febEnd
  })

  console.log('【2月の面接カウント判定】')
  console.log(' 期間内に面接確定済/実施済の履歴あり:', hasInterviewStatusInFeb)
  console.log(' 2月より前に面接経験あり（初回除外対象）:', hadInterviewBeforeFeb)
  console.log(' 2月に成約あり:', hasContractInFeb)
  console.log(' → 現ロジックでは「期間内に面接ステータス」かつ「過去に面接経験なし」ならカウントされる。成約済みは面接数から除外する仕様になっていない。')
}

main().catch(e => console.error(e))
