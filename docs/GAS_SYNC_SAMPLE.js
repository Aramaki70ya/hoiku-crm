/**
 * hoiku-crm 求職者同期（Google Apps Script）
 * スプレッドシート「求職者管理 - 連絡先一覧」の行を取得し、API に POST する。
 * 1リクエストあたり最大200行。
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
  const maxRows = 200

  // 日付列のヘッダー名（いずれかがシートにあれば登録日として送る）
  const dateHeaderNames = ['日付', '登録日', '登録日時', '作成日']

  /** セル値を文字列に。Date の場合は YYYY-MM-DD に整形してAPIで確実に登録日として扱えるようにする */
  function cellValueToString(val) {
    if (val == null || val === '') return ''
    if (Object.prototype.toString.call(val) === '[object Date]') {
      const y = val.getFullYear()
      const m = ('0' + (val.getMonth() + 1)).slice(-2)
      const d = ('0' + val.getDate()).slice(-2)
      return y + '-' + m + '-' + d
    }
    return String(val).trim()
  }

  // 全データ行をオブジェクトに変換
  const allRows = []
  for (let i = 1; i < data.length; i++) {
    const values = data[i]
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cellValueToString(values[j])
    }
    // API が「日付」で受け取るので、登録日系の列があれば「日付」としても持たせる
    if (!row['日付'] && dateHeaderNames.some((h) => (row[h] || '').toString().trim() !== '')) {
      let firstDateVal = ''
      for (let k = 0; k < dateHeaderNames.length; k++) {
        if ((row[dateHeaderNames[k]] || '').toString().trim() !== '') {
          firstDateVal = (row[dateHeaderNames[k]] || '').toString().trim()
          break
        }
      }
      row['日付'] = firstDateVal
    }
    allRows.push(row)
  }

  // ID と氏名が両方ある行だけ有効とする（プルダウンだけの行・IDのみの行を除外）
  const validRows = allRows.filter((row) => {
    const id = row['ID'] || ''
    const name = row['氏名'] || ''
    return id !== '' && id !== '125' && name !== ''
  })

  // 有効な行のうち最新 maxRows 行
  const rows = validRows.slice(-maxRows)

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
      const backfilled = json.backfilled ? `、${json.backfilled}件の登録日を補完` : ''
      Logger.log(`成功: ${json.inserted}件追加${backfilled}、${json.skipped}件スキップ`)

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

      // 登録日を補完した人
      if (json.backfilledLog && json.backfilledLog.length > 0) {
        Logger.log('--- 登録日を補完した人 ---')
        json.backfilledLog.forEach(function (r) {
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
