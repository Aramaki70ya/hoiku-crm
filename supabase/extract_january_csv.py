#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1月分（2026_01）のデータのみを抽出してCSVファイルを作成するスクリプト
"""

import csv
import os
from pathlib import Path

# ファイルパス
input_file = Path(__file__).parent.parent.parent / "元データ" / "【保育】数値管理シート_最新版 のコピー - 全メンバーマージシート1月分.csv"
output_file = Path(__file__).parent / "stg_member_monthly_2026_01.csv"

def extract_january_data():
    """1月分（2026_01）のデータのみを抽出"""
    
    if not input_file.exists():
        print(f"❌ エラー: 入力ファイルが見つかりません")
        print(f"   パス: {input_file}")
        return False
    
    print(f"📖 入力ファイル: {input_file}")
    print(f"📝 出力ファイル: {output_file}")
    print()
    
    # CSVファイルを読み込み
    january_rows = []
    total_rows = 0
    january_count = 0
    
    try:
        with open(input_file, 'r', encoding='utf-8-sig') as f:
            # BOMを除去して読み込み
            reader = csv.reader(f)
            
            # ヘッダー行を取得
            header = next(reader)
            january_rows.append(header)
            total_rows += 1
            
            print(f"📋 ヘッダー: {header[0]} (全{len(header)}カラム)")
            print()
            
            # データ行を処理
            for row in reader:
                total_rows += 1
                
                # 1月分（2026_01）のデータのみを抽出
                if len(row) > 0 and row[0] == '2026_01':
                    january_rows.append(row)
                    january_count += 1
                
                # 進捗表示（1000行ごと）
                if total_rows % 1000 == 0:
                    print(f"  処理中... {total_rows}行目 (1月分: {january_count}件)")
        
        print(f"✅ 処理完了")
        print(f"   総行数: {total_rows}行")
        print(f"   1月分データ: {january_count}件")
        print()
        
        # 1月分のCSVファイルを書き出し
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(january_rows)
        
        print(f"✅ 1月分のCSVファイルを作成しました")
        print(f"   ファイル: {output_file}")
        print(f"   件数: {january_count}件")
        print()
        print(f"📤 このファイルをSupabaseにインポートしてください")
        
        return True
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("1月分（2026_01）データ抽出スクリプト")
    print("=" * 60)
    print()
    
    success = extract_january_data()
    
    if success:
        print("=" * 60)
        print("✅ 完了")
        print("=" * 60)
    else:
        print("=" * 60)
        print("❌ 失敗")
        print("=" * 60)
        exit(1)
