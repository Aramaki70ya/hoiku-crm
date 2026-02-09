/**
 * 連絡先一覧CSV と DB の「不一致」を、CSV を正として DB を更新する
 *
 * 使い方（hoiku-crm で）:
 *   node scripts/fix-csv-vs-db.js --dry-run   # 更新せずに内容だけ表示
 *   node scripts/fix-csv-vs-db.js             # 実際に DB を更新
 *   node scripts/fix-csv-vs-db.js --fill      # DBに存在するIDは連絡先・雇用形態・年齢をCSVで必ず上書き（スカスカ解消用）
 *   node scripts/fix-csv-vs-db.js "../元データ/求職者管理 - 連絡先一覧 .csv"
 *
 * 前提: check-csv-vs-db.js と同じ（.env.local の Supabase 設定、CSV パス）
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

function normalizePhone(phone) {
  if (phone == null || String(phone).trim() === '') return ''
  const cleaned = String(phone).replace(/\D/g, '')
  if (!cleaned) return ''
  if (cleaned.length === 10 && /^[9875]0/.test(cleaned)) {
    return '0' + cleaned
  }
  return cleaned
}

function n(str) {
  if (str == null) return ''
  return String(str).trim()
}

function normAge(val) {
  if (val == null || val === '') return null
  const num = parseInt(String(val), 10)
  if (Number.isNaN(num) || val === '125' || val === '126') return null
  if (num > 0 && num < 120) return num
  return null
}

/** 日付を YYYY-MM-DD に変換（csv-parser と同様） */
function parseDateString(dateStr) {
  if (dateStr === undefined || dateStr === null || String(dateStr).trim() === '') return null
  const num = Number(dateStr)
  if (!Number.isNaN(num) && num > 10000 && num < 1000000) {
    const d = new Date((num - 25569) * 86400 * 1000)
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  }
  const s = String(dateStr).trim()
  const match =
    s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/) ||
    s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/) ||
    s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return null
}

const STATUS_MAP = {
  新規: 'new',
  連絡中: 'contacting',
  初回済み: 'first_contact_done',
  提案中: 'proposing',
  面接中: 'interviewing',
  内定: 'offer',
  成約: 'closed_won',
  NG: 'closed_lost',
  追客中: 'pending',
  意向回収: 'on_hold',
}

async function main() {
  loadEnvLocal()

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const fillMode = args.includes('--fill')
  const csvArg = args.filter((a) => a !== '--dry-run' && a !== '--fill')[0]

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
    process.exit(1)
  }

  const csvPath = csvArg || path.join(__dirname, '..', '..', '元データ', '求職者管理 - 連絡先一覧 .csv')
  if (!fs.existsSync(csvPath)) {
    console.error('CSV が見つかりません:', csvPath)
    process.exit(1)
  }

  console.log('CSV:', csvPath)
  console.log('モード:', dryRun ? '--dry-run（更新しません）' : fillMode ? '--fill（DBにいるIDをCSVで連絡先・雇用形態・年齢を上書き）' : '本番（不一致のみ更新）')
  console.log('')

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
    const memoParts = [n(r['備考']), n(r['フォロー中断理由'])].filter(Boolean)
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
      memo: memoParts.length ? memoParts.join('\n') : null,
      status: n(r['ステータス']),
    })
  }

  // 同一IDが複数行ある場合、連絡先・雇用形態が埋まっている行を優先して1行にまとめる（後ろの行が空だと上書きされてnullになるのを防ぐ）
  const rowsById = new Map()
  for (const c of csvRows) {
    const id = c.id
    const existing = rowsById.get(id)
    const hasContact = normalizePhone(c.phone) || n(c.email)
    const hasEmployment = n(c.desired_employment_type)
    const ageOk = normAge(c.age) != null
    const score = (hasContact ? 2 : 0) + (hasEmployment ? 1 : 0) + (ageOk ? 1 : 0)
    const existingScore = existing
      ? (normalizePhone(existing.phone) || n(existing.email) ? 2 : 0) + (n(existing.desired_employment_type) ? 1 : 0) + (normAge(existing.age) != null ? 1 : 0)
      : -1
    if (!existing || score > existingScore) {
      rowsById.set(id, c)
    }
  }
  const csvRowsDeduped = Array.from(rowsById.values())

  // 氏名ごとに「連絡先・雇用形態が埋まっている行」を1件だけ保持（IDが違う同一人物の補填用）
  const bestRowByName = new Map()
  for (const c of csvRowsDeduped) {
    const nameKey = n(c.name)
    if (!nameKey) continue
    const hasContact = normalizePhone(c.phone) || n(c.email)
    const hasEmployment = n(c.desired_employment_type)
    const ageOk = normAge(c.age) != null
    const score = (hasContact ? 2 : 0) + (hasEmployment ? 1 : 0) + (ageOk ? 1 : 0)
    const existing = bestRowByName.get(nameKey)
    const existingScore = existing
      ? (normalizePhone(existing.phone) || n(existing.email) ? 2 : 0) + (n(existing.desired_employment_type) ? 1 : 0) + (normAge(existing.age) != null ? 1 : 0)
      : -1
    if (!existing || score > existingScore) {
      bestRowByName.set(nameKey, c)
    }
  }

  const supabase = createClient(url, key)
  const dbCandidates = []
  let offset = 0
  const PAGE = 1000
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

  const dbById = new Map(dbCandidates.map((c) => [String(c.id).trim(), c]))
  const csvById = new Map(csvRowsDeduped.map((c) => [c.id, c]))

  const mismatch = []
  if (fillMode) {
    // --fill: DBに存在するIDは、CSVで連絡先・雇用形態・年齢を補填（同一IDの行を優先、無ければ同一氏名のベスト行で補填）
    for (const [id, db] of dbById) {
      let c = csvById.get(id)
      if (!c) continue
      const nameKey = n(db.name)
      const hasData = normalizePhone(c.phone) || n(c.email) || n(c.desired_employment_type) || normAge(c.age) != null
      if (!hasData && nameKey) {
        const byName = bestRowByName.get(nameKey)
        if (byName && (normalizePhone(byName.phone) || n(byName.email) || n(byName.desired_employment_type) || normAge(byName.age) != null)) {
          c = { ...c, phone: byName.phone, email: byName.email, desired_employment_type: byName.desired_employment_type, age: byName.age, prefecture: byName.prefecture, address: byName.address, qualification: byName.qualification, desired_job_type: byName.desired_job_type, birth_date: byName.birth_date }
        }
      }
      mismatch.push({ ...c, dbName: n(db.name) })
    }
    console.log('--fill: DBに存在しCSVにもある件数（上書き対象）:', mismatch.length, '件')
  } else {
    for (const c of csvRowsDeduped) {
      const db = dbById.get(c.id)
      if (!db) continue

      const diff = []
      if (n(db.name) !== c.name) diff.push({ field: '氏名' })
      if (normalizePhone(db.phone) !== normalizePhone(c.phone)) diff.push({ field: '電話番号' })
      if (n(db.email) !== c.email) diff.push({ field: 'メールアドレス' })
      const csvAge = normAge(c.age)
      const dbAge = normAge(db.age)
      if (csvAge !== dbAge) diff.push({ field: '年齢' })
      if (n(db.prefecture) !== c.prefecture) diff.push({ field: '都道府県' })
      if (n(db.address) !== c.address) diff.push({ field: '市区町村' })
      if (n(db.desired_employment_type) !== c.desired_employment_type) diff.push({ field: '正・パ' })
      if (n(db.qualification) !== c.qualification) diff.push({ field: '保有資格' })
      if (n(db.desired_job_type) !== c.desired_job_type) diff.push({ field: '応募職種' })

      if (diff.length > 0) {
        mismatch.push({ ...c, dbName: n(db.name) })
      }
    }
    console.log('不一致件数（CSV で上書きする対象）:', mismatch.length, '件')
  }

  if (mismatch.length === 0) {
    console.log('修正対象はありません。')
    return
  }

  let updated = 0
  const errors = []

  for (const c of mismatch) {
    const phoneVal = normalizePhone(c.phone) || c.phone || null
    const ageVal = normAge(c.age)
    const birthDateVal = parseDateString(c.birth_date)
    const statusVal = STATUS_MAP[c.status] || 'new'

    const payload = {
      name: c.name,
      phone: phoneVal,
      email: c.email || null,
      birth_date: birthDateVal,
      age: ageVal,
      prefecture: c.prefecture || null,
      address: c.address || null,
      desired_employment_type: c.desired_employment_type || null,
      qualification: c.qualification || null,
      desired_job_type: c.desired_job_type || null,
      memo: c.memo,
      status: statusVal,
      updated_at: new Date().toISOString(),
    }

    if (dryRun) {
      console.log(`[dry-run] ID ${c.id}: ${c.dbName} → ${c.name}`)
      updated++
      continue
    }

    const { error } = await supabase.from('candidates').update(payload).eq('id', c.id)
    if (error) {
      errors.push({ id: c.id, name: c.name, message: error.message })
      continue
    }
    updated++
  }

  console.log('')
  console.log('更新完了:', updated, '件')
  if (errors.length > 0) {
    console.log('エラー:', errors.length, '件')
    errors.forEach((e) => console.log('  ', e.id, e.name, e.message))
  }
  if (dryRun) {
    console.log('（--dry-run のため DB は変更していません。本番で実行するにはオプションを外してください。）')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
