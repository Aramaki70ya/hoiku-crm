/**
 * 1月成約10件の candidates / projects / contracts の紐付きを確認
 * 使い方: node scripts/check-jan-contracts-links.js
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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, name, consultant_id, status')
    .in('id', JAN_IDS)

  const { data: projects } = await supabase
    .from('projects')
    .select('id, candidate_id, phase, garden_name, corporation_name')
    .in('candidate_id', JAN_IDS)

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, candidate_id, project_id, accepted_date, revenue_including_tax')
    .in('candidate_id', JAN_IDS)
    .gte('accepted_date', '2026-01-01')
    .lte('accepted_date', '2026-01-31')

  const projectsByCandidate = new Map()
  for (const p of projects || []) {
    if (!projectsByCandidate.has(p.candidate_id)) {
      projectsByCandidate.set(p.candidate_id, [])
    }
    projectsByCandidate.get(p.candidate_id).push(p)
  }

  const contractByCandidate = new Map()
  for (const c of contracts || []) {
    contractByCandidate.set(c.candidate_id, c)
  }

  const candidatesById = new Map((candidates || []).map((c) => [c.id, c]))

  console.log('=== 1月成約10件の紐付き確認 ===\n')

  let ok = 0
  let missingProject = 0
  let contractProjectNull = 0

  for (const cid of JAN_IDS) {
    const cand = candidatesById.get(cid)
    const projs = projectsByCandidate.get(cid) || []
    const contract = contractByCandidate.get(cid)

    const name = cand?.name || '?'
    const hasCandidate = !!cand
    const hasProjects = projs.length > 0
    const contractHasProject = contract?.project_id != null

    if (!contract) {
      console.log(`${cid} ${name}: 成約レコードなし`)
      continue
    }

    if (!hasProjects) {
      missingProject++
      console.log(`${cid} ${name}: 案件(projects)なし (contract.project_id=${contract.project_id || 'null'})`)
      continue
    }

    if (!contractHasProject) {
      contractProjectNull++
      console.log(`${cid} ${name}: 案件は${projs.length}件あるが contract.project_id が null`)
      projs.forEach((p) => console.log(`    project ${p.id} phase=${p.phase} ${p.garden_name || p.corporation_name || ''}`))
      continue
    }

    const linked = projs.find((p) => p.id === contract.project_id)
    if (!linked) {
      console.log(`${cid} ${name}: contract.project_id が別の案件を参照している可能性`)
    } else {
      ok++
      console.log(`${cid} ${name}: OK (project phase=${linked.phase})`)
    }
  }

  console.log('\n--- サマリ ---')
  console.log('  成約10件のうち:')
  console.log('    案件(projects)なし:', missingProject, '件')
  console.log('    contract.project_id が null:', contractProjectNull, '件')
  console.log('    紐付きOK:', ok, '件')
}

main().catch((e) => { console.error(e); process.exit(1); })
