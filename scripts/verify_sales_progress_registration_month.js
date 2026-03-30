/**
 * 営業進捗（当月登録ベース / 前月以前登録ベース）の
 * 面接・成約が「登録月」に正しく計上されているか検証するスクリプト
 *
 * 使い方:
 *   node scripts/verify_sales_progress_registration_month.js --current=YYYY-MM --prior=YYYY-MM
 * 例:
 *   node scripts/verify_sales_progress_registration_month.js --current=2026-03 --prior=2026-02
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const text = fs.readFileSync(envPath, 'utf-8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (const a of args) {
    if (!a.startsWith('--')) continue
    const [k, v] = a.slice(2).split('=')
    out[k] = v
  }
  return out
}

function ymToRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0, 23, 59, 59, 999)
  return { start, end }
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function registeredYm(c) {
  if (!c.registered_at) return null
  return formatDate(new Date(c.registered_at))
}

async function fetchAllRows(supabase, table, selectCols) {
  const PAGE = 1000
  let from = 0
  const out = []
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectCols)
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

function buildInterviewCandidateIds({
  startDate,
  endDate,
  statusHistory,
  projects,
  interviews,
  candidates,
}) {
  const candidateIds = new Set()
  const previouslyInterviewedIds = new Set()
  const INTERVIEW_SET_STATUSES = new Set([
    '面接確定済',
    '面接実施済（結果待ち）',
    '内定獲得（承諾確認中）',
    '内定承諾（成約）',
    '内定辞退',
  ])
  const INTERVIEW_CONFIRMED_STATUSES = new Set(['面接確定済', '面接実施済（結果待ち）'])

  for (const h of statusHistory) {
    if (!INTERVIEW_SET_STATUSES.has(h.new_status) || !h.changed_at) continue
    const changed = new Date(h.changed_at)
    if (changed < startDate) previouslyInterviewedIds.add(h.candidate_id)
  }

  for (const h of statusHistory) {
    if (!INTERVIEW_CONFIRMED_STATUSES.has(h.new_status) || !h.changed_at) continue
    const changed = new Date(h.changed_at)
    if (changed < startDate || changed > endDate) continue
    if (previouslyInterviewedIds.has(h.candidate_id)) continue

    const candidateProjects = projects.filter((p) => p.candidate_id === h.candidate_id)
    const periodInterviewsForCandidate = candidateProjects.flatMap((project) =>
      interviews.filter((i) => {
        const t = new Date(i.start_at)
        return i.project_id === project.id && t >= startDate && t <= endDate
      })
    )
    const allVoided =
      periodInterviewsForCandidate.length > 0 &&
      periodInterviewsForCandidate.every((iv) => iv.is_voided === true)
    if (!allVoided) candidateIds.add(h.candidate_id)
  }

  if (candidateIds.size === 0 && statusHistory.length === 0) {
    for (const c of candidates) {
      if (!INTERVIEW_CONFIRMED_STATUSES.has(c.status) || !c.updated_at) continue
      const updated = new Date(c.updated_at)
      if (updated >= startDate && updated <= endDate) candidateIds.add(c.id)
    }
  }

  return candidateIds
}

function buildClosedCandidateIds({ startDate, endDate, statusHistory, contracts }) {
  const candidateIds = new Set()
  for (const h of statusHistory) {
    if (h.new_status !== '内定承諾（成約）' || !h.changed_at) continue
    const changed = new Date(h.changed_at)
    if (changed >= startDate && changed <= endDate) candidateIds.add(h.candidate_id)
  }
  for (const c of contracts) {
    const dateStr = c.contracted_at || c.accepted_date || c.created_at
    if (!dateStr || !c.candidate_id) continue
    const t = new Date(dateStr)
    if (t >= startDate && t <= endDate) candidateIds.add(c.candidate_id)
  }
  return candidateIds
}

function aggregateByConsultant(candidateIds, candidatesById) {
  const map = new Map()
  for (const id of candidateIds) {
    const c = candidatesById.get(id)
    if (!c || !c.consultant_id) continue
    map.set(c.consultant_id, (map.get(c.consultant_id) || 0) + 1)
  }
  return map
}

async function main() {
  loadEnvLocal()
  const args = parseArgs()
  const current = args.current || formatDate(new Date())
  const prior = args.prior || (() => {
    const [y, m] = current.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return formatDate(d)
  })()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase接続情報が不足しています')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const [users, candidates, projects, interviews, contracts, statusHistory] = await Promise.all([
    fetchAllRows(supabase, 'users', 'id,name,role'),
    fetchAllRows(supabase, 'candidates', 'id,name,consultant_id,registered_at,status,updated_at'),
    fetchAllRows(supabase, 'projects', 'id,candidate_id'),
    fetchAllRows(supabase, 'interviews', 'id,project_id,start_at,is_voided'),
    fetchAllRows(supabase, 'contracts', 'id,candidate_id,contracted_at,accepted_date,created_at'),
    fetchAllRows(supabase, 'status_history', 'id,candidate_id,new_status,changed_at'),
  ])

  const candidatesById = new Map(candidates.map((c) => [c.id, c]))

  const curRange = ymToRange(current)
  const priorRange = ymToRange(prior)

  const currentInterview = buildInterviewCandidateIds({
    startDate: curRange.start,
    endDate: curRange.end,
    statusHistory,
    projects,
    interviews,
    candidates,
  })
  const currentClosed = buildClosedCandidateIds({
    startDate: curRange.start,
    endDate: curRange.end,
    statusHistory,
    contracts,
  })
  const priorInterview = buildInterviewCandidateIds({
    startDate: priorRange.start,
    endDate: priorRange.end,
    statusHistory,
    projects,
    interviews,
    candidates,
  })
  const priorClosed = buildClosedCandidateIds({
    startDate: priorRange.start,
    endDate: priorRange.end,
    statusHistory,
    contracts,
  })

  const priorExcluded = new Set(['クローズ（終了）', '音信不通', '内定辞退', '連絡つかず（初回未接触）'])
  const currentRegIds = new Set(candidates.filter((c) => registeredYm(c) === current).map((c) => c.id))
  const priorRegIds = new Set(
    candidates
      .filter((c) => registeredYm(c) === prior && !priorExcluded.has(c.status))
      .map((c) => c.id)
  )

  const currentInterviewFiltered = new Set([...currentInterview].filter((id) => currentRegIds.has(id)))
  const currentClosedFiltered = new Set([...currentClosed].filter((id) => currentRegIds.has(id)))
  const priorInterviewFiltered = new Set([...priorInterview].filter((id) => priorRegIds.has(id)))
  const priorClosedFiltered = new Set([...priorClosed].filter((id) => priorRegIds.has(id)))

  const violations = {
    currentInterview: [...currentInterviewFiltered].filter((id) => registeredYm(candidatesById.get(id)) !== current),
    currentClosed: [...currentClosedFiltered].filter((id) => registeredYm(candidatesById.get(id)) !== current),
    priorInterview: [...priorInterviewFiltered].filter((id) => registeredYm(candidatesById.get(id)) !== prior),
    priorClosed: [...priorClosedFiltered].filter((id) => registeredYm(candidatesById.get(id)) !== prior),
  }

  const usersById = new Map(users.map((u) => [u.id, u]))
  function printRows(title, interviewSet, closedSet) {
    console.log(`\n=== ${title} ===`)
    const iMap = aggregateByConsultant(interviewSet, candidatesById)
    const cMap = aggregateByConsultant(closedSet, candidatesById)
    const rows = users
      .filter((u) => u.role !== 'admin')
      .map((u) => ({
        name: u.name,
        interview: iMap.get(u.id) || 0,
        closed: cMap.get(u.id) || 0,
      }))
      .filter((r) => r.interview > 0 || r.closed > 0)
      .sort((a, b) => (b.interview + b.closed) - (a.interview + a.closed))
    if (rows.length === 0) {
      console.log('（該当なし）')
      return
    }
    for (const r of rows) console.log(`${r.name}: 面接=${r.interview}, 成約=${r.closed}`)
  }

  console.log(`検証対象: 当月=${current}, 前月以前(選択月)=${prior}`)
  printRows(`当月登録ベース (${current})`, currentInterviewFiltered, currentClosedFiltered)
  printRows(`前月以前登録ベース (${prior})`, priorInterviewFiltered, priorClosedFiltered)

  const totalViolations =
    violations.currentInterview.length +
    violations.currentClosed.length +
    violations.priorInterview.length +
    violations.priorClosed.length

  if (totalViolations === 0) {
    console.log('\n✅ 登録月不整合は検出されませんでした。')
    return
  }

  console.log('\n❌ 登録月不整合を検出:')
  for (const [k, ids] of Object.entries(violations)) {
    if (!ids.length) continue
    console.log(`- ${k}: ${ids.length}件`)
    for (const id of ids.slice(0, 20)) {
      const c = candidatesById.get(id)
      const user = c ? usersById.get(c.consultant_id) : null
      console.log(`  - ${c?.name || id} / 登録月=${registeredYm(c)} / 担当=${user?.name || '-'}`)
    }
  }
  process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

