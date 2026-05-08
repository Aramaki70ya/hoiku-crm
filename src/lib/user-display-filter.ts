import type { User } from '@/types/database'

/**
 * メインCRMの担当者リスト・フィルタから除外する名前（前後空白除去後に照合）
 */
export const CRM_HIDDEN_DISPLAY_NAMES = new Set([
  '笹嶋',
  '笹島',
  '後藤',
  '小畦',
  '西田',
])

export function normalizeUserDisplayName(name: string): string {
  return name.replace(/\s+/g, '')
}

export function isHiddenFromCrmConsultantLists(name: string): boolean {
  return CRM_HIDDEN_DISPLAY_NAMES.has(normalizeUserDisplayName(name))
}

export function isUserActiveForCrm(user: User): boolean {
  if (!user.retired_at) return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const retiredAt = new Date(user.retired_at)
  retiredAt.setHours(0, 0, 0, 0)
  return retiredAt >= today
}

/** 一覧・ダッシュボード・担当フィルタなどで使うユーザー一覧用（/admin は API 全件のまま） */
export function filterUsersShownInMainCrm(users: User[]): User[] {
  return users
    .filter(isUserActiveForCrm)
    .filter((u) => !isHiddenFromCrmConsultantLists(u.name))
}

/**
 * 求職者詳細など、DB上の consultant_id は残っているが担当者をCRM一覧から隠している場合に、
 * 当該担当者だけは表示・整合のため一覧へ含める（API は全件のまま受け取る想定）
 */
export function filterUsersShownInMainCrmForCandidateDetail(
  users: User[],
  consultantId: string | null | undefined
): User[] {
  const base = filterUsersShownInMainCrm(users)
  if (!consultantId) return base
  if (base.some((u) => u.id === consultantId)) return base
  const assigned = users.find((u) => u.id === consultantId)
  return assigned ? [...base, assigned] : base
}
