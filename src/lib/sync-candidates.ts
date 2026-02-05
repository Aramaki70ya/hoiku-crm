/**
 * スプレッドシート/API から受け取った行を新規のみ DB にインサートする共通ロジック
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { rowToCandidateForSync, normalizePhone, type SpreadsheetRow } from './csv-parser'

type CandidateInsert = Database['public']['Tables']['candidates']['Insert']

/** 1リクエストあたりの最大処理行数 */
const MAX_ROWS = 200

export interface SyncResult {
  inserted: number
  skipped: number
  /** 登録日が空だった既存求職者に登録日を補完した件数 */
  backfilled: number
  errors: { row: number; id?: string; message: string }[]
  /** 追加した人: { id, name } */
  insertedLog: { id: string; name: string }[]
  /** 重複でスキップした人: { id, name } */
  skippedLog: { id: string; name: string }[]
  /** 登録日を補完した人: { id, name } */
  backfilledLog: { id: string; name: string }[]
}

/**
 * スプレッドシート/API の行配列を受け取り、新規の行だけ candidates に INSERT する。
 * 既存 ID はスキップ。consultant_id / source_id は担当者名・媒体名から解決する。
 */
export async function syncCandidatesFromRows(
  supabase: SupabaseClient<Database>,
  rows: SpreadsheetRow[]
): Promise<SyncResult> {
  const result: SyncResult = {
    inserted: 0,
    skipped: 0,
    backfilled: 0,
    errors: [],
    insertedLog: [],
    skippedLog: [],
    backfilledLog: [],
  }

  if (rows.length === 0) return result

  const rowsToProcess = rows.slice(0, MAX_ROWS)
  if (rows.length > MAX_ROWS) {
    result.errors.push({ row: MAX_ROWS + 1, message: `上限${MAX_ROWS}行のため、${rows.length - MAX_ROWS}行は未処理` })
  }

  // Supabase はデフォルトで最大1000件しか返さないため、全件取得するまでページングする
  const PAGE_SIZE = 1000
  const existingList: { id: string; registered_at: string | null; phone: string | null }[] = []
  let offset = 0
  while (true) {
    const { data: page } = await supabase
      .from('candidates')
      .select('id, registered_at, phone')
      .range(offset, offset + PAGE_SIZE - 1)
    const pageRows = (page ?? []) as { id: string; registered_at: string | null; phone: string | null }[]
    existingList.push(...pageRows)
    if (pageRows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  const existingIds = new Set(existingList.map((r) => r.id))
  const registeredAtById = new Map<string, string | null>(
    existingList.map((r) => [r.id, r.registered_at ?? null])
  )
  // 電話番号重複チェック用（正規化済みの番号を収集）
  const existingPhones = new Set<string>()
  for (const r of existingList) {
    const norm = normalizePhone(r.phone ?? '')
    if (norm) existingPhones.add(norm)
  }

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

  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i]
    const id = (row['ID'] ?? '').toString().trim()
    if (!id || id === '125') continue

    const parsed = rowToCandidateForSync(row)
    if (!parsed || parsed.name === '') continue

    const name = parsed.name ?? ''
    if (existingIds.has(id)) {
      const rowDate = parsed.registered_at ?? null
      const currentRegisteredAt = registeredAtById.get(id) ?? null
      if (rowDate && !currentRegisteredAt) {
        const { error: updateError } = await supabase
          .from('candidates')
          .update({ registered_at: rowDate })
          .eq('id', id)
        if (updateError) {
          result.errors.push({ row: i + 1, id, message: `登録日補完失敗: ${updateError.message}` })
        } else {
          result.backfilled += 1
          result.backfilledLog.push({ id, name })
          registeredAtById.set(id, rowDate)
        }
      } else {
        result.skipped += 1
        result.skippedLog.push({ id, name })
      }
      continue
    }

    // 電話番号重複チェック（ID は新規だが同一電話番号が既存ならスキップ）
    const normPhone = normalizePhone(parsed.phone ?? '')
    if (normPhone && existingPhones.has(normPhone)) {
      result.skipped += 1
      result.skippedLog.push({ id, name })
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
      phone: normPhone ?? parsed.phone ?? null, // 正規化済み（頭0補完）で保存
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
    result.insertedLog.push({ id, name })
    existingIds.add(id)
    if (normPhone) existingPhones.add(normPhone)
  }

  return result
}
