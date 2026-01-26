#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSVファイルからINSERT文を生成するスクリプト
SupabaseのGUIインポートが使えない場合の代替手段
"""

import csv
from pathlib import Path

# ファイルパス
csv_file = Path(__file__).parent / "stg_member_monthly_2026_01_fixed.csv"
output_file = Path(__file__).parent / "insert_january_data.sql"

def escape_sql_string(value):
    """SQL文字列をエスケープ"""
    if value is None or value == '':
        return 'NULL'
    # シングルクォートをエスケープ
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"

def generate_insert_sql():
    """CSVファイルからINSERT文を生成"""
    
    if not csv_file.exists():
        print(f"❌ エラー: 入力ファイルが見つかりません")
        print(f"   パス: {csv_file}")
        return False
    
    print(f"📖 入力ファイル: {csv_file}")
    print(f"📝 出力ファイル: {output_file}")
    print()
    
    # SQLファイルのヘッダー
    sql_content = """-- ========================================
-- 1月分（2026_01）のデータをINSERT文でインポート
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================

-- 既存の1月分データを削除（既に存在する場合）
DELETE FROM stg_member_monthly WHERE month_text = '2026_01';

-- 1月分のデータを挿入
INSERT INTO stg_member_monthly (
  month_text, member_name, candidate_id, assigned_date, candidate_name,
  lead_source, category, status, expected_amount, prob_current,
  prob_next, contract_amount, interview_flag
) VALUES
"""
    
    try:
        with open(csv_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            
            # ヘッダー行をスキップ
            header = next(reader)
            print(f"📋 ヘッダー: {len(header)}カラム")
            print()
            
            # データ行を処理
            rows = []
            row_count = 0
            
            for row in reader:
                row_count += 1
                
                # カラム数を13に揃える（足りない場合は空文字で埋める）
                while len(row) < 13:
                    row.append('')
                
                # 最初の13カラムのみを使用
                values = row[:13]
                
                # SQLのVALUES句を生成
                values_str = ', '.join([
                    escape_sql_string(val) if val.strip() else 'NULL'
                    for val in values
                ])
                
                rows.append(f"  ({values_str})")
                
                # 進捗表示（50行ごと）
                if row_count % 50 == 0:
                    print(f"  処理中... {row_count}行目")
            
            # 最後の行以外はカンマを付ける
            sql_content += ',\n'.join(rows)
            sql_content += ';\n\n'
            
            # 確認クエリを追加
            sql_content += """-- 確認: 挿入されたデータを確認
SELECT 
  month_text,
  COUNT(*) as count
FROM stg_member_monthly
WHERE month_text = '2026_01'
GROUP BY month_text;
"""
        
        print(f"✅ 処理完了")
        print(f"   データ行数: {row_count}行")
        print()
        
        # SQLファイルを書き出し
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        print(f"✅ INSERT文を生成しました")
        print(f"   ファイル: {output_file}")
        print(f"   行数: {row_count}行")
        print()
        print(f"📤 このSQLファイルをSupabaseのSQL Editorで実行してください")
        
        return True
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("INSERT文生成スクリプト")
    print("=" * 60)
    print()
    
    success = generate_insert_sql()
    
    if success:
        print("=" * 60)
        print("✅ 完了")
        print("=" * 60)
    else:
        print("=" * 60)
        print("❌ 失敗")
        print("=" * 60)
        exit(1)
