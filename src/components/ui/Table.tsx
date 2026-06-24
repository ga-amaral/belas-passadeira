"use client";

import { ReactNode, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T;
  emptyMessage?: string;
  pageSize?: number;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = "id" as keyof T,
  emptyMessage = "Nenhum registro encontrado.",
  pageSize = 10,
}: TableProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(data.length / pageSize);
  const paginated = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-brand-gold/10 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-gold/10 bg-brand-bg/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-poppins font-semibold text-brand-text/70 whitespace-nowrap ${col.className ?? ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-brand-text/40 font-inter">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={String(row[keyField]) ?? i}
                  className="border-b border-brand-gold/5 last:border-0 hover:bg-brand-gold/3 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-brand-text ${col.className ?? ""}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-brand-text/50">
            Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} de {data.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-full hover:bg-brand-gold/10 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  p === page
                    ? "bg-brand-gold text-white"
                    : "hover:bg-brand-gold/10 text-brand-text/60"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-full hover:bg-brand-gold/10 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
