import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const PAGE_SIZE = 1000

/**
 * 既存 ID のうち数値として解釈できるものの最大値 + 1 を返す。
 * ORDER BY id（TEXT）では桁違いの ID で辞書順と数値順がずれ、重複キーや取りこぼしになるため、API の新規登録と同期で共通利用する。
 */
export function computeNextNumericCandidateId(existingIds: Iterable<string>): string {
  const nums = Array.from(existingIds, (s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 20200001
  return String(next)
}

/** candidates.id を全件取得（PostgREST のデフォルト行上限をページングで回避） */
export async function fetchAllCandidateIds(supabase: SupabaseClient<Database>): Promise<string[]> {
  const ids: string[] = []
  let offset = 0
  while (true) {
    const { data: page, error } = await supabase
      .from('candidates')
      .select('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const rows = (page ?? []) as { id: string }[]
    for (const r of rows) {
      ids.push(r.id)
    }
    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return ids
}
