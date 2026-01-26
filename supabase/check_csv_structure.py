#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSVファイルのカラム構造を確認するスクリプト
"""

import csv
from pathlib import Path

# ファイルパス
csv_file = Path(__file__).parent / "stg_member_monthly_2026_01.csv"
sql_file = Path(__file__).parent / "import_csv_data.sql"

print("=" * 70)
print("CSVカラム構造チェック")
print("=" * 70)
print()

# CSVのカラムを読み込み
print("📋 CSVファイルのカラム構造:")
print(f"   ファイル: {csv_file}")
print()

with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    csv_columns = next(reader)
    
    print(f"   カラム数: {len(csv_columns)}")
    print()
    for i, col in enumerate(csv_columns, 1):
        if col.strip():
            print(f"   {i:2d}. {col}")
        else:
            print(f"   {i:2d}. (空カラム)")

print()
print("=" * 70)

# SQLのテーブル定義を読み込み
print("📋 テーブル定義 (stg_member_monthly):")
print(f"   ファイル: {sql_file}")
print()

expected_columns = [
    "month_text",
    "member_name",
    "candidate_id",
    "assigned_date",
    "candidate_name",
    "lead_source",
    "category",
    "status",
    "expected_amount",
    "prob_current",
    "prob_next",
    "contract_amount",
    "interview_flag"
]

print(f"   カラム数: {len(expected_columns)}")
print()
for i, col in enumerate(expected_columns, 1):
    print(f"   {i:2d}. {col}")

print()
print("=" * 70)

# マッピング確認
print("📋 カラムマッピング:")
print()

# CSVのカラム名（空でないもののみ）
csv_cols_clean = [col for col in csv_columns if col.strip()]

mapping = {
    "年月": "month_text",
    "メンバー名": "member_name",
    "ID": "candidate_id",
    "割り振り日": "assigned_date",
    "求職者名": "candidate_name",
    "リード獲得先": "lead_source",
    "カテゴリ": "category",
    "ステータス": "status",
    "ヨミ金額": "expected_amount",
    "ヨミ確度(当月)": "prob_current",
    "ヨミ確度(翌月)": "prob_next",
    "成約金額": "contract_amount",
    "面接フラグ": "interview_flag"
}

print("   CSVカラム名 → テーブルカラム名")
print("   " + "-" * 50)
for csv_col, table_col in mapping.items():
    if csv_col in csv_cols_clean:
        print(f"   ✓ {csv_col:20s} → {table_col}")
    else:
        print(f"   ✗ {csv_col:20s} → {table_col} (見つかりません)")

print()
print("=" * 70)

# 検証
print("🔍 検証結果:")
print()

# 空カラムを除いたCSVカラム数
csv_cols_count = len(csv_cols_clean)
expected_count = len(expected_columns)

if csv_cols_count == expected_count:
    print(f"   ✅ カラム数が一致しています ({csv_cols_count}カラム)")
else:
    print(f"   ❌ カラム数が一致しません")
    print(f"      CSV: {csv_cols_count}カラム")
    print(f"      テーブル: {expected_count}カラム")

# マッピングの確認
all_matched = True
for csv_col in csv_cols_clean:
    if csv_col not in mapping:
        print(f"   ⚠️  未マッピングのカラム: {csv_col}")
        all_matched = False

if all_matched and csv_cols_count == expected_count:
    print(f"   ✅ すべてのカラムが正しくマッピングされています")
else:
    print(f"   ❌ マッピングに問題があります")

print()
print("=" * 70)
