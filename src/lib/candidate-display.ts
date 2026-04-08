/**
 * 求職者の表示用（再登録バッジなど）。同期ロジックとは独立。
 */

/** 氏名に (再登録) / （再登録） が含まれるか */
export function isReRegisterName(name: string | null | undefined): boolean {
  return /[（(]再登録[）)]/.test((name ?? '').trim())
}

/** YYYY-MM-DD または ISO を YYYY/MM/DD 表示に */
export function formatDateJp(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}/${m[2]}/${m[3]}`
  return iso
}
