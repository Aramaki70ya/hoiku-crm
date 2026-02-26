/**
 * 同一氏名の求職者を1人にマージする（スプシを正＝2020xxxxの最小IDを残す）
 * メモ・ステータス変更・案件・タイムライン・契約は残すIDに集約してから重複を削除。
 * API または CLI から呼ぶ用。
 * recentDays を指定した場合、直近 N 日以内に登録された求職者のみを対象にし、
 * 同名の別人を誤マージするレアケースの発生確率を下げる。
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const PAGE_SIZE = 1000
const SHEET_ID_PATTERN = /^2020\d{4}$/
const TABLES = ['memos', 'timeline_events', 'status_history', 'projects', 'contracts'] as const
const CANDIDATE_SELECT_FIELDS = 'id, name, kana, phone, email, age, birth_date, prefecture, address, qualification, desired_employment_type, desired_job_type, status, source_id, registered_at, consultant_id, approach_priority, rank, memo, drive_link'

function parseIdNum(id: string): number {
  const n = parseInt(id, 10)
  return Number.isNaN(n) ? Infinity : n
}

function isBlankValue(v: unknown): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '')
}

function mergeMemoValue(keptMemo: string | null, dupMemo: string | null): string | null {
  const kept = (keptMemo ?? '').trim()
  const dup = (dupMemo ?? '').trim()
  if (!kept && !dup) return null
  if (!kept) return dup
  if (!dup) return kept
  if (kept === dup || kept.includes(dup)) return kept
  if (dup.includes(kept)) return dup
  return `${kept}\n\n${dup}`
}

interface MergeCandidateRow {
  id: string
  name: string | null
  kana: string | null
  phone: string | null
  email: string | null
  age: number | null
  birth_date: string | null
  prefecture: string | null
  address: string | null
  qualification: string | null
  desired_employment_type: string | null
  desired_job_type: string | null
  status: string | null
  source_id: string | null
  registered_at: string | null
  consultant_id: string | null
  approach_priority: string | null
  rank: string | null
  memo: string | null
  drive_link: string | null
}

export interface MergeDuplicateOptions {
  /** 指定した場合、created_at が直近 N 日以内の求職者のみを対象にする（同名別人の誤マージを避ける） */
  recentDays?: number
}

export interface MergeDuplicateResult {
  mergedGroups: number
  mergedCount: number
  details: { name: string; keptId: string; mergeIds: string[] }[]
  errors: string[]
}

export async function mergeDuplicateCandidates(
  supabase: SupabaseClient<Database>,
  options: MergeDuplicateOptions = {}
): Promise<MergeDuplicateResult> {
  const result: MergeDuplicateResult = {
    mergedGroups: 0,
    mergedCount: 0,
    details: [],
    errors: [],
  }

  const { recentDays } = options
  const cutoff =
    recentDays != null
      ? (() => {
          const d = new Date()
          d.setDate(d.getDate() - recentDays)
          d.setUTCHours(0, 0, 0, 0)
          return d.toISOString()
        })()
      : null

  const list: { id: string; name: string | null }[] = []
  let offset = 0
  while (true) {
    let query = supabase.from('candidates').select('id, name, created_at')
    if (cutoff) {
      query = query.gte('created_at', cutoff)
    }
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      result.errors.push(`candidates 取得: ${error.message}`)
      return result
    }
    const rows = (data ?? []) as { id: string; name: string | null }[]
    list.push(...rows.map((r) => ({ id: r.id, name: r.name })))
    if (!data || data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  const byName = new Map<string, string[]>()
  for (const r of list) {
    const name = (r.name ?? '').trim()
    if (!name) continue
    if (!byName.has(name)) byName.set(name, [])
    byName.get(name)!.push(r.id)
  }

  const duplicates: { name: string; keptId: string; mergeIds: string[] }[] = []
  for (const [name, ids] of byName) {
    if (ids.length <= 1) continue
    const sheetStyle = ids.filter((id) => SHEET_ID_PATTERN.test(id))
    const candidateIds = sheetStyle.length > 0 ? sheetStyle : ids
    candidateIds.sort((a, b) => parseIdNum(a) - parseIdNum(b))
    const keptId = candidateIds[0]
    const mergeIds = ids.filter((id) => id !== keptId)
    duplicates.push({ name, keptId, mergeIds })
  }

  result.mergedGroups = duplicates.length
  result.details = duplicates

  for (const { name, keptId, mergeIds } of duplicates) {
    for (const dupId of mergeIds) {
      const { data: pairRows, error: pairError } = await supabase
        .from('candidates')
        .select(CANDIDATE_SELECT_FIELDS)
        .in('id', [keptId, dupId])
      if (pairError) {
        result.errors.push(`candidates ${dupId}/${keptId} 取得: ${pairError.message}`)
        continue
      }
      const pair = (pairRows ?? []) as MergeCandidateRow[]
      const keptRow = pair.find((r) => r.id === keptId)
      const dupRow = pair.find((r) => r.id === dupId)
      if (!keptRow || !dupRow) {
        result.errors.push(`candidates ${dupId}/${keptId} 取得: レコードが見つかりません`)
        continue
      }

      const updates: Record<string, unknown> = {}
      const fillIfKeptBlank = (key: keyof MergeCandidateRow): void => {
        if (key === 'id' || key === 'name' || key === 'memo') return
        if (isBlankValue(keptRow[key]) && !isBlankValue(dupRow[key])) {
          updates[key] = dupRow[key]
        }
      }
      fillIfKeptBlank('kana')
      fillIfKeptBlank('phone')
      fillIfKeptBlank('email')
      fillIfKeptBlank('age')
      fillIfKeptBlank('birth_date')
      fillIfKeptBlank('prefecture')
      fillIfKeptBlank('address')
      fillIfKeptBlank('qualification')
      fillIfKeptBlank('desired_employment_type')
      fillIfKeptBlank('desired_job_type')
      fillIfKeptBlank('status')
      fillIfKeptBlank('source_id')
      fillIfKeptBlank('registered_at')
      fillIfKeptBlank('consultant_id')
      fillIfKeptBlank('approach_priority')
      fillIfKeptBlank('rank')
      fillIfKeptBlank('drive_link')
      const mergedMemo = mergeMemoValue(keptRow.memo, dupRow.memo)
      if (mergedMemo !== keptRow.memo) {
        updates.memo = mergedMemo
      }
      if (Object.keys(updates).length > 0) {
        const { error: updateCandidateError } = await supabase
          .from('candidates')
          .update(updates as never)
          .eq('id', keptId)
        if (updateCandidateError) {
          result.errors.push(`candidates ${dupId}→${keptId} 本体統合: ${updateCandidateError.message}`)
          continue
        }
      }

      for (const table of TABLES) {
        const { error } = await supabase
          .from(table as 'memos')
          .update({ candidate_id: keptId } as never)
          .eq('candidate_id', dupId)
        if (error) result.errors.push(`${table} ${dupId}→${keptId}: ${error.message}`)
      }
      const { error: delErr } = await supabase.from('candidates').delete().eq('id', dupId)
      if (delErr) result.errors.push(`candidates delete ${dupId}: ${delErr.message}`)
      else result.mergedCount += 1
    }
  }

  return result
}
