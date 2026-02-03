/**
 * hoiku-crm 求職者同期（Google Apps Script）
 *
 * 【使い方】
 * 1. スプレッドシートで 拡張機能 → Apps Script を開く
 * 2. このコードをそのまま貼り付けて保存
 * 3. プロジェクトの設定 → スクリプト プロパティ で追加:
 *    - API_URL: https://あなたのアプリ.vercel.app/api/sync/candidates
 *    - SYNC_API_KEY: （Vercel の SYNC_API_KEY と同じ値）
 * 4. syncNewCandidates を選択して実行
 * 5. 表示 → ログ で結果を確認
 *
 * シート名「連絡先一覧」が必要。1リクエストあたり最大100行。
 */

/**
 * 設定チェック用（デバッグ）
 * スクリプトプロパティの設定状況を確認する
 */
function checkSettings() {
  const props = PropertiesService.getScriptProperties()
  const apiUrl = props.getProperty('API_URL')
  const apiKey = props.getProperty('SYNC_API_KEY')

  Logger.log('=== 設定チェック ===')
  Logger.log('API_URL: ' + (apiUrl ? apiUrl : '❌ 未設定'))
  Logger.log('SYNC_API_KEY: ' + (apiKey ? '設定済み（' + apiKey.length + '文字）' : '❌ 未設定'))
  if (apiKey) {
    Logger.log('  最初の10文字: ' + apiKey.substring(0, 10) + '...')
    Logger.log('  最後の5文字: ...' + apiKey.substring(apiKey.length - 5))
  }
  Logger.log('====================')

  // 簡易接続テスト
  if (apiUrl) {
    try {
      const testOptions = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ rows: [] }),
        headers: { Authorization: 'Bearer ' + (apiKey || '') },
        muteHttpExceptions: true
      }
      const res = UrlFetchApp.fetch(apiUrl, testOptions)
      Logger.log('接続テスト ステータス: ' + res.getResponseCode())
      Logger.log('接続テスト レスポンス: ' + res.getContentText())
    } catch (e) {
      Logger.log('接続テスト エラー: ' + e.message)
    }
  }
}

function syncNewCandidates() {
  const props = PropertiesService.getScriptProperties()
  const apiUrl = props.getProperty('API_URL')
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

  const headers = data[0].map(function (h) { return String(h != null ? h : '').trim() })
  const maxRows = 100

  // 日付列のヘッダー名（いずれかがシートにあれば登録日として送る）
  const dateHeaderNames = ['日付', '登録日', '登録日時', '作成日']

  /** セル値を文字列に。日付列のみ Date/数値(シリアル) を YYYY-MM-DD に変換（ID列などは数値のまま文字列で送る） */
  function cellValueToString(val, header) {
    if (val == null || val === '') return ''
    var isDateColumn = dateHeaderNames.indexOf(header) !== -1
    if (isDateColumn && Object.prototype.toString.call(val) === '[object Date]') {
      var y = val.getFullYear()
      var m = ('0' + (val.getMonth() + 1)).slice(-2)
      var d = ('0' + val.getDate()).slice(-2)
      return y + '-' + m + '-' + d
    }
    if (isDateColumn && typeof val === 'number' && val > 30000) {
      var d2 = new Date((val - 25569) * 86400 * 1000)
      if (!isNaN(d2.getTime())) {
        var y2 = d2.getFullYear()
        var m2 = ('0' + (d2.getMonth() + 1)).slice(-2)
        var d3 = ('0' + d2.getDate()).slice(-2)
        return y2 + '-' + m2 + '-' + d3
      }
    }
    return String(val).trim()
  }

  // 全データ行をオブジェクトに変換
  const allRows = []
  for (let i = 1; i < data.length; i++) {
    const values = data[i]
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      var header = headers[j]
      row[header] = cellValueToString(values[j], header)
    }
    // API が「日付」で受け取るので、登録日系の列があれば「日付」としても持たせる
    if (!row['日付'] && dateHeaderNames.some(function (h) { return (row[h] || '').toString().trim() !== '' })) {
      var firstDateVal = ''
      for (var k = 0; k < dateHeaderNames.length; k++) {
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
  const validRows = allRows.filter(function (row) {
    const id = row['ID'] || ''
    const name = row['氏名'] || ''
    return id !== '' && id !== '125' && name !== ''
  })

  // 有効な行のうち最新 maxRows 行
  const rows = validRows.slice(-maxRows)

  const payload = JSON.stringify({ rows: rows })
  Logger.log('送信行数: ' + rows.length)

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    headers: { Authorization: 'Bearer ' + apiKey },
    muteHttpExceptions: true
  }

  const response = UrlFetchApp.fetch(apiUrl, options)
  const code = response.getResponseCode()
  const body = response.getContentText()
  Logger.log('ステータス: ' + code)
  if (body) {
    Logger.log('レスポンス: ' + (body.length > 500 ? body.substring(0, 500) + '...' : body))
  }

  try {
    const json = JSON.parse(body)
    if (code >= 200 && code < 300) {
      Logger.log('成功: ' + (json.message || (json.inserted + '件追加、' + json.skipped + '件スキップ')))

      if (json.insertedLog && json.insertedLog.length > 0) {
        Logger.log('--- 追加した人 ---')
        json.insertedLog.forEach(function (r) {
          Logger.log('  ' + r.id + ' ' + r.name)
        })
      }

      if (json.backfilledLog && json.backfilledLog.length > 0) {
        Logger.log('--- 登録日を補完した人 ---')
        json.backfilledLog.forEach(function (r) {
          Logger.log('  ' + r.id + ' ' + r.name)
        })
      }

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
