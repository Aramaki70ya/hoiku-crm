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

function parseIdNum(id: string): number {
  const n = parseInt(id, 10)
  return Number.isNaN(n) ? Infinity : n
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
    list.push(...(data ?? []).map((r) => ({ id: r.id, name: r.name })))
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
