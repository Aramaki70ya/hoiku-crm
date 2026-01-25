#!/usr/bin/env python3
"""
CSVをSupabaseのテーブル構造に変換するスクリプト
"""
import csv
import sys

# 入力ファイル
input_file = '/Users/a2025-057/Desktop/ishii/12_SaaS開発ドキュメント/【保育】数値管理シート_最新版 - 全メンバーマージシート.csv'
output_file = '/Users/a2025-057/Desktop/ishii/12_SaaS開発ドキュメント/hoiku-crm/supabase/stg_member_monthly.csv'

# 新しいヘッダー（テーブル定義に合わせる）
new_headers = [
    'month_text',
    'member_name',
    'candidate_id',
    'assigned_date',
    'candidate_name',
    'lead_source',
    'category',
    'status',
    'expected_amount',
    'prob_current',
    'prob_next',
    'contract_amount',
    'interview_flag'
]

with open(input_file, 'r', encoding='utf-8') as infile, \
     open(output_file, 'w', encoding='utf-8', newline='') as outfile:
    
    reader = csv.reader(infile)
    writer = csv.writer(outfile)
    
    # ヘッダー行をスキップ
    next(reader)
    
    # 新しいヘッダーを書き込み
    writer.writerow(new_headers)
    
    # データ行を書き込み
    row_count = 0
    for row in reader:
        # 最初の13列のみ取得（余分な空列を除外）
        if len(row) >= 13:
            new_row = row[:13]
            
            # 金額のカンマを削除
            # expected_amount (index 8)
            if new_row[8]:
                new_row[8] = new_row[8].replace(',', '').replace('"', '')
            # contract_amount (index 11)
            if new_row[11]:
                new_row[11] = new_row[11].replace(',', '').replace('"', '')
            
            writer.writerow(new_row)
            row_count += 1

print(f'変換完了: {row_count} 行を出力しました')
print(f'出力ファイル: {output_file}')
