import type { Contract } from '@/types/database'

/** CSV用の入職先1セル表記（法人名・施設名を全角｜で連結） */
export function placementExportLabel(contract: {
  placement_company_name?: string | null
  placement_facility_name?: string | null
  placement_company?: string | null
}): string {
  const parts = [contract.placement_company_name, contract.placement_facility_name].filter(Boolean)
  if (parts.length > 0) return parts.join('｜')
  return contract.placement_company || ''
}

const NAIHUKU_HEADER = '担当者,年月,求職者名,入職先,税込金額,税抜金額' as const

export function getSeiyakuNaihukuCsvHeader(): string[] {
  return NAIHUKU_HEADER.split(',')
}

/** 成約内訳CSVの行（担当者・年月・求職者名・入職先・税込・税抜のみ） */
export function buildSeiyakuNaihukuRows(
  contracts: Contract[],
  users: { id: string; name: string }[]
): { header: string[]; rows: (string | number)[][] } {
  type CandidateWithConsultant = {
    name?: string
    consultant_id?: string
    consultant?: { name?: string } | null
  }

  const getConsultantName = (c: Contract) => {
    const candidate = (c as { candidate?: CandidateWithConsultant }).candidate
    const fromRelation = candidate?.consultant?.name?.trim()
    if (fromRelation) return fromRelation
    const consultantId = candidate?.consultant_id
    return users.find((u) => u.id === consultantId)?.name ?? '未担当'
  }

  const consultantsSet = new Set<string>()
  contracts.forEach((c) => consultantsSet.add(getConsultantName(c)))
  const consultants = [...consultantsSet].sort((a, b) => a.localeCompare(b, 'ja'))

  const header = getSeiyakuNaihukuCsvHeader()
  const rows: (string | number)[][] = []

  consultants.forEach((consultant) => {
    const entries = contracts.filter((c) => getConsultantName(c) === consultant && c.accepted_date)
    const sortedEntries = [...entries].sort((a, b) =>
      (a.accepted_date ?? '') < (b.accepted_date ?? '') ? -1 : 1
    )
    sortedEntries.forEach((c) => {
      const candidate = (c as { candidate?: CandidateWithConsultant }).candidate
      const [y, m] = (c.accepted_date ?? '').slice(0, 7).split('-')
      const ym = `${y}年${Number(m)}月`
      rows.push([
        consultant,
        ym,
        candidate?.name ?? '',
        placementExportLabel(c),
        c.revenue_including_tax ?? 0,
        c.revenue_excluding_tax ?? 0,
      ])
    })
  })

  return { header, rows }
}

export function isSeiyakuNaihukuHeader(header: string[]): boolean {
  return header.join(',') === NAIHUKU_HEADER
}
