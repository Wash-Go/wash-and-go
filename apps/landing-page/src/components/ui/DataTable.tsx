import type { TableRow } from '../../content/site'

export type Column = { label: string; numeric?: boolean }

/**
 * A compact data table (max three columns): numbers in mono, right-aligned;
 * the last column carries the basis or source in muted text.
 */
export function DataTable({
  caption,
  columns,
  rows,
  note,
}: {
  caption: string
  columns: ReadonlyArray<Column>
  rows: ReadonlyArray<TableRow>
  note?: string
}) {
  const last = columns.length - 1
  return (
    <figure className="w-full">
      <table className="w-full border-collapse text-left text-[0.95rem] leading-snug">
        <caption className="mb-3 text-left text-base font-bold text-ink">
          {caption}
        </caption>
        <thead>
          <tr className="border-b-2 border-ink">
            {columns.map((col) => (
              <th
                key={col.label}
                scope="col"
                className={`px-2 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted first:pl-0 last:pr-0 ${col.numeric ? 'text-right' : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.cells[0]}
              className={`border-b border-line align-top ${row.strong ? 'font-bold' : ''}`}
            >
              {row.cells.map((cell, i) => {
                const col = columns[i] as Column | undefined
                const base = 'px-2 py-2.5 first:pl-0 last:pr-0'
                if (i === 0) {
                  return (
                    <th
                      key={i}
                      scope="row"
                      className={`${base} font-[inherit]`}
                    >
                      {cell}
                    </th>
                  )
                }
                return (
                  <td
                    key={i}
                    className={`${base} ${col?.numeric ? 'text-right font-mono whitespace-nowrap tabular-nums' : ''} ${i === last && !col?.numeric ? 'text-muted' : ''}`}
                  >
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {note ? (
        <figcaption className="mt-3 text-sm text-muted">{note}</figcaption>
      ) : null}
    </figure>
  )
}
