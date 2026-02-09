/**
 * 2026年1月成約データのズレを確認する
 * 正しい実データとDBの状態を突き合わせて、差分を表示する
 *
 * 使い方（hoiku-crm で）:
 *   node scripts/check-jan-2026-status-discrepancy.js
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

// 正しい1月成約データ（実データ）
const CORRECT_JAN_2026 = [
  { candidate_id: '20206672', member: '瀧澤', name: '長倉 あみ', revenue: 777750 },
  { candidate_id: '20206855', member: '瀧澤', name: '不明', revenue: 587976 },
  { candidate_id: '20206056', member: '松澤', name: '杉谷 美保子', revenue: 1550000 },
  { candidate_id: '20206190', member: '後藤', name: '小熊 知子', revenue: 1041600 },
  { candidate_id: '20206387', member: '吉田', name: '柴田 実穂', revenue: 1131414 },
  { candidate_id: '20206619', member: '吉田', name: '室井 郁恵', revenue: 942660 },
  { candidate_id: '20206795', member: '吉田', name: '小林 美洸', revenue: 1041300 },
  { candidate_id: '20206879', member: '小畦', name: '前田彩花', revenue: 800400 },
  { candidate_id: '20206642', member: '鈴木', name: '塚本 佑香', revenue: 1237800 },
  { candidate_id: '20206656', member: '鈴木', name: '星野 理沙', revenue: 1110162 },
]

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const correctById = new Map(CORRECT_JAN_2026.map((c) => [c.candidate_id, c]))
  const ids = CORRECT_JAN_2026.map((c) => c.candidate_id)

  console.log('=== 2026年1月成約 ズレ確認 ===\n')
  console.log('正しいデータ: 10件（合計 ¥10,220,062）\n')

  // 1. candidates: 存在するか、ステータスは成約か
  const { data: candidates } = await supabase.from('candidates').select('id, name, status').in('id', ids)
  const candidatesById = new Map((candidates || []).map((c) => [c.id, c]))

  // 2. contracts: 全成約から該当 candidate_id のものを取得
  const { data: allContracts } = await supabase.from('contracts').select('id, candidate_id, accepted_date, revenue_including_tax')
  const contractsByCandidate = new Map()
  for (const c of allContracts || []) {
    if (ids.includes(c.candidate_id)) {
      contractsByCandidate.set(c.candidate_id, c)
    }
  }

  // 3. status_history: 成約になった履歴を取得
  const { data: historyRows } = await supabase
    .from('status_history')
    .select('candidate_id, new_status, changed_at')
    .eq('new_status', 'closed_won')
    .in('candidate_id', ids)
    .order('changed_at', { ascending: false })

  // 各 candidate で一番新しい成約履歴だけ使う
  const latestClosedByCandidate = new Map()
  for (const h of historyRows || []) {
    if (!latestClosedByCandidate.has(h.candidate_id)) {
      latestClosedByCandidate.set(h.candidate_id, h)
    }
  }

  const issues = []
  const ok = []

  for (const correct of CORRECT_JAN_2026) {
    const cid = correct.candidate_id
    const cand = candidatesById.get(cid)
    const contract = contractsByCandidate.get(cid)
    const closedHistory = latestClosedByCandidate.get(cid)

    const item = {
      candidate_id: cid,
      member: correct.member,
      name: correct.name,
      correct_revenue: correct.revenue,
      issues: [],
    }

    // 求職者がDBに存在するか
    if (!cand) {
      item.issues.push('candidates に存在しない')
      issues.push(item)
      continue
    }

    // ステータスが成約か
    if (cand.status !== 'closed_won') {
      item.issues.push(`ステータスが成約ではない: ${cand.status || 'null'}`)
      item.current_status = cand.status
    }

    // 成約レコード（contracts）があるか
    if (!contract) {
      item.issues.push('contracts に成約レコードがない')
      if (item.issues.length > 0) issues.push(item)
      else ok.push(item)
      continue
    }

    // accepted_date が1月か
    const acceptedMonth = contract.accepted_date ? String(contract.accepted_date).slice(0, 7) : null
    if (acceptedMonth !== '2026-01') {
      item.issues.push(`成約日が1月ではない: ${contract.accepted_date || 'null'}`)
      item.contract_accepted_date = contract.accepted_date
    }

    // 金額が一致するか
    if (contract.revenue_including_tax !== correct.revenue) {
      item.issues.push(`成約金額ズレ: DB=${contract.revenue_including_tax} 正=${correct.revenue}`)
      item.contract_revenue = contract.revenue_including_tax
    }

    // status_history に成約への変更があるか、その日時が1月か
    if (!closedHistory) {
      item.issues.push('status_history に成約への変更履歴がない')
    } else {
      const changedMonth = closedHistory.changed_at ? String(closedHistory.changed_at).slice(0, 7) : null
      if (changedMonth !== '2026-01') {
        item.issues.push(`ステータス変更日が1月ではない: ${closedHistory.changed_at}`)
        item.status_changed_at = closedHistory.changed_at
      }
    }

    if (item.issues.length > 0) {
      issues.push(item)
    } else {
      ok.push(item)
    }
  }

  // 余計な1月成約（正しい10件以外で accepted_date が1月のもの）
  const janContractIds = (allContracts || [])
    .filter((c) => {
      const m = c.accepted_date ? String(c.accepted_date).slice(0, 7) : ''
      return m === '2026-01'
    })
    .map((c) => c.candidate_id)
  const extra = janContractIds.filter((id) => !ids.includes(id))
  if (extra.length > 0) {
    console.log('【余計】正しい10件以外で、1月成約として登録されている candidate_id:', extra.join(', '))
    console.log('  → これらは「正しいデータ」に含まれていないため、削除または修正の検討が必要\n')
  }

  // 結果表示
  if (issues.length > 0) {
    console.log('【ズレあり】', issues.length, '件\n')
    for (const i of issues) {
      console.log(`  ${i.candidate_id} (${i.member}: ${i.name})`)
      i.issues.forEach((msg) => console.log('    -', msg))
      if (i.current_status) console.log('      current_status:', i.current_status)
      if (i.contract_accepted_date) console.log('      contract accepted_date:', i.contract_accepted_date)
      if (i.contract_revenue != null) console.log('      contract revenue:', i.contract_revenue)
      if (i.status_changed_at) console.log('      status_history changed_at:', i.status_changed_at)
      console.log('')
    }
  }

  if (ok.length > 0) {
    console.log('【OK】', ok.length, '件 - 正しいデータと一致')
    ok.forEach((o) => console.log('  ', o.candidate_id, o.member, o.name))
    console.log('')
  }

  console.log('--- サマリ ---')
  console.log('  正しいデータ: 10件')
  console.log('  OK:', ok.length, '件')
  console.log('  ズレあり:', issues.length, '件')
  if (extra.length > 0) {
    console.log('  余計な1月成約:', extra.length, '件 (candidate_id:', extra.join(','), ')')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
