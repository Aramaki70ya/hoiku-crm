/**
 * Supabase データベースのバックアップスクリプト
 *
 * マイグレーション実行前などに、主要テーブルのデータをJSONで保存する。
 *
 * 使い方（hoiku-crm ディレクトリで）:
 *   node scripts/backup-db.js
 *
 * 前提:
 *   .env.local に以下が設定されていること
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY（RLSを bypass して全件取得するため）
 *
 * 出力:
 *   supabase/backups/backup_YYYY-MM-DD_HH-mm-ss.json
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('.env.local が見つかりません:', envPath)
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。')
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

async function fetchTable(supabase, tableName) {
  const { data, error } = await supabase.from(tableName).select('*')
  if (error) {
    return { table: tableName, error: error.message, rows: [] }
  }
  return { table: tableName, rows: data || [], error: null }
}

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    console.error('環境変数が不足しています。')
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。')
    process.exit(1)
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupDir = path.join(__dirname, '..', 'supabase', 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  const outPath = path.join(backupDir, `backup_${timestamp}.json`)

  console.log('バックアップを開始します...')

  const tables = [
    'users',
    'sources',
    'candidates',
    'projects',
    'interviews',
    'contracts',
    'memos',
    'timeline_events',
    'status_history',
    'email_logs',
    'monthly_targets',
    'user_monthly_targets',
  ]

  const result = {
    backupAt: new Date().toISOString(),
    tables: {},
  }

  for (const tableName of tables) {
    const { table, rows, error } = await fetchTable(supabase, tableName)
    if (error) {
      console.log(`  ${table}: スキップ（${error}）`)
      result.tables[table] = { error, rows: [] }
    } else {
      console.log(`  ${table}: ${rows.length} 件`)
      result.tables[table] = { error: null, rows }
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8')
  console.log('')
  console.log('バックアップ完了:', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
