/**
 * hoiku-crm 求職者同期（Google Apps Script）
 * スプレッドシート「求職者管理 - 連絡先一覧」の行を取得し、API に POST する。
 * 1リクエストあたり最大100行。
 */

function syncNewCandidates() {
  const props = PropertiesService.getScriptProperties()
  const apiUrl = props.getProperty('API_URL')   // 例: https://xxx.vercel.app/api/sync/candidates
  const apiKey = props.getProperty('SYNC_API_KEY')

  if (!apiUrl || !apiKey) {
    Logger.log('エラー: スクリプトプロパティに API_URL と SYNC_API_KEY を設定してください')
    return
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName('連絡先一覧')
  if (!sheet) {
    Logger.log('エラー: シート「連絡先一覧」が見つかりません')
    return
  }

  const data = sheet.getDataRange().getValues()
  if (data.length < 2) {
    Logger.log('データ行がありません')
    return
  }

  const headers = data[0].map((h) => String(h ?? '').trim())
  const rows = []
  const maxRows = 100

  for (let i = 1; i < data.length && rows.length < maxRows; i++) {
    const values = data[i]
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] != null ? String(values[j]).trim() : ''
    }
    rows.push(row)
  }

  const payload = JSON.stringify({ rows })
  Logger.log('送信行数: ' + rows.length)

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload,
    headers: { Authorization: 'Bearer ' + apiKey },
    muteHttpExceptions: true,
  }

  const response = UrlFetchApp.fetch(apiUrl, options)
  const code = response.getResponseCode()
  const body = response.getContentText()
  Logger.log('ステータス: ' + code)
  if (body) Logger.log('レスポンス: ' + (body.length > 500 ? body.substring(0, 500) + '...' : body))

  try {
    const json = JSON.parse(body)
    if (code >= 200 && code < 300) {
      Logger.log(`成功: ${json.inserted}件追加、${json.skipped}件スキップ`)

      // 追加した人
      if (json.insertedLog && json.insertedLog.length > 0) {
        Logger.log('--- 追加した人 ---')
        json.insertedLog.forEach(function (r) {
          Logger.log('  ' + r.id + ' ' + r.name)
        })
      }

      // 重複でスキップした人
      if (json.skippedLog && json.skippedLog.length > 0) {
        Logger.log('--- 重複でスキップした人 ---')
        json.skippedLog.forEach(function (r) {
          Logger.log('  ' + r.id + ' ' + r.name)
        })
      }

      if (json.errors && json.errors.length > 0) {
        Logger.log('--- エラー ---')
        json.errors.forEach(function (e) {
          Logger.log('  行' + e.row + ': ' + e.message)
        })
      }
    } else {
      Logger.log('API エラー: ' + (json.error || body))
    }
  } catch (e) {
    Logger.log('レスポンス解析エラー: ' + body)
  }
}
