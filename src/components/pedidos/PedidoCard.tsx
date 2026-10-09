"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency } from "@/lib/masks";
import { PEDIDO_STATUS_LABELS, PEDIDO_STATUSES } from "@/lib/domain/pedido-status";
import type { PedidoKanban, PedidoStatus } from "@/types";

type Props = {
  pedido: PedidoKanban;
  busy: boolean;
  onMove: (id: number, status: PedidoStatus) => void;
};

export default function PedidoCard({ pedido, busy, onMove }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nextStatuses = PEDIDO_STATUSES as readonly PedidoStatus[];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pedido.id,
    disabled: busy,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      aria-busy={busy}
      className="rounded-2xl border border-brand-gold/10 bg-white p-4 shadow-card transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-poppins font-semibold text-brand-text">
          {pedido.clienteNome || "Cliente não informado"}
        </h3>
        <span className="shrink-0 rounded-full bg-brand-gold/10 px-2 py-1 text-xs font-medium text-brand-gold">
          {pedido.quantidadePecas} peças
        </span>
      </div>
      <p className="mt-3 text-xs text-brand-text/60">
        Registrado por {pedido.funcionariaNome || "Não informado"}
      </p>
      <p className="mt-1 font-poppins text-sm font-semibold text-brand-gold">
        {formatCurrency(pedido.totalGeral)}
      </p>
      <p className="mt-1 text-xs text-brand-text/50">
        {new Date(pedido.createdAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <button
        type="button"
        disabled={busy}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setMenuOpen((open) => !open)}
        className="mt-4 min-h-11 w-full rounded-xl border border-brand-gold/25 bg-white px-3 text-sm font-medium text-brand-text transition-colors hover:bg-brand-gold/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Movendo…" : "Mover"}
      </button>
      {menuOpen && (
        <div
          role="menu"
          aria-label={`Mover pedido de ${pedido.clienteNome || "cliente não informado"}`}
          className="mt-2 grid gap-1 rounded-xl bg-brand-bg p-1"
        >
          {nextStatuses.filter((status) => status !== pedido.status).map((status) => (
            <button
              key={status}
              type="button"
              role="menuitem"
              disabled={busy}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                setMenuOpen(false);
                onMove(pedido.id, status);
              }}
              className="min-h-10 rounded-lg px-3 py-2 text-left text-sm text-brand-text transition-colors hover:bg-brand-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:cursor-wait disabled:opacity-60"
            >
              {PEDIDO_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
