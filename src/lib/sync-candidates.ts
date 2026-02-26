/**
 * スプレッドシート/API から受け取った行を新規のみ DB にインサートする共通ロジック
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { rowToCandidateForSync, normalizePhone, type SpreadsheetRow } from './csv-parser'

type CandidateInsert = Database['public']['Tables']['candidates']['Insert']

/** 1リクエストあたりの最大処理行数（連絡先一覧CSV 2000行超を想定） */
const MAX_ROWS = 3000

/**
 * 氏名比較用の正規化（スペースのみ除去）
 * シート「東浦 美結」とDB「東浦美結」→ 同一。
 */
function normalizeNameForCompare(name: string): string {
  if (!name || typeof name !== 'string') return ''
  const s = name.trim()
  return s.replace(/[\s\u3000]/g, '').trim()
}

/** 氏名に「(再登録)」「（再登録）」が含まれるか */
function hasReRegisterSuffix(name: string): boolean {
  return /[（(]再登録[）)]/.test((name ?? '').trim())
}

/** 既存IDの最大+1の新IDを発行（数値でないIDは無視） */
function getNextAvailableId(existingIds: Set<string>): string {
  const nums = Array.from(existingIds)
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 20200001
  return String(next)
}


export interface SyncResult {
  inserted: number
  skipped: number
  /** 登録日が空だった既存求職者に登録日を補完した件数 */
  backfilled: number
  /** 連絡先・年齢などをシートの値で更新した件数 */
  updated: number
  errors: { row: number; id?: string; message: string }[]
  /** 氏名不一致でシートの名前に合わせて修正した人（エラーではない） */
  nameCorrectedLog: { row: number; id: string; previousName: string; name: string }[]
  /** 追加した人: { id, name } */
  insertedLog: { id: string; name: string }[]
  /** 重複でスキップした人: { id, name } */
  skippedLog: { id: string; name: string }[]
  /** 登録日を補完した人: { id, name } */
  backfilledLog: { id: string; name: string }[]
  /** 連絡先・年齢などを更新した人: { id, name } */
  updatedLog: { id: string; name: string }[]
  /** シートで更新したが、既にメモ・ステータス変更等の履歴がある求職者（要確認用） */
  updatedButHasActivityLog: { id: string; name: string }[]
  /** 既存IDと被ったため新IDを発行して追加した人（スプシ編集不要） */
  insertedWithNewIdLog: { row: number; sheetId: string; newId: string; name: string }[]
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
    updated: 0,
    errors: [],
    nameCorrectedLog: [],
    insertedLog: [],
    skippedLog: [],
    backfilledLog: [],
    updatedLog: [],
    updatedButHasActivityLog: [],
    insertedWithNewIdLog: [],
  }

  if (rows.length === 0) return result

  const rowsToProcess = rows.slice(0, MAX_ROWS)
  if (rows.length > MAX_ROWS) {
    result.errors.push({ row: MAX_ROWS + 1, message: `上限${MAX_ROWS}行のため、${rows.length - MAX_ROWS}行は未処理` })
  }

  // Supabase はデフォルトで最大1000件しか返さないため、全件取得するまでページングする
  interface ExistingCandidate {
    id: string; name: string | null; registered_at: string | null; phone: string | null
    email: string | null; age: number | null; birth_date: string | null
    prefecture: string | null; address: string | null; qualification: string | null
    desired_employment_type: string | null; desired_job_type: string | null; memo: string | null
  }
  const PAGE_SIZE = 1000
  const existingList: ExistingCandidate[] = []
  let offset = 0
  while (true) {
    const { data: page } = await supabase
      .from('candidates')
      .select('id, name, registered_at, phone, email, age, birth_date, prefecture, address, qualification, desired_employment_type, desired_job_type, memo')
      .range(offset, offset + PAGE_SIZE - 1)
    const pageRows = (page ?? []) as ExistingCandidate[]
    existingList.push(...pageRows)
    if (pageRows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  const existingIds = new Set(existingList.map((r) => r.id))
  const nameById = new Map<string, string>(existingList.map((r) => [r.id, (r.name ?? '').trim()]))
  const existingById = new Map<string, ExistingCandidate>(existingList.map((r) => [r.id, r]))

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

  // タイムライン・案件のいずれかがある求職者ID（更新後に updatedButHasActivityLog に載せて要確認として出す用）
  const candidateIdsWithActivity = new Set<string>()
  const activityTables = ['timeline_events', 'projects'] as const
  for (const table of activityTables) {
    const { data: rows } = await supabase.from(table).select('candidate_id')
    if (rows) {
      for (const r of rows as { candidate_id: string }[]) {
        if (r?.candidate_id) candidateIdsWithActivity.add(r.candidate_id)
      }
    }
  }

  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i]
    const id = (row['ID'] ?? '').toString().trim()
    if (!id || id === '125') continue

    const parsed = rowToCandidateForSync(row)
    if (!parsed || parsed.name === '') continue

    const name = parsed.name ?? ''
    const sheetName = (parsed.name ?? '').trim()
    if (existingIds.has(id)) {
      const dbName = (nameById.get(id) ?? '').trim()
      const dbNorm = normalizeNameForCompare(dbName)
      const sheetNorm = normalizeNameForCompare(sheetName)
      const isReRegister = hasReRegisterSuffix(sheetName)
      const isNameMismatch = dbNorm !== '' && sheetNorm !== '' && dbNorm !== sheetNorm

      // 再登録 or 氏名不一致：既存レコードは触らず、新IDを発行して新規登録（スプシ編集不要）
      // ただし、同名レコードが既に別IDで存在する場合はスキップ（同期の度に重複作成されるバグ防止）
      if (isReRegister || isNameMismatch) {
        const alreadyCreatedUnderDifferentId = existingList.some(e => {
          if (e.id === id) return false
          const eName = (e.name ?? '').trim()
          if (isReRegister) {
            return eName === sheetName
          }
          return normalizeNameForCompare(eName) === sheetNorm
        })
        if (alreadyCreatedUnderDifferentId) {
          result.skipped += 1
          result.skippedLog.push({ id, name: `${name}（既に別IDで登録済み・重複スキップ）` })
          continue
        }

        const newId = getNextAvailableId(existingIds)
        const normPhone = normalizePhone(parsed.phone ?? '')
        const consultantName = (row['担当者'] ?? '').toString().trim()
        const primaryConsultant = consultantName.split(/[・\s]/)[0]?.trim()
        const consultant_id = primaryConsultant ? nameToUserId.get(primaryConsultant) ?? null : null
        const sourceName = (row['媒体'] ?? '').toString().trim()
        const source_id = sourceName ? nameToSourceId.get(sourceName) ?? null : null
        const insertNew: CandidateInsert = {
          id: newId,
          name: parsed.name ?? '',
          kana: parsed.kana ?? null,
          phone: normPhone ?? parsed.phone ?? null,
          email: parsed.email ?? null,
          birth_date: parsed.birth_date ?? null,
          age: parsed.age ?? null,
          prefecture: parsed.prefecture ?? null,
          address: parsed.address ?? null,
          qualification: parsed.qualification ?? null,
          desired_employment_type: parsed.desired_employment_type ?? null,
          desired_job_type: parsed.desired_job_type ?? null,
          status: parsed.status ?? '初回連絡中',
          source_id,
          registered_at: parsed.registered_at ?? null,
          consultant_id,
          approach_priority: null,
          rank: null,
          memo: parsed.memo ?? null,
          drive_link: null,
        }
        const { error: insertError } = await supabase.from('candidates').insert(insertNew as never)
        if (insertError) {
          result.errors.push({ row: i + 1, id, message: `新ID発行で追加失敗: ${insertError.message}` })
          continue
        }
        result.inserted += 1
        result.insertedLog.push({ id: newId, name })
        result.insertedWithNewIdLog.push({ row: i + 1, sheetId: id, newId, name: sheetName })
        existingIds.add(newId)
        continue
      }

      const existing = existingById.get(id)
      const normPhone = normalizePhone(parsed.phone ?? '')
      // 既存者（氏名一致）: CRM に値が無い項目だけスプシから補完。CRM の既存値は絶対に上書きしない。
      const updates: Record<string, unknown> = {}
      if (parsed.registered_at && !existing?.registered_at) {
        updates.registered_at = parsed.registered_at
      }
      if (normPhone && !existing?.phone) updates.phone = normPhone
      if (parsed.email && !existing?.email) updates.email = parsed.email
      if (parsed.age != null && parsed.age > 0 && parsed.age < 120 && existing?.age == null) {
        updates.age = parsed.age
      }
      if (parsed.birth_date && !existing?.birth_date) updates.birth_date = parsed.birth_date
      if (parsed.prefecture && !existing?.prefecture) updates.prefecture = parsed.prefecture
      if (parsed.address && !existing?.address) updates.address = parsed.address
      if (parsed.qualification && !existing?.qualification) updates.qualification = parsed.qualification
      if (parsed.desired_employment_type && !existing?.desired_employment_type) updates.desired_employment_type = parsed.desired_employment_type
      if (parsed.desired_job_type && !existing?.desired_job_type) updates.desired_job_type = parsed.desired_job_type
      if (parsed.memo && !existing?.memo) updates.memo = parsed.memo

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('candidates')
          .update(updates as never)
          .eq('id', id)
        if (updateError) {
          result.errors.push({ row: i + 1, id, message: `更新失敗: ${updateError.message}` })
        } else {
          if (updates.registered_at) {
            result.backfilled += 1
            result.backfilledLog.push({ id, name })
          }
          const contactOrAgeUpdated = updates.phone ?? updates.email ?? updates.age ?? updates.birth_date ?? updates.prefecture ?? updates.address
          if (contactOrAgeUpdated) {
            result.updated += 1
            result.updatedLog.push({ id, name })
          }
          if (candidateIdsWithActivity.has(id)) {
            result.updatedButHasActivityLog.push({ id, name })
          }
        }
      } else {
        result.skipped += 1
        result.skippedLog.push({ id, name })
      }
      continue
    }

    // 重複判定は ID と氏名のみ。電話番号でのスキップは行わない。

    const normPhone = normalizePhone(parsed.phone ?? '')
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
      status: parsed.status ?? '初回連絡中',
      source_id,
      registered_at: parsed.registered_at ?? null,
      consultant_id,
      approach_priority: null,
      rank: null,
      memo: parsed.memo ?? null,
      drive_link: null,
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
  }

  return result
}
