/**
 * スプレッドシート/API から受け取った行を新規のみ DB にインサートする共通ロジック
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { rowToCandidateForSync, type SpreadsheetRow } from './csv-parser'

type CandidateInsert = Database['public']['Tables']['candidates']['Insert']

export interface SyncResult {
  inserted: number
  skipped: number
  errors: { row: number; id?: string; message: string }[]
}

/**
 * スプレッドシート/API の行配列を受け取り、新規の行だけ candidates に INSERT する。
 * 既存 ID はスキップ。consultant_id / source_id は担当者名・媒体名から解決する。
 */
export async function syncCandidatesFromRows(
  supabase: SupabaseClient<Database>,
  rows: SpreadsheetRow[]
): Promise<SyncResult> {
  const result: SyncResult = { inserted: 0, skipped: 0, errors: [] }

  if (rows.length === 0) return result

  const { data: existingRows } = await supabase.from('candidates').select('id')
  const existingIdList = (existingRows ?? []) as { id: string }[]
  const existingIds = new Set(existingIdList.map((r) => r.id))

  const { data: users } = await supabase.from('users').select('id, name')
  const userList = (users ?? []) as { id: string; name: string }[]
  const nameToUserId = new Map<string, string>()
  for (const u of userList) {
    nameToUserId.set(u.name, u.id)
  }

  const { data: sources } = await supabase.from('sources').select('id, name')
  const sourceList = (sources ?? []) as { id: string; name: string }[]
  const nameToSourceId = new Map<string, string>()
  for (const s of sourceList) {
    nameToSourceId.set(s.name, s.id)
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const id = (row['ID'] ?? '').toString().trim()
    if (!id || id === '125') continue

    const parsed = rowToCandidateForSync(row)
    if (!parsed || parsed.name === '') continue

    if (existingIds.has(id)) {
      result.skipped += 1
      continue
    }

    const consultantName = (row['担当者'] ?? '').toString().trim()
    const primaryConsultant = consultantName.split(/[・\s]/)[0]?.trim()
    const consultant_id = primaryConsultant ? nameToUserId.get(primaryConsultant) ?? null : null

    const sourceName = (row['媒体'] ?? '').toString().trim()
    const source_id = sourceName ? nameToSourceId.get(sourceName) ?? null : null

    const insert: CandidateInsert = {
      id: parsed.id!,
      name: parsed.name ?? '',
      kana: parsed.kana ?? null,
      phone: parsed.phone ?? null,
      email: parsed.email ?? null,
      birth_date: parsed.birth_date ?? null,
      age: parsed.age ?? null,
      prefecture: parsed.prefecture ?? null,
      address: parsed.address ?? null,
      qualification: parsed.qualification ?? null,
      desired_employment_type: parsed.desired_employment_type ?? null,
      desired_job_type: parsed.desired_job_type ?? null,
      status: parsed.status ?? 'new',
      source_id,
      registered_at: parsed.registered_at ?? null,
      consultant_id,
      approach_priority: null,
      rank: null,
      memo: parsed.memo ?? null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('candidates').insert(insert as any)
    if (error) {
      result.errors.push({ row: i + 1, id, message: error.message })
      continue
    }
    result.inserted += 1
    existingIds.add(id)
  }

  return result
}
