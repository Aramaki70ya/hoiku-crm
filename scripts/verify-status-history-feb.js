/**
 * status_historyから2月の面接・成約データを確認
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

  const year = 2026
  const month = 2
  const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10) + 'T00:00:00'
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

  console.log(`=== ${year}年${month}月のstatus_history検証 ===\n`)

  // 面接関連ステータス
  const INTERVIEW_RELEVANT_STATUSES = [
    '面接日程調整中',
    '面接確定済',
    '面接実施済（結果待ち）',
    '内定獲得（承諾確認中）',
    '内定承諾（成約）',
    '内定辞退',
  ]

  // 1. 全メンバー取得
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name')
    .is('retired_at', null)
    .order('name')

  if (userError) {
    console.error('users取得エラー:', userError.message)
    process.exit(1)
  }

  // 2. 2月に面接以上のステータスになった求職者を取得
  const { data: statusHistory, error: historyError } = await supabase
    .from('status_history')
    .select('candidate_id, old_status, new_status, changed_at')
    .in('new_status', INTERVIEW_RELEVANT_STATUSES)
    .gte('changed_at', monthStart)
    .lte('changed_at', monthEnd)
    .order('changed_at', { ascending: true })

  if (historyError) {
    console.error('status_history取得エラー:', historyError.message)
    process.exit(1)
  }

  console.log(`status_historyから${statusHistory?.length || 0}件の面接関連ステータス変更を発見\n`)

  // 3. 求職者情報を取得
  const candidateIds = [...new Set((statusHistory || []).map(h => h.candidate_id))]
  const { data: candidates, error: candidateError } = await supabase
    .from('candidates')
    .select('id, name, consultant_id, consultant:users(name)')
    .in('id', candidateIds)

  if (candidateError) {
    console.error('candidates取得エラー:', candidateError.message)
    process.exit(1)
  }

  const candidateMap = new Map((candidates || []).map(c => [c.id, c]))

  // 4. メンバーごとに集計
  const memberStats = {}

  // 初期化
  users.forEach(user => {
    memberStats[user.id] = {
      name: user.name,
      interviewCandidates: new Map(), // candidate_id -> { name, status, changedAt }
      closedCandidates: new Map(),    // candidate_id -> { name, changedAt }
    }
  })

  // status_historyから集計
  if (statusHistory) {
    statusHistory.forEach(h => {
      const candidate = candidateMap.get(h.candidate_id)
      if (candidate && candidate.consultant_id) {
        const consultantId = candidate.consultant_id
        if (memberStats[consultantId]) {
          // 面接関連ステータスになった求職者をカウント
          if (!memberStats[consultantId].interviewCandidates.has(h.candidate_id)) {
            memberStats[consultantId].interviewCandidates.set(h.candidate_id, {
              name: candidate.name,
              status: h.new_status,
              changedAt: h.changed_at ? h.changed_at.split('T')[0] + ' ' + h.changed_at.split('T')[1].slice(0, 5) : '-'
            })
          }

          // 成約になった求職者をカウント
          if (h.new_status === '内定承諾（成約）') {
            if (!memberStats[consultantId].closedCandidates.has(h.candidate_id)) {
              memberStats[consultantId].closedCandidates.set(h.candidate_id, {
                name: candidate.name,
                changedAt: h.changed_at ? h.changed_at.split('T')[0] + ' ' + h.changed_at.split('T')[1].slice(0, 5) : '-'
              })
            }
          }
        }
      }
    })
  }

  // 5. 結果を表示
  console.log('【面接数】= 2月にstatus_historyで面接以上のステータスになった求職者のユニーク数')
  console.log('【成約数】= 2月にstatus_historyで「内定承諾（成約）」になった求職者のユニーク数\n')

  users.forEach(user => {
    const stats = memberStats[user.id]
    const interviewList = Array.from(stats.interviewCandidates.values())
    const closedList = Array.from(stats.closedCandidates.values())
    
    console.log(`【${stats.name}】`)
    console.log(`  面接数: ${interviewList.length}件`)
    if (interviewList.length > 0) {
      interviewList.forEach((c, i) => {
        console.log(`    ${i + 1}. ${c.name} (${c.status}, ${c.changedAt})`)
      })
    }
    console.log(`  成約数: ${closedList.length}件`)
    if (closedList.length > 0) {
      closedList.forEach((c, i) => {
        console.log(`    ${i + 1}. ${c.name} (${c.changedAt})`)
      })
    }
    console.log('')
  })

  // 合計
  const totalInterviews = Object.values(memberStats).reduce((sum, s) => sum + s.interviewCandidates.size, 0)
  const totalClosed = Object.values(memberStats).reduce((sum, s) => sum + s.closedCandidates.size, 0)
  console.log(`=== 合計 ===`)
  console.log(`面接数: ${totalInterviews}件`)
  console.log(`成約数: ${totalClosed}件`)
}

main().catch((e) => { 
  console.error(e)
  process.exit(1) 
})
