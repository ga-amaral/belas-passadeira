"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { PEDIDO_STATUS_LABELS, PEDIDO_STATUSES } from "@/lib/domain/pedido-status";
import { getPedidosKanban, updatePedidoStatus } from "@/lib/api";
import type { PedidoKanban, PedidoStatus } from "@/types";
import PedidoCard from "./PedidoCard";
import { getBackgroundDragScrollLeft, groupPedidosByStatus, mergePollingPedidos, shouldApplyPollingResult } from "./pedido-kanban-state";

const pedidoStatuses = PEDIDO_STATUSES as readonly PedidoStatus[];

function Column({ status, children, count }: {
  status: PedidoStatus;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${PEDIDO_STATUS_LABELS[status]}, ${count} pedidos`}
      className={`min-h-[22rem] min-w-[15rem] flex-1 basis-0 rounded-2xl border p-3 transition-colors ${
        isOver ? "border-brand-mint bg-brand-mint/15" : "border-brand-gold/10 bg-white/65"
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-poppins font-semibold text-brand-text">{PEDIDO_STATUS_LABELS[status]}</h2>
        <span className="rounded-full bg-brand-gold/10 px-2 py-1 text-xs font-semibold text-brand-gold">
          {count}
        </span>
      </header>
      <div className="space-y-3">
        {children}
        {count === 0 && <p className="rounded-xl border border-dashed border-brand-gold/20 p-4 text-center text-xs text-brand-text/45">Solte pedidos aqui</p>}
      </div>
    </section>
  );
}

export default function PedidosKanban() {
  const [pedidos, setPedidos] = useState<PedidoKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const pendingIdsRef = useRef<Set<number>>(new Set());
  const movesEpochRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const backgroundDragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);
  const backgroundDragListenersRef = useRef<{ move: (event: PointerEvent) => void; stop: (event: PointerEvent) => void } | null>(null);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const load = useCallback(async () => {
    const epochAtStart = movesEpochRef.current;
    try {
      const incoming = await getPedidosKanban();
      if (!shouldApplyPollingResult(epochAtStart, movesEpochRef.current)) return;
      setPedidos((current) => mergePollingPedidos(current, incoming, pendingIdsRef.current));
      setLoadError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erro ao carregar pedidos.";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    timerRef.current = window.setInterval(() => void load(), 30_000);

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [load]);

  const stopBackgroundDrag = useCallback(() => {
    const listeners = backgroundDragListenersRef.current;
    if (listeners) {
      window.removeEventListener("pointermove", listeners.move);
      window.removeEventListener("pointerup", listeners.stop);
      window.removeEventListener("pointercancel", listeners.stop);
    }
    backgroundDragListenersRef.current = null;
    backgroundDragRef.current = null;
    setIsDraggingBoard(false);
  }, []);

  useEffect(() => () => {
    const listeners = backgroundDragListenersRef.current;
    if (listeners) {
      window.removeEventListener("pointermove", listeners.move);
      window.removeEventListener("pointerup", listeners.stop);
      window.removeEventListener("pointercancel", listeners.stop);
    }
  }, []);

  const handleBackgroundPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !(event.target instanceof Element) || event.target.closest("article,button") !== null) return;

    const board = boardRef.current;
    if (!board) return;

    event.preventDefault();
    backgroundDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: board.scrollLeft,
    };
    setIsDraggingBoard(true);

    const move = (moveEvent: PointerEvent) => {
      const drag = backgroundDragRef.current;
      if (!drag || moveEvent.pointerId !== drag.pointerId || moveEvent.pointerType !== "mouse") return;
      const currentBoard = boardRef.current;
      if (currentBoard) currentBoard.scrollLeft = getBackgroundDragScrollLeft(drag.scrollLeft, drag.startX, moveEvent.clientX);
    };
    const stop = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === event.pointerId) stopBackgroundDrag();
    };
    backgroundDragListenersRef.current = { move, stop };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }, [stopBackgroundDrag]);

  const move = useCallback(async (id: number, status: PedidoStatus) => {
    const current = pedidos.find((pedido) => pedido.id === id);
    if (!current || current.status === status || pendingIdsRef.current.has(id)) return;

    movesEpochRef.current += 1;
    const nextPending = new Set(pendingIdsRef.current).add(id);
    pendingIdsRef.current = nextPending;
    setPendingIds(nextPending);
    setMoveError(null);
    setPedidos((items) => items.map((pedido) => (
      pedido.id === id ? { ...pedido, status } : pedido
    )));

    try {
      const response = await updatePedidoStatus(id, status);
      setPedidos((items) => items.map((pedido) => (
        pedido.id === id ? { ...pedido, status: response.status } : pedido
      )));
    } catch (cause) {
      setPedidos((items) => items.map((pedido) => (
        pedido.id === id ? { ...pedido, status: current.status } : pedido
      )));
      setMoveError(cause instanceof Error ? cause.message : "Erro ao atualizar pedido.");
    } finally {
      movesEpochRef.current += 1;
      const clearedPending = new Set(pendingIdsRef.current);
      clearedPending.delete(id);
      pendingIdsRef.current = clearedPending;
      setPendingIds(clearedPending);
    }
  }, [pedidos]);

  const grouped = useMemo(
    () => groupPedidosByStatus(pedidos, pedidoStatuses) as Record<PedidoStatus, PedidoKanban[]>,
    [pedidos],
  );

  if (loading) {
    return (
      <div aria-label="Carregando pedidos" className="max-h-[calc(100vh-8rem)] overflow-x-auto overflow-y-auto rounded-2xl p-2 pb-4">
        <div className="flex w-full gap-4">
          {pedidoStatuses.map((status) => <div key={status} className="h-72 min-w-[15rem] flex-1 basis-0 animate-pulse rounded-2xl bg-white shadow-card" />)}
        </div>
      </div>
    );
  }

  if (loadError && pedidos.length === 0) {
    return (
      <div role="alert" className="rounded-2xl bg-white p-8 text-center shadow-card">
        <p className="text-brand-text/65">{loadError}</p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-xl bg-brand-gold px-4 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {loadError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}
      {moveError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível mover o pedido: {moveError}</p>}
      <DndContext
        sensors={sensors}
        onDragEnd={(event: DragEndEvent) => {
          const id = Number(event.active.id);
          const status = event.over?.id;
          if (typeof status === "string" && pedidoStatuses.includes(status as PedidoStatus)) {
            void move(id, status as PedidoStatus);
          }
        }}
      >
        <div
          ref={boardRef}
          onPointerDown={handleBackgroundPointerDown}
          className={`linen-bg max-h-[calc(100vh-8rem)] overflow-x-auto overflow-y-auto rounded-2xl p-2 pb-4 ${isDraggingBoard ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <div className="flex w-full gap-4">
            {pedidoStatuses.map((status) => {
              const columnPedidos = grouped[status] || [];
              return (
                <Column key={status} status={status} count={columnPedidos.length}>
                  {columnPedidos.map((pedido) => (
                    <PedidoCard key={pedido.id} pedido={pedido} busy={pendingIds.has(pedido.id)} onMove={move} />
                  ))}
                </Column>
              );
            })}
          </div>
        </div>
      </DndContext>
      {pedidos.length === 0 && <p className="text-center text-sm text-brand-text/50">Nenhum pedido encontrado.</p>}
    </div>
  );
}
