/**
 * contracts に cancelled_at / resignation_date / refund_rate を追加するマイグレーションを実行する。
 *
 * 方法A: Supabase Dashboard → SQL Editor に
 *   supabase/migrations/20260331120000_contract_cancel_columns.sql
 *   の内容を貼り付けて実行。
 *
 * 方法B: ローカルに supabase CLI がある場合
 *   cd hoiku-crm && npx supabase db push
 *
 * このスクリプトは SQL を表示するだけ（Postgres 直結が無い環境向け）。
 */
const fs = require('fs')
const path = require('path')

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260331120000_contract_cancel_columns.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

console.log('--- 以下を Supabase SQL Editor で実行してください ---\n')
console.log(sql)
console.log('\n--- 終わり ---')
