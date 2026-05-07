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

/** ダッシュボード「当月」列：翌月指定以外はすべて当月側（month_text は見ない） */
function isCurrentMonthYomiBucket(p) {
  return p.probability_month !== 'next'
}

/** 翌月列：probability_month が next のみ */
function isNextMonthYomiBucket(p) {
  return p.probability_month === 'next'
}

/** ダッシュボード memberYomiStats と同じ（成約・クローズの求職者はヨミから除外） */
const YOMI_EXCLUDED_CANDIDATE_STATUSES = new Set(['内定承諾（成約）', 'クローズ（終了）'])

function candidateIncludedInYomiForecast(candidateId, candidateById) {
  const c = candidateById.get(candidateId)
  if (!c || !c.status) return true
  return !YOMI_EXCLUDED_CANDIDATE_STATUSES.has(c.status)
}

function dedupeByCandidate(projectList) {
  const map = new Map()
  for (const p of projectList) {
    const existing = map.get(p.candidate_id)
    if (!existing) {
      map.set(p.candidate_id, p)
      continue
    }
    const pTime = p.updated_at || p.created_at || ''
    const eTime = existing.updated_at || existing.created_at || ''
    if (pTime > eTime) map.set(p.candidate_id, p)
  }
  return Array.from(map.values())
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
    fetchAllRows('candidates', 'id,name,consultant_id,status'),
    fetchAllRows(
      'projects',
      'id,candidate_id,client_name,expected_amount,probability,probability_month,month_text,created_at,updated_at'
    ),
  ])

  const candidateById = new Map(candidates.map((c) => [c.id, c]))

  /** ダッシュボード memberYomiStats / memberYomiStatsNext と同一パイプライン */
  function computeYomiStats(isCurrent) {
    const stats = {}
    const activeUsers = users.filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u, periodStart))
    for (const user of activeUsers) {
      const userCandidateIds = new Set(
        candidates.filter((c) => c.consultant_id === user.id).map((c) => c.id)
      )
      const userProjects = projects.filter((p) => {
        if (!userCandidateIds.has(p.candidate_id)) return false
        if (!candidateIncludedInYomiForecast(p.candidate_id, candidateById)) return false
        if (isCurrent) return isCurrentMonthYomiBucket(p)
        return isNextMonthYomiBucket(p)
      })
      const deduped = dedupeByCandidate(userProjects)
      stats[user.id] = {
        yomiA: deduped
          .filter((p) => p.probability === 'A' && p.expected_amount)
          .reduce((s, p) => s + p.expected_amount, 0),
        yomiB: deduped
          .filter((p) => p.probability === 'B' && p.expected_amount)
          .reduce((s, p) => s + p.expected_amount, 0),
        yomiC: deduped
          .filter((p) => p.probability === 'C' && p.expected_amount)
          .reduce((s, p) => s + p.expected_amount, 0),
      }
    }
    return stats
  }

  const currentStats = computeYomiStats(true)
  const nextStats = computeYomiStats(false)

  console.log('=== ヨミ数字 DB 検証（ダッシュボードと同一ロジック） ===')
  console.log(`CLIの選択月 ${selectedYearMonth} は退職者フィルタ用。集計バケットは probability_month のみ（month_text は不使用）。`)
  console.log(`取得件数: users=${users.length} candidates=${candidates.length} projects=${projects.length}`)
  console.log('（成約・クローズの求職者はヨミ集計から除外 / 求職者単位で最新1案件に dedupe）')
  console.log('')

  const activeUsers = users
    .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u, periodStart))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'))

  console.log('--- 当月（成約MIN A/B/C）---')
  console.log(
    ['社員名', 'A(円)', 'A', 'B(円)', 'B', 'C(円)', 'C'].join('\t')
  )
  for (const u of activeUsers) {
    const s = currentStats[u.id] || { yomiA: 0, yomiB: 0, yomiC: 0 }
    const row = [u.name, s.yomiA, formatManYen(s.yomiA), s.yomiB, formatManYen(s.yomiB), s.yomiC, formatManYen(s.yomiC)]
    if (s.yomiA || s.yomiB || s.yomiC) console.log(row.join('\t'))
  }

  console.log('')
  console.log('--- 翌月（成約MIN A/B/C）---')
  for (const u of activeUsers) {
    const s = nextStats[u.id] || { yomiA: 0, yomiB: 0, yomiC: 0 }
    const row = [u.name, s.yomiA, formatManYen(s.yomiA), s.yomiB, formatManYen(s.yomiB), s.yomiC, formatManYen(s.yomiC)]
    if (s.yomiA || s.yomiB || s.yomiC) console.log(row.join('\t'))
  }

  if (detail) {
    console.log('\n--- 当月 内訳（project 行）---')
    for (const u of activeUsers) {
      const userCandidateIds = new Set(candidates.filter((c) => c.consultant_id === u.id).map((c) => c.id))
      const rows = dedupeByCandidate(
        projects.filter(
          (p) =>
            userCandidateIds.has(p.candidate_id) &&
            candidateIncludedInYomiForecast(p.candidate_id, candidateById) &&
            isCurrentMonthYomiBucket(p) &&
            p.expected_amount
        )
      )
      if (rows.length === 0) continue
      console.log(`\n## ${u.name} (${rows.length}件)`)
      for (const p of rows) {
        const cn = candidateById.get(p.candidate_id)
        console.log(
          `  project=${p.id} candidate=${p.candidate_id} ${cn?.name || '?'} status=${cn?.status || '?'} | ${p.probability} | amount=${p.expected_amount} | prob_month=${p.probability_month ?? 'null'} | month_text=${p.month_text ?? 'null'} | ${p.client_name || ''}`
        )
      }
    }
    console.log('\n--- 翌月 内訳（project 行）---')
    for (const u of activeUsers) {
      const userCandidateIds = new Set(candidates.filter((c) => c.consultant_id === u.id).map((c) => c.id))
      const rows = dedupeByCandidate(
        projects.filter(
          (p) =>
            userCandidateIds.has(p.candidate_id) &&
            candidateIncludedInYomiForecast(p.candidate_id, candidateById) &&
            isNextMonthYomiBucket(p) &&
            p.expected_amount
        )
      )
      if (rows.length === 0) continue
      console.log(`\n## ${u.name} (${rows.length}件)`)
      for (const p of rows) {
        const cn = candidateById.get(p.candidate_id)
        console.log(
          `  project=${p.id} candidate=${p.candidate_id} ${cn?.name || '?'} status=${cn?.status || '?'} | ${p.probability} | amount=${p.expected_amount} | prob_month=${p.probability_month ?? 'null'} | month_text=${p.month_text ?? 'null'} | ${p.client_name || ''}`
        )
      }
    }
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
