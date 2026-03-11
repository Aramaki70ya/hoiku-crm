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
 * 【毎日自動反映】左メニュー「トリガー」→ トリガーを追加 → 関数 syncNewCandidates、
 *    イベント「時間駆動型」・希望の間隔（例: 日タイマー 9時）で保存。反映が止まったら
 *    トリガーが有効か・実行ログでエラーが出ていないかを確認（docs/求職者スプレッドシート反映が止まったときの調査手順.md）
 *
 * 【補完用】backfillRegisteredAt を実行すると、DB の registered_at が null の人を
 * シートの日付で一括補完する（全行を200行ずつ送信）
 *
 * 【連絡先・年齢の一括更新】syncAllContactUpdate を実行すると、既存登録者の
 * 電話・メール・年齢などをシートの値で一括更新する（全行を200行ずつ送信）。
 * 連絡先が空欄が多いときに1回実行するとよい。
 *
 * シート名「連絡先一覧」が必要。1リクエストあたり最大200行。
 */

/**
 * 同一氏名の重複をマージするAPIを呼ぶ（スプシを正・履歴は集約）。
 * IDずれで新ID追加が発生したときだけ呼ぶ想定。opts.recentDays で直近N日のみ対象にできる。
 */
function callMergeDuplicatesApi(apiUrl, apiKey, opts) {
  try {
    var mergeUrl = apiUrl.replace(/\/[^/]*$/, '/merge-duplicates')
    if (opts && opts.recentDays) {
      mergeUrl += (mergeUrl.indexOf('?') >= 0 ? '&' : '?') + 'recent_days=' + opts.recentDays
    }
    var mergeRes = UrlFetchApp.fetch(mergeUrl, {
      method: 'post',
      headers: { Authorization: 'Bearer ' + apiKey },
      muteHttpExceptions: true
    })
    var mergeCode = mergeRes.getResponseCode()
    var mergeBody = mergeRes.getContentText()
    if (mergeCode >= 200 && mergeCode < 300) {
      var mergeJson = JSON.parse(mergeBody)
      if (mergeJson.mergedGroups > 0) {
        Logger.log('--- 重複マージ（スプシを正に統一） ---')
        Logger.log('  マージグループ: ' + mergeJson.mergedGroups + '件、解消した重複: ' + mergeJson.mergedCount + '件')
        if (mergeJson.details && mergeJson.details.length > 0) {
          mergeJson.details.forEach(function (d) {
            Logger.log('  【' + d.name + '】残すID: ' + d.keptId + ' ← 統合: ' + d.mergeIds.join(', '))
          })
        }
        if (mergeJson.errors && mergeJson.errors.length > 0) {
          mergeJson.errors.forEach(function (err) { Logger.log('  マージ警告: ' + err) })
        }
      }
    } else {
      Logger.log('マージAPI エラー: ' + mergeCode + ' ' + mergeBody)
    }
  } catch (mergeErr) {
    Logger.log('マージAPI 呼び出しエラー: ' + mergeErr.message)
  }
}

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
  const maxRows = 200

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
    // 「求職者氏名」列があれば「氏名」としても持たせる（API互換）
    if (!row['氏名'] && row['求職者氏名']) row['氏名'] = row['求職者氏名']
    allRows.push(row)
  }

  // 氏名がある行を有効とする（ID が空でも新規として API が ID を発行する）
  // ID が「125」の行は除外。氏名列のヘッダーが「氏名」のほか「\」になっている場合がある（スプシの誤入力対策）
  const validRows = allRows.filter(function (row) {
    const id = String(row['ID'] != null ? row['ID'] : '').trim()
    const name = (row['氏名'] || row['\\'] || '').trim()
    return name !== '' && id !== '125'
  })

  // 有効な行のうち最新 maxRows 行
  var rows = validRows.slice(-maxRows)
  // API が「氏名」で受け取るので、「\」列の値があれば「氏名」に正規化
  rows = rows.map(function (row) {
    if (!(row['氏名'] || '').trim() && (row['\\'] || '').trim()) {
      row['氏名'] = (row['\\'] || '').trim()
    }
    return row
  })

  // ── 送信前の重複 ID チェック（警告のみ、ブロックはしない）──
  const sendingIdMap = {}
  rows.forEach(function (row, idx) {
    const id = (row['ID'] || '').toString().trim()
    if (!id) return
    if (!sendingIdMap[id]) sendingIdMap[id] = []
    sendingIdMap[id].push('行' + (idx + 1) + '（' + (row['氏名'] || '') + '）')
  })
  let hasSendingDup = false
  for (const id in sendingIdMap) {
    if (sendingIdMap[id].length > 1) {
      if (!hasSendingDup) Logger.log('⚠️ 送信データ内に重複 ID が見つかりました。シートを確認してください:')
      Logger.log('  ID ' + id + ': ' + sendingIdMap[id].join(', '))
      hasSendingDup = true
    }
  }
  if (!hasSendingDup) Logger.log('✅ 送信データ内に重複 ID なし')

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
      if (json.insertedWithNewIdLog && json.insertedWithNewIdLog.length > 0) {
        Logger.log('--- 既存IDと被ったため新IDで追加した人（スプシ編集不要） ---')
        json.insertedWithNewIdLog.forEach(function (e) {
          Logger.log('  行' + e.row + ': シートID ' + e.sheetId + ' → 新ID ' + e.newId + ' ' + e.name)
        })
      }

      if (json.backfilledLog && json.backfilledLog.length > 0) {
        Logger.log('--- 登録日を補完した人 ---')
        json.backfilledLog.forEach(function (r) {
          Logger.log('  ' + r.id + ' ' + r.name)
        })
      }

      if (json.updatedLog && json.updatedLog.length > 0) {
        Logger.log('--- 連絡先・年齢などを更新した人 ---')
        json.updatedLog.forEach(function (r) {
          Logger.log('  ' + r.id + ' ' + r.name)
        })
      }

      if (json.skippedLog && json.skippedLog.length > 0) {
        Logger.log('--- 重複でスキップした人 ---')
        json.skippedLog.forEach(function (r) {
          Logger.log('  ' + r.id + ' ' + r.name)
        })
      }

      if (json.nameCorrectedLog && json.nameCorrectedLog.length > 0) {
        Logger.log('--- 名前をシートに合わせて修正した人 ---')
        json.nameCorrectedLog.forEach(function (e) {
          Logger.log('  行' + e.row + ': ' + e.id + ' 「' + e.previousName + '」→「' + e.name + '」')
        })
      }

      if (json.updatedButHasActivityLog && json.updatedButHasActivityLog.length > 0) {
        Logger.log('--- シートで更新したが、既にメモ・ステータス変更等の履歴がある求職者（要確認） ---')
        json.updatedButHasActivityLog.forEach(function (r) {
          Logger.log('  ' + r.id + ' ' + r.name)
        })
      }

      if (json.errors && json.errors.length > 0) {
        Logger.log('--- エラー ---')
        json.errors.forEach(function (e) {
          Logger.log('  行' + e.row + ': ' + e.message)
        })
      }

      // IDずれで新ID追加があったときだけ、直近30日分の同名をマージして重複解消
      if (json.insertedWithNewIdLog && json.insertedWithNewIdLog.length > 0) {
        callMergeDuplicatesApi(apiUrl, apiKey, { recentDays: 30 })
      }
    } else {
      Logger.log('API エラー: ' + (json.error || body))
    }
  } catch (e) {
    Logger.log('レスポンス解析エラー: ' + body)
  }
}

/**
 * registered_at が null の既存求職者を一括補完する
 * シート全行を200行ずつ API に送り、DB の registered_at が空なら日付を補完する
 * ※ syncNewCandidates とは別。補完目的の一度きり実行用
 */
function backfillRegisteredAt() {
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
  const dateHeaderNames = ['日付', '登録日', '登録日時', '作成日']

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

  const allRows = []
  for (let i = 1; i < data.length; i++) {
    const values = data[i]
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      var header = headers[j]
      row[header] = cellValueToString(values[j], header)
    }
    if (!row['日付'] && dateHeaderNames.some(function (h) { return (row[h] || '').toString().trim() !== '' })) {
      for (var k = 0; k < dateHeaderNames.length; k++) {
        if ((row[dateHeaderNames[k]] || '').toString().trim() !== '') {
          row['日付'] = (row[dateHeaderNames[k]] || '').toString().trim()
          break
        }
      }
    }
    if (!row['氏名'] && row['求職者氏名']) row['氏名'] = row['求職者氏名']
    allRows.push(row)
  }

  const validRows = allRows.filter(function (row) {
    const id = row['ID'] || ''
    const name = (row['氏名'] || row['\\'] || '').trim()
    return id !== '' && id !== '125' && name !== ''
  })

  const BATCH = 200
  let totalBackfilled = 0
  let totalSkipped = 0

  for (let offset = 0; offset < validRows.length; offset += BATCH) {
    var chunk = validRows.slice(offset, offset + BATCH)
    // 氏名列が「\」の場合、API用に「氏名」へ正規化
    chunk = chunk.map(function (row) {
      if (!(row['氏名'] || '').trim() && (row['\\'] || '').trim()) {
        row['氏名'] = (row['\\'] || '').trim()
      }
      return row
    })
    const payload = JSON.stringify({ rows: chunk })
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

    try {
      const json = JSON.parse(body)
      if (code >= 200 && code < 300) {
        totalBackfilled += (json.backfilled || 0)
        totalSkipped += (json.skipped || 0)
        Logger.log('バッチ ' + (Math.floor(offset / BATCH) + 1) + ': 補完=' + (json.backfilled || 0) + ', スキップ=' + (json.skipped || 0))
        if (json.backfilledLog && json.backfilledLog.length > 0) {
          json.backfilledLog.forEach(function (r) {
            Logger.log('  補完: ' + r.id + ' ' + r.name)
          })
        }
      } else {
        Logger.log('バッチ ' + (Math.floor(offset / BATCH) + 1) + ' エラー: ' + (json.error || body))
      }
    } catch (e) {
      Logger.log('バッチ ' + (Math.floor(offset / BATCH) + 1) + ' レスポンス解析エラー: ' + body)
    }

    if (offset + BATCH < validRows.length) {
      Utilities.sleep(500) // API 負荷軽減のため少し待機
    }
  }

  Logger.log('=== 完了 === 登録日補完: ' + totalBackfilled + '件, スキップ: ' + totalSkipped + '件')
}

/**
 * 連絡先・年齢の一括更新（全行を200行ずつ API に送り、既存者の電話・メール・年齢などをシートの値で更新する）
 * 通常の syncNewCandidates は「最新200行」だけなので、既存の全員を更新したいときにこの関数を実行する
 */
function syncAllContactUpdate() {
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
  const dateHeaderNames = ['日付', '登録日', '登録日時', '作成日']

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

  const allRows = []
  for (let i = 1; i < data.length; i++) {
    const values = data[i]
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      var header = headers[j]
      row[header] = cellValueToString(values[j], header)
    }
    if (!row['日付'] && dateHeaderNames.some(function (h) { return (row[h] || '').toString().trim() !== '' })) {
      for (var k = 0; k < dateHeaderNames.length; k++) {
        if ((row[dateHeaderNames[k]] || '').toString().trim() !== '') {
          row['日付'] = (row[dateHeaderNames[k]] || '').toString().trim()
          break
        }
      }
    }
    if (!row['氏名'] && row['求職者氏名']) row['氏名'] = row['求職者氏名']
    allRows.push(row)
  }

  const validRows = allRows.filter(function (row) {
    const id = row['ID'] || ''
    const name = (row['氏名'] || row['\\'] || '').trim()
    return id !== '' && id !== '125' && name !== ''
  })

  const BATCH = 200
  let totalUpdated = 0
  let totalInserted = 0
  let totalSkipped = 0
  var hadNewIdInsert = false

  Logger.log('連絡先・年齢の一括更新を開始（有効行: ' + validRows.length + '件、200行ずつ送信）')

  for (let offset = 0; offset < validRows.length; offset += BATCH) {
    var chunk = validRows.slice(offset, offset + BATCH)
    // 氏名列が「\」の場合、API用に「氏名」へ正規化
    chunk = chunk.map(function (row) {
      if (!(row['氏名'] || '').trim() && (row['\\'] || '').trim()) {
        row['氏名'] = (row['\\'] || '').trim()
      }
      return row
    })
    const payload = JSON.stringify({ rows: chunk })
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

    try {
      const json = JSON.parse(body)
      if (code >= 200 && code < 300) {
        totalUpdated += (json.updated || 0)
        totalInserted += (json.inserted || 0)
        totalSkipped += (json.skipped || 0)
        var batchNum = Math.floor(offset / BATCH) + 1
        Logger.log('バッチ ' + batchNum + ': 更新=' + (json.updated || 0) + ', 追加=' + (json.inserted || 0) + ', スキップ=' + (json.skipped || 0))
        if (json.updatedLog && json.updatedLog.length > 0) {
          json.updatedLog.forEach(function (r) {
            Logger.log('  更新: ' + r.id + ' ' + r.name)
          })
        }
        if (json.nameCorrectedLog && json.nameCorrectedLog.length > 0) {
          json.nameCorrectedLog.forEach(function (e) {
            Logger.log('  名前修正: 行' + e.row + ' ' + e.id + ' 「' + e.previousName + '」→「' + e.name + '」')
          })
        }
        if (json.updatedButHasActivityLog && json.updatedButHasActivityLog.length > 0) {
          json.updatedButHasActivityLog.forEach(function (r) {
            Logger.log('  要確認（履歴あり）: ' + r.id + ' ' + r.name)
          })
        }
        if (json.insertedWithNewIdLog && json.insertedWithNewIdLog.length > 0) {
          hadNewIdInsert = true
          json.insertedWithNewIdLog.forEach(function (e) {
            Logger.log('  新IDで追加: 行' + e.row + ' シートID ' + e.sheetId + ' → ' + e.newId + ' ' + e.name)
          })
        }
      } else {
        Logger.log('バッチ ' + (Math.floor(offset / BATCH) + 1) + ' エラー: ' + (json.error || body))
      }
    } catch (e) {
      Logger.log('バッチ ' + (Math.floor(offset / BATCH) + 1) + ' レスポンス解析エラー: ' + body)
    }

    if (offset + BATCH < validRows.length) {
      Utilities.sleep(500)
    }
  }

  Logger.log('=== 完了 === 連絡先・年齢など更新: ' + totalUpdated + '件, 新規追加: ' + totalInserted + '件, スキップ: ' + totalSkipped + '件')

  // IDずれで新ID追加があったときだけ、直近30日分の同名をマージして重複解消
  if (hadNewIdInsert) {
    callMergeDuplicatesApi(apiUrl, apiKey, { recentDays: 30 })
  }
}

// ================================================================
// ID 自動付与・バリデーション機能
// ================================================================

/**
 * ヘッダー配列から列名のインデックス（0始まり）を返す内部ユーティリティ
 */
function _getColIndex_(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === name) return i
  }
  return -1
}

/**
 * 氏名列のインデックスを返す（「氏名」または「求職者氏名」に対応）
 */
function _getNameColIndex_(headers) {
  var idx = _getColIndex_(headers, '氏名')
  if (idx >= 0) return idx
  return _getColIndex_(headers, '求職者氏名')
}

/**
 * 【手動実行】氏名があって ID が空の行に、連番 ID を自動付与する。
 * 新担当者への引き継ぎ時や、過去行の一括修正に使用する。
 * 実行後にシートを確認し、意図通りか確認してください。
 */
function autoAssignMissingIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName('連絡先一覧')
  if (!sheet) {
    Logger.log('エラー: シート「連絡先一覧」が見つかりません')
    return
  }

  var data = sheet.getDataRange().getValues()
  var headers = data[0].map(function (h) { return String(h || '').trim() })
  var idColIdx = _getColIndex_(headers, 'ID')
  var nameColIdx = _getNameColIndex_(headers)

  if (idColIdx < 0 || nameColIdx < 0) {
    Logger.log('エラー: ID 列または氏名列（氏名/求職者氏名）が見つかりません。ヘッダー: ' + headers.join(', '))
    return
  }

  // 現在シート内の最大 ID を算出
  var maxId = 20200000
  for (var i = 1; i < data.length; i++) {
    var idVal = String(data[i][idColIdx] || '').trim()
    var num = parseInt(idVal, 10)
    if (!isNaN(num) && num > maxId) maxId = num
  }

  var assigned = 0
  for (var i = 1; i < data.length; i++) {
    var idVal = String(data[i][idColIdx] || '').trim()
    var nameVal = String(data[i][nameColIdx] || '').trim()
    if (!idVal && nameVal) {
      maxId += 1
      sheet.getRange(i + 1, idColIdx + 1).setValue(maxId)
      Logger.log('ID 付与: 行' + (i + 1) + '  氏名=' + nameVal + '  → ID=' + maxId)
      assigned++
    }
  }

  Logger.log('=== 完了 === ' + assigned + ' 件の ID を付与しました（氏名が空の行はスキップ）')
}

/**
 * 【手動実行・同期前確認用】シート内に重複 ID がないか検査してログに出力する。
 * 重複がある場合は true を返す。
 */
function validateSheetDuplicateIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName('連絡先一覧')
  if (!sheet) {
    Logger.log('エラー: シート「連絡先一覧」が見つかりません')
    return false
  }

  var data = sheet.getDataRange().getValues()
  var headers = data[0].map(function (h) { return String(h || '').trim() })
  var idColIdx = _getColIndex_(headers, 'ID')
  var nameColIdx = _getNameColIndex_(headers)

  if (idColIdx < 0) {
    Logger.log('エラー: ID 列が見つかりません')
    return false
  }

  var idToRows = {}
  for (var i = 1; i < data.length; i++) {
    var idVal = String(data[i][idColIdx] || '').trim()
    if (!idVal) continue
    if (!idToRows[idVal]) idToRows[idVal] = []
    idToRows[idVal].push({
      row: i + 1,
      name: nameColIdx >= 0 ? String(data[i][nameColIdx] || '').trim() : ''
    })
  }

  var hasDuplicates = false
  var dupCount = 0
  for (var id in idToRows) {
    if (idToRows[id].length > 1) {
      hasDuplicates = true
      dupCount++
      var entries = idToRows[id].map(function (e) {
        return '行' + e.row + '（' + e.name + '）'
      }).join(', ')
      Logger.log('⚠️ 重複 ID ' + id + ': ' + entries)
    }
  }

  if (!hasDuplicates) {
    Logger.log('✅ シート内に重複 ID はありません')
  } else {
    Logger.log('⚠️ 重複 ID が ' + dupCount + ' 件見つかりました。syncNewCandidates の前に修正してください')
  }

  return hasDuplicates
}

/**
 * 【初期設定・一度だけ実行】自動 ID 付与のインストール型トリガーをセットアップする。
 * 実行後は onEditAutoAssignId が常時動作し、氏名入力時に ID が自動付与される。
 */
function setupAutoIdTrigger() {
  // 重複防止: 既存の同名トリガーを先に削除
  var triggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onEditAutoAssignId') {
      ScriptApp.deleteTrigger(triggers[i])
      Logger.log('既存トリガーを削除しました')
    }
  }

  ScriptApp.newTrigger('onEditAutoAssignId')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create()

  Logger.log('✅ 自動 ID 付与トリガーをセットアップしました')
  Logger.log('  → 「連絡先一覧」シートで氏名を入力した行の ID 列が空の場合、自動で連番 ID が付与されます')
}

/**
 * インストール型 onEdit トリガーのハンドラー（setupAutoIdTrigger で登録後に自動実行）。
 * 「連絡先一覧」シートの氏名列が入力され、かつ ID 列が空の行に次の連番 ID を付与する。
 * ※ このまま手動実行しても動作しません。setupAutoIdTrigger を使ってください。
 */
function onEditAutoAssignId(e) {
  try {
    if (!e || !e.range) return
    var sheet = e.range.getSheet()
    if (sheet.getName() !== '連絡先一覧') return

    var editedRow = e.range.getRow()
    if (editedRow <= 1) return // ヘッダー行はスキップ

    var data = sheet.getDataRange().getValues()
    var headers = data[0].map(function (h) { return String(h || '').trim() })
    var idColIdx = _getColIndex_(headers, 'ID')
    var nameColIdx = _getNameColIndex_(headers)

    if (idColIdx < 0 || nameColIdx < 0) return

    // 編集された行の ID と氏名を確認
    var idVal = String(sheet.getRange(editedRow, idColIdx + 1).getValue() || '').trim()
    var nameVal = String(sheet.getRange(editedRow, nameColIdx + 1).getValue() || '').trim()

    // ID がある、または氏名が空なら何もしない
    if (idVal || !nameVal) return

    // シート全体から現在の最大 ID を取得
    var maxId = 20200000
    for (var i = 1; i < data.length; i++) {
      var id = String(data[i][idColIdx] || '').trim()
      var num = parseInt(id, 10)
      if (!isNaN(num) && num > maxId) maxId = num
    }

    var newId = maxId + 1
    sheet.getRange(editedRow, idColIdx + 1).setValue(newId)
  } catch (err) {
    // ユーザー操作を妨げないようエラーはサイレントに処理
    Logger.log('onEditAutoAssignId エラー: ' + err.message)
  }
}
