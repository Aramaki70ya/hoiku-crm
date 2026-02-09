/**
 * 1月成約10件の contract.project_id を紐付ける
 * 各 candidate の project のうち phase='accepted' を優先して contract に設定
 *
 * 使い方: node scripts/fix-jan-contracts-project-links.js [--dry-run]
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
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  })
}

const JAN_IDS = [
  '20206672', '20206855', '20206056', '20206190', '20206387',
  '20206619', '20206795', '20206879', '20206642', '20206656',
]

async function main() {
  loadEnvLocal()
  const dryRun = process.argv.includes('--dry-run')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, candidate_id, project_id')
    .in('candidate_id', JAN_IDS)
    .gte('accepted_date', '2026-01-01')
    .lte('accepted_date', '2026-01-31')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, candidate_id, phase, updated_at')
    .in('candidate_id', JAN_IDS)

  const projectsByCandidate = new Map()
  for (const p of projects || []) {
    if (!projectsByCandidate.has(p.candidate_id)) {
      projectsByCandidate.set(p.candidate_id, [])
    }
    projectsByCandidate.get(p.candidate_id).push(p)
  }

  console.log('=== 1月成約 contract ↔ project 紐付け ===\n')
  if (dryRun) console.log('（--dry-run: 更新しません）\n')

  let updated = 0
  for (const contract of contracts || []) {
    const projs = (projectsByCandidate.get(contract.candidate_id) || [])
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))

    if (projs.length === 0) {
      console.log(contract.candidate_id, ': 案件なし → スキップ')
      continue
    }

    const accepted = projs.filter((p) => p.phase === 'accepted')
    const target = accepted.length >= 1 ? accepted[0] : projs[0]

    if (contract.project_id === target.id) {
      console.log(contract.candidate_id, ': 既に紐付き済み')
      continue
    }

    console.log(contract.candidate_id, `: contract ${contract.id} → project ${target.id} (phase=${target.phase})`)
    if (!dryRun) {
      const { error } = await supabase
        .from('contracts')
        .update({ project_id: target.id })
        .eq('id', contract.id)
      if (error) {
        console.error('  エラー:', error.message)
        continue
      }
      updated++
    } else {
      updated++
    }
  }

  console.log('\n紐付け', dryRun ? '予定' : '完了', ':', updated, '件')
}

main().catch((e) => { console.error(e); process.exit(1); })
