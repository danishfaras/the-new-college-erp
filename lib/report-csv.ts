/** RFC-style CSV cell escaping for Excel compatibility */
export function csvEscape(value: string | number | null | undefined): string {
  const v = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

export function rowsToCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ]
  return lines.join('\r\n')
}

/** UTF-8 BOM so Excel opens UTF-8 CSV correctly */
export function withUtf8Bom(csv: string): string {
  return `\ufeff${csv}`
}
