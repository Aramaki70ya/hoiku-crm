/**
 * 指定の2件の成約がDBに存在するかチェック
 * 使い方: node scripts/check-two-contracts.js
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY
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

const TARGETS = [
  {
    label: '小熊知子さま',
    placementCompany: 'ナーサリールームベリーベアー東雲 Annex',
    revenue: 1041600
  },
  {
    label: '神田　真弓様',
    placementCompany: 'ゆめわかば保育園（株式会社ゆめのもり）',
    revenue: 883200
  }
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

  console.log('=== 成約2件のDB存在チェック ===\n')

  const { data: allContracts, error } = await supabase
    .from('contracts')
    .select(`
      id,
      candidate_id,
      accepted_date,
      revenue_excluding_tax,
      revenue_including_tax,
      placement_company,
      placement_company_name,
      placement_facility_name,
      candidates(id, name)
    `)

  if (error) {
    console.error('DB取得エラー:', error.message)
    process.exit(1)
  }

  for (const t of TARGETS) {
    console.log(`【${t.label}】`)
    console.log(`  成約先: ${t.placementCompany}`)
    console.log(`  成約金額: ${t.revenue.toLocaleString()}円`)

    const found = allContracts.filter((c) => {
      const revMatch = c.revenue_including_tax === t.revenue || c.revenue_excluding_tax === t.revenue
      const placement = c.placement_company || c.placement_company_name || c.placement_facility_name || ''
      const placementMatch =
        placement.includes(t.placementCompany) ||
        t.placementCompany.includes(placement)
      const name = (c.candidates && c.candidates.name) || ''
      const nameMatch =
        name.includes('小熊知子') ||
        name.includes('神田') && name.includes('真弓')
      return revMatch && (placementMatch || nameMatch)
    })

    if (found.length > 0) {
      console.log('  → ✅ DBに存在します')
      found.forEach((f) => {
        const cand = f.candidates || {}
        console.log(`      candidate_id: ${f.candidate_id}, 氏名: ${cand.name}`)
        console.log(`      placement_company: ${f.placement_company}`)
        console.log(`      税込: ${f.revenue_including_tax}円, 税抜: ${f.revenue_excluding_tax}円`)
        console.log(`      承諾日: ${f.accepted_date}`)
      })
    } else {
      // 成約金額のみでも検索
      const byRevenue = allContracts.filter(
        (c) => c.revenue_including_tax === t.revenue || c.revenue_excluding_tax === t.revenue
      )
      if (byRevenue.length > 0) {
        console.log('  → ⚠️ 成約金額は一致するが、園名が異なる可能性')
        byRevenue.forEach((f) => {
          const cand = f.candidates || {}
          console.log(`      candidate_id: ${f.candidate_id}, 氏名: ${cand.name}`)
          console.log(`      placement_company: ${f.placement_company}`)
        })
      } else {
        console.log('  → ❌ DBに該当データが見つかりません')
      }
    }
    console.log('')
  }

  console.log('--- 参考: 該当成約金額の全件 ---')
  const revenues = [1041600, 883200]
  const ref = allContracts.filter(
    (c) =>
      revenues.includes(c.revenue_including_tax) || revenues.includes(c.revenue_excluding_tax)
  )
  if (ref.length === 0) {
    console.log('  該当なし')
  } else {
    ref.forEach((r) => {
      const cand = r.candidates || {}
      console.log(`  ${cand.name} / ${r.placement_company} / ${r.revenue_including_tax}円`)
    })
  }

  // 神田・真弓・ゆめわかば で検索
  const { data: kandas } = await supabase.from('candidates').select('id, name').or('name.ilike.%神田%,name.ilike.%真弓%')
  const yumewakaba = allContracts.filter((c) => {
    const p = (c.placement_company || c.placement_company_name || c.placement_facility_name || '')
    return p.includes('ゆめわかば') || p.includes('ゆめのもり')
  })
  console.log('\n--- 神田/真弓 の求職者 ---')
  console.log(kandas && kandas.length ? kandas.map((k) => `${k.id}: ${k.name}`).join(', ') : '該当なし')
  console.log('\n--- ゆめわかば/ゆめのもり の成約 ---')
  if (yumewakaba.length) {
    yumewakaba.forEach((y) => {
      const cand = y.candidates || {}
      console.log(`  ${cand.name} / ${y.placement_company} / ${y.revenue_including_tax}円`)
    })
  } else {
    console.log('  該当なし')
  }

  // 神田真弓(20206847)の成約一覧
  const { data: kandaContracts } = await supabase
    .from('contracts')
    .select('id, accepted_date, revenue_including_tax, placement_company')
    .eq('candidate_id', '20206847')
  console.log('\n--- 神田真弓(20206847)の成約 ---')
  if (kandaContracts && kandaContracts.length) {
    kandaContracts.forEach((k) => console.log(`  ${k.accepted_date} / ${k.placement_company} / ${k.revenue_including_tax}円`))
  } else {
    console.log('  成約なし（未登録）')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
