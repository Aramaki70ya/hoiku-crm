/**
 * CSVパーサー
 * 既存のCSVファイルからデータを読み込み、システムの型に変換する
 */

import type { Candidate } from '@/types/database'
import type { StatusType } from '@/lib/status-mapping'

// CSVの1行を表す型（連絡先一覧.csv）
interface CsvRow {
  担当者: string
  媒体: string
  日付: string
  曜日: string
  時間: string
  電話予約: string
  ステータス: string
  ID: string
  氏名: string
  電話番号: string
  メールアドレス: string
  生年月日: string
  年齢: string
  都道府県: string
  市区町村: string
  '正・パ': string
  保有資格: string
  応募職種: string
  '応募・気になる求人': string
  備考: string
  フォロー中断理由: string
}

// ステータスのマッピング（スプレッドシート取り込み用にエクスポート）
export const spreadsheetStatusMap: Record<string, StatusType> = {
  '新規': '初回連絡中',
  '連絡中': '初回連絡中',
  '初回済み': '初回ヒアリング実施済',
  '提案中': '提案求人選定中',
  '面接中': '面接確定済',
  '内定': '内定獲得（承諾確認中）',
  '成約': '内定承諾（成約）',
  'NG': 'クローズ（終了）',
  '追客中': '追客中（中長期フォロー）',
  '意向回収': '音信不通',
  // 新体系のステータスがそのまま来る場合もマッピング
  '初回連絡中': '初回連絡中',
  '連絡つかず（初回未接触）': '連絡つかず（初回未接触）',
  '提案求人選定中': '提案求人選定中',
  '求人提案済（返信待ち）': '求人提案済（返信待ち）',
  '書類選考中': '書類選考中',
  '面接日程調整中': '面接日程調整中',
  '面接確定済': '面接確定済',
  '面接実施済（結果待ち）': '面接実施済（結果待ち）',
  '内定獲得（承諾確認中）': '内定獲得（承諾確認中）',
  '内定承諾（成約）': '内定承諾（成約）',
  '内定辞退': '内定辞退',
  '音信不通': '音信不通',
  '追客中（中長期フォロー）': '追客中（中長期フォロー）',
  'クローズ（終了）': 'クローズ（終了）',
  '見学提案~設定': '見学提案~設定',
  '再ヒアリング・条件変更あり': '再ヒアリング・条件変更あり',
  '初回ヒアリング実施済': '初回ヒアリング実施済',
}

/**
 * CSVテキストをパースしてオブジェクト配列に変換
 */
export function parseCSV(csvText: string): CsvRow[] {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []

  // ヘッダー行を取得
  const headers = parseCSVLine(lines[0])
  
  // データ行をパース
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    rows.push(row as unknown as CsvRow)
  }
  
  return rows
}

/**
 * CSV行をパース（カンマ区切り、引用符対応）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * CSVの行をCandidateオブジェクトに変換
 */
export function csvRowToCandidate(row: CsvRow): Partial<Candidate> | null {
  // IDがない行はスキップ
  if (!row.ID || row.ID === '' || row.ID === '125') return null
  
  // ステータスの変換
  const status = spreadsheetStatusMap[row.ステータス] || '初回連絡中'
  
  const birth_date = parseDateString(row.生年月日)
  // 年齢: 125・126 は「不明」のダミー値なので null。有効範囲は 1〜119
  const rawAge = row.年齢 && row.年齢 !== '125' && row.年齢 !== '126' ? parseInt(row.年齢, 10) : null
  const age = rawAge != null && !isNaN(rawAge) && rawAge > 0 && rawAge < 120 ? rawAge : null
  
  return {
    id: row.ID,
    name: row.氏名 || '',
    phone: normalizePhone(row.電話番号),
    email: row.メールアドレス || null,
    birth_date,
    age,
    prefecture: row.都道府県 || null,
    address: row.市区町村 || null,
    qualification: row.保有資格 || null,
    desired_employment_type: row['正・パ'] || null,
    desired_job_type: row.応募職種 || null,
    status,
    registered_at: parseDateString(row.日付),
    memo: [row.備考, row.フォロー中断理由].filter(Boolean).join('\n') || null,
  }
}

/**
 * 電話番号の正規化（スプレッドシート取り込み用にエクスポート）
 * 非数字を除去し、090/080/070/050 で頭の0が抜けている場合は補完する
 */
export function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned) return null
  // 10桁で先頭が 90/80/70/50 なら頭に0を補完（090-XXXX-XXXX 形式）
  if (cleaned.length === 10 && /^[9875]0/.test(cleaned)) {
    return '0' + cleaned
  }
  return cleaned
}

/**
 * 日付文字列をISO形式に変換（スプレッドシート取り込み用にエクスポート）
 * 対応形式: YYYY/M/D, YYYY-MM-DD, YYYY.M.D, YYYY年M月D日, JS Date.toString(),
 * Excel/Googleスプレッドシートのシリアル値（数値）
 */
export function parseDateString(dateStr: string | number | undefined): string | null {
  if (dateStr === undefined || dateStr === null) return null
  // Excel/Googleスプレッドシートのシリアル値（日付として有効な範囲）
  const n = Number(dateStr)
  if (!Number.isNaN(n) && n > 10000 && n < 1000000) {
    const d = new Date((n - 25569) * 86400 * 1000)
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  }
  const s = String(dateStr).trim()
  if (!s) return null
  // YYYY/M/D または YYYY-MM-DD または YYYY.M.D（先頭の日付部分のみ）
  const match =
    s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/) ||
    s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/) ||
    s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  // スプレッドシートの日付セルが Date で渡り "Mon Jan 15 2024 ..." のようになっている場合
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return null
}

/**
 * CSVテキストからCandidateリストを生成
 */
export function parseCandidatesFromCSV(csvText: string): Partial<Candidate>[] {
  const rows = parseCSV(csvText)
  return rows
    .map(csvRowToCandidate)
    .filter((c): c is Partial<Candidate> => c !== null && c.name !== '')
}

/** スプレッドシート/APIの1行（キーは列名） */
export type SpreadsheetRow = Record<string, string>

/**
 * スプレッドシート行（Record）を Partial<Candidate> に変換。consultant_id/source_id は呼び出し元で解決すること。
 */
export function rowToCandidateForSync(row: SpreadsheetRow): Partial<Candidate> | null {
  // 登録日: 列名が「日付」「登録日」「登録日時」「作成日」のいずれかで受け付ける
  const dateRaw = row['日付'] ?? row['登録日'] ?? row['登録日時'] ?? row['作成日'] ?? ''
  const dateValue = dateRaw != null ? String(dateRaw).trim() : ''
  const asCsvRow: CsvRow = {
    担当者: row['担当者'] ?? '',
    媒体: row['媒体'] ?? '',
    日付: dateValue,
    曜日: row['曜日'] ?? '',
    時間: row['時間'] ?? '',
    電話予約: row['電話予約'] ?? '',
    ステータス: row['ステータス'] ?? '',
    ID: row['ID'] ?? '',
    氏名: row['氏名'] ?? '',
    電話番号: row['電話番号'] ?? '',
    メールアドレス: row['メールアドレス'] ?? '',
    生年月日: row['生年月日'] ?? '',
    年齢: row['年齢'] ?? '',
    都道府県: row['都道府県'] ?? '',
    市区町村: row['市区町村'] ?? '',
    '正・パ': row['正・パ'] ?? '',
    保有資格: row['保有資格'] ?? '',
    応募職種: row['応募職種'] ?? '',
    '応募・気になる求人': row['応募・気になる求人'] ?? '',
    備考: row['備考'] ?? '',
    フォロー中断理由: row['フォロー中断理由'] ?? '',
  }
  return csvRowToCandidate(asCsvRow)
}