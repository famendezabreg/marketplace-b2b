import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-paper-300">
            {columns.map((col) => (
              <th
                key={col.header}
                className="font-manifest px-5 py-3 text-xs text-ink-500"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-paper-200 last:border-0 ${
                onRowClick ? 'cursor-pointer hover:bg-paper-200/60' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.header} className={`px-5 py-3 ${col.className ?? ''}`}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
