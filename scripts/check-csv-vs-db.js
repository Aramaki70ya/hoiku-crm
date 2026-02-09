/**
 * 連絡先一覧CSV と DB（candidates）を突き合わせチェック
 * 名前・電話・メール・年齢・住所・職種などが一致するか検証する
 *
 * 使い方（hoiku-crm で）:
 *   node scripts/check-csv-vs-db.js
 *   node scripts/check-csv-vs-db.js "../元データ/求職者管理 - 連絡先一覧 .csv"
 *
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が設定されていること
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// .env.local を読み込む
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

/** CSV 1行をパース（カンマ区切り・ダブルクォート内のカンマは無視） */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.trim())
  return result
}

/** 電話番号正規化（csv-parser と同じロジック） */
function normalizePhone(phone) {
  if (phone == null || String(phone).trim() === '') return ''
  const cleaned = String(phone).replace(/\D/g, '')
  if (!cleaned) return ''
  if (cleaned.length === 10 && /^[9875]0/.test(cleaned)) {
    return '0' + cleaned
  }
  return cleaned
}

/** 比較用に文字列を正規化（前後空白・空は ''） */
function n(str) {
  if (str == null) return ''
  return String(str).trim()
}

/** 年齢を比較用に（125/126 は不明として null、数値はそのまま） */
function normAge(val) {
  if (val == null || val === '') return null
  const num = parseInt(String(val), 10)
  if (Number.isNaN(num) || val === '125' || val === '126') return null
  if (num > 0 && num < 120) return num
  return null
}

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
    process.exit(1)
  }

  const csvPath = process.argv[2] || path.join(__dirname, '..', '..', '元データ', '求職者管理 - 連絡先一覧 .csv')
  if (!fs.existsSync(csvPath)) {
    console.error('CSV が見つかりません:', csvPath)
    console.error('使い方: node scripts/check-csv-vs-db.js [CSVのパス]')
    process.exit(1)
  }

  console.log('CSV:', csvPath)
  console.log('Supabase URL:', url.replace(/https?:\/\//, ''))

  const csvContent = fs.readFileSync(csvPath, 'utf8')
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    console.error('CSV にヘッダーとデータ行がありません')
    process.exit(1)
  }

  const headers = parseCSVLine(lines[0])
  const row = (line) => {
    const values = parseCSVLine(line)
    const o = {}
    headers.forEach((h, i) => {
      o[h] = values[i] != null ? values[i] : ''
    })
    return o
  }

  const csvRows = []
  for (let i = 1; i < lines.length; i++) {
    const r = row(lines[i])
    const id = n(r['ID'])
    const name = n(r['氏名'])
    if (!id || id === '125') continue
    if (!name) continue
    csvRows.push({
      id,
      name,
      phone: n(r['電話番号']),
      email: n(r['メールアドレス']),
      birth_date: n(r['生年月日']),
      age: r['年齢'],
      prefecture: n(r['都道府県']),
      address: n(r['市区町村']),
      desired_employment_type: n(r['正・パ']),
      qualification: n(r['保有資格']),
      desired_job_type: n(r['応募職種']),
    })
  }

  console.log('CSV 有効行数:', csvRows.length)

  const supabase = createClient(url, key)
  const dbCandidates = []
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, phone, email, birth_date, age, prefecture, address, desired_employment_type, qualification, desired_job_type')
      .range(offset, offset + PAGE - 1)
    if (error) {
      console.error('DB 取得エラー:', error.message)
      process.exit(1)
    }
    dbCandidates.push(...(data || []))
    if ((data || []).length < PAGE) break
    offset += PAGE
  }

  console.log('DB candidates 件数:', dbCandidates.length)

  const dbById = new Map(dbCandidates.map((c) => [String(c.id).trim(), c]))

  const ok = []
  const mismatch = []
  const onlyCsv = []
  const onlyDb = []

  for (const c of csvRows) {
    const db = dbById.get(c.id)
    if (!db) {
      onlyCsv.push({ id: c.id, name: c.name })
      continue
    }

    const diff = []
    if (n(db.name) !== c.name) diff.push({ field: '氏名', csv: c.name, db: n(db.name) })
    if (normalizePhone(db.phone) !== normalizePhone(c.phone)) diff.push({ field: '電話番号', csv: c.phone, db: n(db.phone) })
    if (n(db.email) !== c.email) diff.push({ field: 'メールアドレス', csv: c.email, db: n(db.email) })
    const csvAge = normAge(c.age)
    const dbAge = normAge(db.age)
    if (csvAge !== dbAge) diff.push({ field: '年齢', csv: c.age, db: String(db.age ?? '') })
    if (n(db.prefecture) !== c.prefecture) diff.push({ field: '都道府県', csv: c.prefecture, db: n(db.prefecture) })
    if (n(db.address) !== c.address) diff.push({ field: '市区町村(住所)', csv: c.address, db: n(db.address) })
    if (n(db.desired_employment_type) !== c.desired_employment_type) diff.push({ field: '正・パ(雇用形態)', csv: c.desired_employment_type, db: n(db.desired_employment_type) })
    if (n(db.qualification) !== c.qualification) diff.push({ field: '保有資格', csv: c.qualification, db: n(db.qualification) })
    if (n(db.desired_job_type) !== c.desired_job_type) diff.push({ field: '応募職種', csv: c.desired_job_type, db: n(db.desired_job_type) })

    if (diff.length === 0) {
      ok.push({ id: c.id, name: c.name })
    } else {
      mismatch.push({ id: c.id, name: c.name, csvName: c.name, dbName: n(db.name), diff })
    }
  }

  const csvIds = new Set(csvRows.map((r) => r.id))
  for (const c of dbCandidates) {
    const id = String(c.id).trim()
    if (!csvIds.has(id)) onlyDb.push({ id, name: n(c.name) })
  }

  console.log('\n========== 突き合わせ結果 ==========\n')
  console.log('一致（CSV と DB が同じ）:', ok.length, '件')
  console.log('不一致（名前・連絡先・年齢等のいずれかが異なる）:', mismatch.length, '件')
  console.log('CSV にのみ存在（DB に未登録）:', onlyCsv.length, '件')
  console.log('DB にのみ存在（CSV にない）:', onlyDb.length, '件')

  if (mismatch.length > 0) {
    console.log('\n--- 不一致の内訳（最大50件）---\n')
    mismatch.slice(0, 50).forEach((m, i) => {
      console.log(`${i + 1}. ID: ${m.id}  氏名(CSV): ${m.csvName}  氏名(DB): ${m.dbName}`)
      m.diff.forEach((d) => {
        console.log(`   [${d.field}]  CSV: ${d.csv || '(空)'}  |  DB: ${d.db || '(空)'}`)
      })
      console.log('')
    })
    if (mismatch.length > 50) {
      console.log(`... 他 ${mismatch.length - 50} 件の不一致があります。`)
    }
  }

  if (onlyCsv.length > 0 && onlyCsv.length <= 20) {
    console.log('\n--- CSV にのみ存在（DB 未登録）---')
    onlyCsv.forEach((c) => console.log(`  ${c.id}  ${c.name}`))
  } else if (onlyCsv.length > 20) {
    console.log('\n--- CSV にのみ存在: 先頭20件 ---')
    onlyCsv.slice(0, 20).forEach((c) => console.log(`  ${c.id}  ${c.name}`))
    console.log(`  ... 他 ${onlyCsv.length - 20} 件`)
  }

  if (mismatch.length > 0) {
    const outPath = path.join(__dirname, '..', 'check-csv-vs-db-result.json')
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          summary: { ok: ok.length, mismatch: mismatch.length, onlyCsv: onlyCsv.length, onlyDb: onlyDb.length },
          mismatch: mismatch.map((m) => ({
            id: m.id,
            csvName: m.csvName,
            dbName: m.dbName,
            diff: m.diff,
          })),
        },
        null,
        2
      ),
      'utf8'
    )
    console.log('\n不一致の詳細を保存しました:', outPath)
  }

  console.log('\n完了.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
