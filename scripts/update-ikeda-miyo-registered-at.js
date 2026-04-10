/**
 * Pool Ikeda Miyo: set registered_at to 2026-04-06 on production Supabase.
 * - If candidate exists (name match), UPDATE registered_at only.
 * - Else INSERT one row (consultant: Takizawa, source: Baitoru if present).
 *
 * Usage: node scripts/update-ikeda-miyo-registered-at.js
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local:', envPath)
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

const REGISTERED_AT = '2026-04-06'
const NAME_PRIMARY = '\u6c60\u7530 \u7f8e\u4e88'
const NAME_ALT = '\u6c60\u7530\u7f8e\u4e88'
const CONSULTANT_NAME = '\u7027\u6fa4'
const SOURCE_NAME = '\u30d0\u30a4\u30c8\u30eb'
const NEW_ID = '20206605'

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY \u304c .env.local \u306b\u3042\u308a\u307e\u305b\u3093\u3002' +
        ' Supabase \u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9 \u306e API \u304b\u3089 service_role \u3092\u8ffd\u52a0\u3059\u308b\u304b\u3001' +
        ' SQL \u30a8\u30c7\u30a3\u30bf\u3067 supabase/migrations/20260410120000_ikeda_miyo_registered_at.sql \u3092\u5b9f\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    )
    process.exit(1)
  }

  const supabase = createClient(url, key)

  for (const name of [NAME_PRIMARY, NAME_ALT]) {
    const { data: rows, error: findErr } = await supabase
      .from('candidates')
      .select('id, name, registered_at')
      .eq('name', name)
      .limit(2)

    if (findErr) {
      console.error('Search error:', findErr.message)
      process.exit(1)
    }

    if (rows && rows.length > 0) {
      for (const c of rows) {
        const { error: updateErr } = await supabase
          .from('candidates')
          .update({ registered_at: REGISTERED_AT })
          .eq('id', c.id)

        if (updateErr) {
          console.error('Update error:', updateErr.message)
          process.exit(1)
        }
        console.log('OK updated registered_at:', c.name, 'id:', c.id, '->', REGISTERED_AT)
      }
      return
    }
  }

  console.log('No existing row; inserting new candidate')

  const { data: consultants, error: consErr } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', CONSULTANT_NAME)
    .limit(1)

  if (consErr || !consultants?.length) {
    console.error('Consultant not found:', CONSULTANT_NAME, consErr?.message || '')
    process.exit(1)
  }

  const { data: sources, error: srcErr } = await supabase.from('sources').select('id, name').eq('name', SOURCE_NAME).limit(1)

  if (srcErr) {
    console.error('Source fetch error:', srcErr.message)
    process.exit(1)
  }

  const sourceId = sources?.[0]?.id ?? null
  const now = new Date().toISOString()

  const row = {
    id: NEW_ID,
    name: NAME_PRIMARY,
    kana: '\u30a4\u30b1\u30c0 \u30df\u30e8',
    phone: '09033334444',
    email: 'miyo.ikeda@example.com',
    birth_date: '1995-04-06',
    age: 30,
    prefecture: '\u6771\u4eac\u90fd',
    address: '\u4e16\u7530\u8c37\u533a',
    qualification: '\u4fdd\u80b2\u58eb',
    desired_employment_type: '\u6b63\u793e\u54e1',
    desired_job_type: '\u4fdd\u80b2\u58eb',
    status: '\u521d\u56de\u9023\u7d61\u4e2d',
    source_id: sourceId,
    registered_at: REGISTERED_AT,
    re_registered_at: null,
    consultant_id: consultants[0].id,
    approach_priority: 'B',
    rank: 'B',
    drive_link: null,
    memo: null,
    created_at: now,
    updated_at: now,
  }

  const { error: insErr } = await supabase.from('candidates').insert(row)

  if (insErr) {
    console.error('Insert error:', insErr.message, insErr)
    process.exit(1)
  }

  console.log('OK inserted:', NAME_PRIMARY, 'id:', NEW_ID, 'registered_at:', REGISTERED_AT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
