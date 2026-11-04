import type { ResponseRow } from '../supabase'

const HEADERS = [
  'Submitted',
  'Name',
  'Email',
  'Phone',
  'Class',
  'Fields of Interest',
  'Population Interests',
  'Academic Interests',
  'Professional Development Interests',
]

function cell(value: string): string {
  // Responses come from a public form; neutralize values Excel/Sheets would run as formulas.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: ResponseRow[]): string {
  const lines = rows.map((r) =>
    [
      new Date(r.created_at).toLocaleString(),
      r.name,
      r.email,
      r.phone ?? '',
      r.class_year,
      r.fields_of_interest.join('; '),
      r.population_interests.join('; '),
      r.academic_topics.join('; '),
      r.professional_topics.join('; '),
    ]
      .map(cell)
      .join(','),
  )
  return [HEADERS.join(','), ...lines].join('\r\n')
}

export function downloadCsv(rows: ResponseRow[]) {
  // BOM so Excel opens UTF-8 names correctly.
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mentorship-responses-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
