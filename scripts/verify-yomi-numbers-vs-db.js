/**
 * ダッシュボード「ヨミ数字（当月/翌月）」と同一ロジックで DB から再集計し、
 * 二重計算で一致するか・行単位の内訳を表示する。
 *
 * 使い方:
 *   node scripts/verify-yomi-numbers-vs-db.js [YYYY-MM] [--detail]
 *
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY
 * （または NEXT_PUBLIC_SUPABASE_ANON_KEY + RLS で読める場合は anon でも可）
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
      if (!process.env[key]) process.env[key] = val
    }
  })
}

function parseYearMonth(arg) {
  const m = /^(\d{4})-(\d{2})$/.exec(arg || '')
  if (!m) return null
  return { y: Number(m[1]), month: Number(m[2]), selected: `${m[1]}-${m[2]}` }
}

function getMonthText(selectedYearMonth) {
  return selectedYearMonth.replace('-', '_')
}

function getNextMonthText(selectedYearMonth) {
  const [y, mo] = selectedYearMonth.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`
}

function periodStartDate(selectedYearMonth) {
  const [y, m] = selectedYearMonth.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  start.setHours(0, 0, 0, 0)
  return start
}

function isUserActiveInPeriod(user, periodStart) {
  if (!user.retired_at) return true
  const retiredDate = new Date(user.retired_at)
  retiredDate.setHours(0, 0, 0, 0)
  return retiredDate >= periodStart
}

function matchesCurrentMonthProject(p, currentMonthText) {
  return (
    (p.probability_month === 'current' || p.probability_month == null) &&
    (p.month_text === currentMonthText || p.month_text == null)
  )
}

function matchesNextMonthProject(p, nextMonthText) {
  return p.probability_month === 'next' && (p.month_text === nextMonthText || p.month_text == null)
}

function formatManYen(n) {
  if (n == null || n === 0) return '-'
  return `¥${(n / 10000).toFixed(0)}万`
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--detail')
  const detail = process.argv.includes('--detail')
  const ym = parseYearMonth(args[0]) || parseYearMonth(new Date().toISOString().slice(0, 7))
  if (!ym) {
    console.error('使い方: node scripts/verify-yomi-numbers-vs-db.js YYYY-MM [--detail]')
    process.exit(1)
  }

  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY（または ANON）が必要です')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const selectedYearMonth = ym.selected
  const currentMonthText = getMonthText(selectedYearMonth)
  const nextMonthText = getNextMonthText(selectedYearMonth)
  const periodStart = periodStartDate(selectedYearMonth)

  async function fetchAllRows(table, columns, orderCol = 'id') {
    const pageSize = 1000
    const all = []
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .order(orderCol, { ascending: true })
        .range(from, from + pageSize - 1)
      if (error) throw error
      if (!data?.length) break
      all.push(...data)
      if (data.length < pageSize) break
    }
    return all
  }

  const usersRes = await supabase.from('users').select('id,name,role,retired_at').order('name')
  if (usersRes.error) throw usersRes.error
  const users = usersRes.data || []

  const [candidates, projects] = await Promise.all([
    fetchAllRows('candidates', 'id,name,consultant_id'),
    fetchAllRows('projects', 'id,candidate_id,client_name,expected_amount,probability,probability_month,month_text'),
  ])

  const candidateById = new Map(candidates.map((c) => [c.id, c]))
  const consultantByCandidate = new Map(candidates.map((c) => [c.id, c.consultant_id]))

  /** ダッシュボード memberYomiStats / memberYomiStatsNext と同じ（ユーザー別） */
  function computeByUser(isCurrent) {
    const stats = {}
    const activeUsers = users.filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u, periodStart))
    for (const user of activeUsers) {
      const userCandidateIds = new Set(
        candidates.filter((c) => c.consultant_id === user.id).map((c) => c.id)
      )
      const userProjects = projects.filter((p) => {
        if (!userCandidateIds.has(p.candidate_id)) return false
        if (isCurrent) return matchesCurrentMonthProject(p, currentMonthText)
        return matchesNextMonthProject(p, nextMonthText)
      })
      stats[user.id] = {
        yomiA: userProjects.filter((p) => p.probability === 'A' && p.expected_amount).reduce((s, p) => s + p.expected_amount, 0),
        yomiB: userProjects.filter((p) => p.probability === 'B' && p.expected_amount).reduce((s, p) => s + p.expected_amount, 0),
        yomiC: userProjects.filter((p) => p.probability === 'C' && p.expected_amount).reduce((s, p) => s + p.expected_amount, 0),
      }
    }
    return stats
  }

  /** 全案件を1パスで担当者別に振り分け（結果が一致するか検証） */
  function computeByScan(isCurrent) {
    const stats = {}
    for (const u of users) {
      if (u.role === 'admin' || !isUserActiveInPeriod(u, periodStart)) continue
      stats[u.id] = { yomiA: 0, yomiB: 0, yomiC: 0 }
    }
    for (const p of projects) {
      const consultantId = consultantByCandidate.get(p.candidate_id)
      if (!consultantId || !stats[consultantId]) continue
      if (isCurrent) {
        if (!matchesCurrentMonthProject(p, currentMonthText)) continue
      } else {
        if (!matchesNextMonthProject(p, nextMonthText)) continue
      }
      if (!p.expected_amount) continue
      if (p.probability === 'A') stats[consultantId].yomiA += p.expected_amount
      else if (p.probability === 'B') stats[consultantId].yomiB += p.expected_amount
      else if (p.probability === 'C') stats[consultantId].yomiC += p.expected_amount
    }
    return stats
  }

  const currentA = computeByUser(true)
  const currentB = computeByScan(true)
  const nextA = computeByUser(false)
  const nextB = computeByScan(false)

  let mismatch = false
  function diffStats(a, b, label) {
    for (const id of Object.keys(a)) {
      for (const k of ['yomiA', 'yomiB', 'yomiC']) {
        if ((a[id][k] || 0) !== (b[id][k] || 0)) {
          console.error(`[不一致] ${label} user=${id} ${k}: ユーザー別=${a[id][k]} スキャン=${b[id][k]}`)
          mismatch = true
        }
      }
    }
  }
  diffStats(currentA, currentB, '当月')
  diffStats(nextA, nextB, '翌月')

  console.log('=== ヨミ数字 DB 検証（ダッシュボードと同一ロジック） ===')
  console.log(`選択月: ${selectedYearMonth}  currentMonthText=${currentMonthText}  nextMonthText=${nextMonthText}`)
  console.log(`取得件数: users=${users.length} candidates=${candidates.length} projects=${projects.length}`)
  console.log(`二重集計一致: ${mismatch ? 'NG（上記不一致参照）' : 'OK'}`)
  console.log('')

  const activeUsers = users
    .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u, periodStart))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'))

  console.log('--- 当月（成約MIN A/B/C）---')
  console.log(
    ['社員名', 'A(円)', 'A', 'B(円)', 'B', 'C(円)', 'C'].join('\t')
  )
  for (const u of activeUsers) {
    const s = currentA[u.id] || { yomiA: 0, yomiB: 0, yomiC: 0 }
    const row = [u.name, s.yomiA, formatManYen(s.yomiA), s.yomiB, formatManYen(s.yomiB), s.yomiC, formatManYen(s.yomiC)]
    if (s.yomiA || s.yomiB || s.yomiC) console.log(row.join('\t'))
  }

  console.log('')
  console.log('--- 翌月（成約MIN A/B/C）---')
  for (const u of activeUsers) {
    const s = nextA[u.id] || { yomiA: 0, yomiB: 0, yomiC: 0 }
    const row = [u.name, s.yomiA, formatManYen(s.yomiA), s.yomiB, formatManYen(s.yomiB), s.yomiC, formatManYen(s.yomiC)]
    if (s.yomiA || s.yomiB || s.yomiC) console.log(row.join('\t'))
  }

  if (detail) {
    console.log('\n--- 当月 内訳（project 行）---')
    for (const u of activeUsers) {
      const userCandidateIds = new Set(candidates.filter((c) => c.consultant_id === u.id).map((c) => c.id))
      const rows = projects.filter(
        (p) => userCandidateIds.has(p.candidate_id) && matchesCurrentMonthProject(p, currentMonthText) && p.expected_amount
      )
      if (rows.length === 0) continue
      console.log(`\n## ${u.name} (${rows.length}件)`)
      for (const p of rows) {
        const cn = candidateById.get(p.candidate_id)
        console.log(
          `  project=${p.id} candidate=${p.candidate_id} ${cn?.name || '?'} | ${p.probability} | amount=${p.expected_amount} | prob_month=${p.probability_month ?? 'null'} | month_text=${p.month_text ?? 'null'} | ${p.client_name || ''}`
        )
      }
    }
    console.log('\n--- 翌月 内訳（project 行）---')
    for (const u of activeUsers) {
      const userCandidateIds = new Set(candidates.filter((c) => c.consultant_id === u.id).map((c) => c.id))
      const rows = projects.filter(
        (p) => userCandidateIds.has(p.candidate_id) && matchesNextMonthProject(p, nextMonthText) && p.expected_amount
      )
      if (rows.length === 0) continue
      console.log(`\n## ${u.name} (${rows.length}件)`)
      for (const p of rows) {
        const cn = candidateById.get(p.candidate_id)
        console.log(
          `  project=${p.id} candidate=${p.candidate_id} ${cn?.name || '?'} | ${p.probability} | amount=${p.expected_amount} | prob_month=${p.probability_month ?? 'null'} | month_text=${p.month_text ?? 'null'} | ${p.client_name || ''}`
        )
      }
    }
  }

  process.exit(mismatch ? 2 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
