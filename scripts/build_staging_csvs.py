#!/usr/bin/env python3
"""
元データCSVからSupabase取り込み用のステージングCSVを生成するスクリプト。
出力先: hoiku-crm/supabase/
"""
from __future__ import annotations

import csv
import glob
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT_DIR / "元データ"
SUPABASE_DIR = ROOT_DIR / "hoiku-crm" / "supabase"


def normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip().replace("\u3000", " ")


def normalize_empty(value: str | None) -> str:
    value = normalize_text(value)
    if not value or value in {"#N/A", "N/A", "-", "なし"}:
        return ""
    return value


def normalize_date(value: str | None) -> str:
    value = normalize_empty(value)
    if not value:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return value
    match = re.match(r"^(\d{4})/(\d{1,2})/(\d{1,2})$", value)
    if match:
        year, month, day = match.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    return ""


def normalize_amount(value: str | None) -> str:
    value = normalize_empty(value)
    if not value:
        return ""
    cleaned = re.sub(r"[^\d]", "", value)
    return cleaned


def is_candidate_id(value: str | None) -> bool:
    value = normalize_text(value)
    return bool(re.match(r"^\d{8}$", value))


def write_csv(path: Path, headers: list[str], rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)


def build_stg_contacts() -> int:
    input_path = RAW_DIR / "求職者管理 - 連絡先一覧.csv"
    output_path = SUPABASE_DIR / "stg_contacts.csv"

    headers = [
        "consultant_name",
        "source_name",
        "registered_at",
        "status_text",
        "candidate_id",
        "candidate_name",
        "phone",
        "email",
        "birth_date",
        "age",
        "prefecture",
        "address",
        "employment_type",
        "qualification",
        "desired_job_type",
        "notes",
    ]

    rows: list[list[str]] = []
    with input_path.open("r", encoding="utf-8") as f:
        reader = csv.reader(f)
        raw_headers = next(reader, [])
        for row in reader:
            if not row:
                continue
            data = {raw_headers[i]: row[i] if i < len(row) else "" for i in range(len(raw_headers))}
            candidate_id = normalize_empty(data.get("ID"))
            if not candidate_id:
                continue
            rows.append([
                normalize_empty(data.get("担当者")),
                normalize_empty(data.get("媒体")),
                normalize_date(data.get("日付")),
                normalize_empty(data.get("ステータス")),
                candidate_id,
                normalize_empty(data.get("氏名")),
                normalize_empty(data.get("電話番号")).replace("-", ""),
                normalize_empty(data.get("メールアドレス")),
                normalize_date(data.get("生年月日")),
                normalize_empty(data.get("年齢")),
                normalize_empty(data.get("都道府県")),
                normalize_empty(data.get("市区町村")),
                normalize_empty(data.get("正・パ")),
                normalize_empty(data.get("保有資格")),
                normalize_empty(data.get("応募職種")),
                normalize_empty(data.get("備考")),
            ])

    write_csv(output_path, headers, rows)
    return len(rows)


def build_stg_member_sheet() -> int:
    input_dir = RAW_DIR / "メンバーシート"
    output_path = SUPABASE_DIR / "stg_member_sheet.csv"

    headers = [
        "member_name",
        "candidate_id",
        "assigned_date",
        "candidate_name",
        "lead_source",
        "category",
        "status_text",
        "expected_amount",
        "prob_current",
        "prob_next",
        "contract_amount",
        "interview_flag",
        "interview_flag_date",
        "interview_days",
        "contract_date",
        "area",
        "interview_date",
        "garden_name",
        "corporation_name",
        "concurrent",
    ]

    rows: list[list[str]] = []
    for csv_path in sorted(input_dir.glob("*.csv")):
        member_name = normalize_text(csv_path.stem.split(" - ")[-1])
        with csv_path.open("r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                if not row:
                    continue
                candidate_id = normalize_text(row[0]) if row else ""
                if not is_candidate_id(candidate_id):
                    continue
                values = row + [""] * (20 - len(row))
                rows.append([
                    member_name,
                    candidate_id,
                    normalize_date(values[1]),
                    normalize_empty(values[2]),
                    normalize_empty(values[3]),
                    normalize_empty(values[4]),
                    normalize_empty(values[5]),
                    normalize_amount(values[6]),
                    normalize_empty(values[7]),
                    normalize_empty(values[8]),
                    normalize_amount(values[9]),
                    normalize_empty(values[10]).upper(),
                    normalize_date(values[11]),
                    normalize_empty(values[12]),
                    normalize_date(values[13]),
                    normalize_empty(values[14]),
                    normalize_date(values[15]),
                    normalize_empty(values[16]),
                    normalize_empty(values[17]),
                    normalize_empty(values[18]),
                ])

    write_csv(output_path, headers, rows)
    return len(rows)


def build_stg_member_monthly() -> int:
    input_path = ROOT_DIR / "【保育】数値管理シート_最新版 - 全メンバーマージシート.csv"
    output_path = SUPABASE_DIR / "stg_member_monthly.csv"

    headers = [
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
        "interview_flag",
    ]

    rows: list[list[str]] = []
    with input_path.open("r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if len(row) < 13:
                continue
            rows.append([
                normalize_empty(row[0]),
                normalize_empty(row[1]),
                normalize_empty(row[2]),
                normalize_date(row[3]),
                normalize_empty(row[4]),
                normalize_empty(row[5]),
                normalize_empty(row[6]),
                normalize_empty(row[7]),
                normalize_amount(row[8]),
                normalize_empty(row[9]),
                normalize_empty(row[10]),
                normalize_amount(row[11]),
                normalize_empty(row[12]).upper(),
            ])

    write_csv(output_path, headers, rows)
    return len(rows)


def build_stg_contracts() -> int:
    output_path = SUPABASE_DIR / "stg_contracts.csv"

    headers = [
        "candidate_id",
        "accepted_date",
        "employment_restriction_until",
        "candidate_name",
        "source_name",
        "consultant_name",
        "employment_type",
        "job_type",
        "registered_at",
        "payment_date",
        "revenue_excluding_tax",
        "revenue_including_tax",
        "invoice_sent_date",
        "calculation_basis",
        "document_url",
        "placement_company",
    ]

    rows: list[list[str]] = []
    seen_keys: set[tuple[str, str]] = set()

    patterns = [
        str(RAW_DIR / "成約*.csv"),
        str(ROOT_DIR / "【自動更新】成約データ - *.csv"),
        str(ROOT_DIR / "【自動更新】成約データ - *.csv"),
    ]
    contract_files: list[str] = []
    for pattern in patterns:
        contract_files.extend(sorted(glob.glob(pattern)))

    for csv_path in contract_files:
        with Path(csv_path).open("r", encoding="utf-8") as f:
            reader = csv.reader(f)
            raw_headers = next(reader, [])
            for row in reader:
                if not row:
                    continue
                data = {raw_headers[i]: row[i] if i < len(row) else "" for i in range(len(raw_headers))}
                candidate_id = normalize_empty(data.get("ID"))
                if not candidate_id:
                    continue
                accepted_date = normalize_date(data.get("承諾日"))
                key = (candidate_id, accepted_date)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                rows.append([
                    candidate_id,
                    accepted_date,
                    normalize_date(data.get("転職勧奨禁止期間")),
                    normalize_empty(data.get("氏名")),
                    normalize_empty(data.get("経由")),
                    normalize_empty(data.get("担当")),
                    normalize_empty(data.get("雇用")),
                    normalize_empty(data.get("職種")),
                    normalize_date(data.get("登録日")),
                    normalize_date(data.get("入金")),
                    normalize_amount(data.get("売上(税抜)")),
                    normalize_amount(data.get("売上(税込)")),
                    normalize_date(data.get("請求書発送")),
                    normalize_empty(data.get("算出根拠")),
                    normalize_empty(data.get("格納先URL")),
                    normalize_empty(data.get("入職先")),
                ])

    write_csv(output_path, headers, rows)
    return len(rows)


def main() -> None:
    counts = {
        "stg_contacts": build_stg_contacts(),
        "stg_member_sheet": build_stg_member_sheet(),
        "stg_member_monthly": build_stg_member_monthly(),
        "stg_contracts": build_stg_contracts(),
    }

    for key, value in counts.items():
        print(f"{key}: {value} rows")


if __name__ == "__main__":
    main()
