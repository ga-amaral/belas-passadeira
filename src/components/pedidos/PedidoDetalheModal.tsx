"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { SpinnerCircle } from "@/components/ui/Spinner";
import { getPedidoDetalhe } from "@/lib/api";
import { PEDIDO_STATUS_LABELS } from "@/lib/domain/pedido-status";
import { formatCurrency, formatDate } from "@/lib/masks";
import type { PedidoDetalhe, PedidoKanban, PedidoPeca } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function fotoSrc(url: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
}

type Props = {
  pedido: PedidoKanban | null;
  onClose: () => void;
};

export default function PedidoDetalheModal({ pedido, onClose }: Props) {
  const [detalhe, setDetalhe] = useState<PedidoDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const pedidoId = pedido?.id ?? null;

  useEffect(() => {
    if (pedidoId === null) {
      setDetalhe(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    getPedidoDetalhe(pedidoId)
      .then((data) => { if (!cancelled) setDetalhe(data); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Erro ao carregar as peças do pedido."); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [pedidoId]);

  const pecas = detalhe?.pecas ?? [];
  const totalPecas = detalhe?.quantidadePecas ?? pedido?.quantidadePecas ?? 0;

  return (
    <>
      <Modal
        open={pedido !== null}
        onClose={onClose}
        title={pedido ? `Pedido de ${pedido.clienteNome || "cliente não informado"}` : "Detalhes do pedido"}
        size="xl"
      >
        {pedido && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-brand-gold/8 bg-brand-bg p-3">
                <p className="text-xs text-brand-text/50">Total</p>
                <p className="font-poppins text-xl font-bold text-brand-gold">{formatCurrency(pedido.totalGeral)}</p>
              </div>
              <div className="rounded-xl border border-brand-gold/8 bg-brand-bg p-3">
                <p className="text-xs text-brand-text/50">Status</p>
                <p className="font-inter text-sm font-medium text-brand-text">{PEDIDO_STATUS_LABELS[pedido.status]}</p>
              </div>
              <div className="rounded-xl border border-brand-gold/8 bg-brand-bg p-3">
                <p className="text-xs text-brand-text/50">Funcionária</p>
                <p className="font-inter text-sm text-brand-text">{pedido.funcionariaNome || "Não informado"}</p>
              </div>
              <div className="rounded-xl border border-brand-gold/8 bg-brand-bg p-3">
                <p className="text-xs text-brand-text/50">Registrado em</p>
                <p className="font-inter text-sm text-brand-text">{formatDate(pedido.createdAt)}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-poppins text-sm font-semibold text-brand-text/70">
                  Peças ({totalPecas})
                </p>
                {loading && <SpinnerCircle size={16} className="text-brand-gold" />}
              </div>

              {error ? (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              ) : !loading && pecas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-brand-gold/20 p-4 text-center text-xs text-brand-text/45">
                  Nenhuma peça registrada para este pedido.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pecas.map((peca, index) => (
                    <PecaRow key={index} peca={peca} onAmpliar={setFotoAmpliada} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setFotoAmpliada(null)}
            aria-label="Fechar foto"
          >
            <X size={28} />
          </button>
          <img
            src={fotoAmpliada}
            alt="Foto da peça"
            className="max-h-[90vh] max-w-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function PecaRow({ peca, onAmpliar }: { peca: PedidoPeca; onAmpliar: (src: string) => void }) {
  const src = fotoSrc(peca.fotoUrl);

  return (
    <li className="flex items-center gap-3 rounded-xl border border-brand-gold/8 bg-brand-bg p-3">
      {src ? (
        <button
          type="button"
          onClick={() => onAmpliar(src)}
          title="Ampliar foto"
          className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-brand-gold/20 transition-colors hover:border-brand-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <img src={src} alt={peca.descricao} loading="lazy" className="h-full w-full object-cover" />
        </button>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-brand-gold/10 bg-white">
          <ImageIcon size={20} className="text-brand-text/20" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-inter text-sm text-brand-text">{peca.descricao}</p>
        {peca.tamanho && <p className="text-xs text-brand-text/50">Tamanho: {peca.tamanho}</p>}
        <span className="mt-1 inline-block rounded-full bg-brand-gold/10 px-2 py-0.5 text-xs font-medium text-brand-gold">
          {peca.quantidade} {peca.quantidade === 1 ? "peça" : "peças"}
        </span>
      </div>
    </li>
  );
}
