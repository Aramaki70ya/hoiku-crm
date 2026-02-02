/**
 * Google Sheets API でスプレッドシートの値を取得し、SpreadsheetRow[] に変換する
 */

import { google } from 'googleapis'
import type { SpreadsheetRow } from './csv-parser'

function getSheetsClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!keyJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY が設定されていません')
  }
  let credentials: { client_email?: string; private_key?: string }
  try {
    credentials = JSON.parse(keyJson) as { client_email?: string; private_key?: string }
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY は有効なJSONではありません')
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY に client_email と private_key が必要です')
  }
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

/**
 * スプレッドシートの指定範囲を取得し、1行目をヘッダーとして SpreadsheetRow[] に変換する
 */
export async function fetchSheetAsRows(): Promise<SpreadsheetRow[]> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
  const range = process.env.GOOGLE_SHEET_RANGE || process.env.GOOGLE_SHEET_NAME || '連絡先一覧'

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID が設定されていません')
  }

  const sheets = getSheetsClient()
  const rangeStr = range.includes('!') ? range : `'${range}'!A:Z`
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rangeStr,
  })

  const rows = res.data.values as string[][] | undefined
  if (!rows || rows.length < 2) return []

  const headers = rows[0].map((h) => String(h ?? '').trim())
  const result: SpreadsheetRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const row: SpreadsheetRow = {}
    headers.forEach((header, j) => {
      if (header) row[header] = values[j] != null ? String(values[j]).trim() : ''
    })
    result.push(row)
  }
  return result
}
