#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSVファイルから空カラムを削除して、テーブル構造に合わせるスクリプト
"""

import csv
from pathlib import Path

# ファイルパス
input_file = Path(__file__).parent / "stg_member_monthly_2026_01.csv"
output_file = Path(__file__).parent / "stg_member_monthly_2026_01_fixed.csv"

def fix_csv_columns():
    """CSVファイルから空カラムを削除"""
    
    if not input_file.exists():
        print(f"❌ エラー: 入力ファイルが見つかりません")
        print(f"   パス: {input_file}")
        return False
    
    print(f"📖 入力ファイル: {input_file}")
    print(f"📝 出力ファイル: {output_file}")
    print()
    
    # CSVファイルを読み込み、空カラムを削除
    fixed_rows = []
    total_rows = 0
    
    try:
        with open(input_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            
            # ヘッダー行を取得
            header = next(reader)
            total_rows += 1
            
            # 空でないカラムのインデックスを特定
            non_empty_indices = []
            for i, col in enumerate(header):
                if col.strip():  # 空でないカラム
                    non_empty_indices.append(i)
            
            print(f"📋 元のカラム数: {len(header)}")
            print(f"📋 有効なカラム数: {len(non_empty_indices)}")
            print()
            
            # ヘッダーを修正（空カラムを除く）
            fixed_header = [header[i] for i in non_empty_indices]
            fixed_rows.append(fixed_header)
            
            print(f"📋 修正後のヘッダー:")
            for i, col in enumerate(fixed_header, 1):
                print(f"   {i:2d}. {col}")
            print()
            
            # データ行を処理
            for row in reader:
                total_rows += 1
                # 空カラムを除いた行を作成
                fixed_row = [row[i] if i < len(row) else '' for i in non_empty_indices]
                fixed_rows.append(fixed_row)
                
                # 進捗表示（100行ごと）
                if total_rows % 100 == 0:
                    print(f"  処理中... {total_rows}行目")
        
        print(f"✅ 処理完了")
        print(f"   総行数: {total_rows}行")
        print()
        
        # 修正したCSVファイルを書き出し
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(fixed_rows)
        
        print(f"✅ 修正したCSVファイルを作成しました")
        print(f"   ファイル: {output_file}")
        print(f"   カラム数: {len(fixed_header)}カラム")
        print(f"   データ行数: {len(fixed_rows) - 1}行")
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
    print("CSVカラム修正スクリプト（空カラム削除）")
    print("=" * 60)
    print()
    
    success = fix_csv_columns()
    
    if success:
        print("=" * 60)
        print("✅ 完了")
        print("=" * 60)
    else:
        print("=" * 60)
        print("❌ 失敗")
        print("=" * 60)
        exit(1)
