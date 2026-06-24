"use client";

import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { Cliente, PecaItem, Preco, VolumeQuantidade } from "@/types";
import { getPrecos } from "@/lib/api";
import { mockPrecos } from "@/lib/mocks";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/masks";

interface Props {
  cliente: Cliente;
  pecas: PecaItem[];
  onConfirmar: (volumes: VolumeQuantidade[], avulsos: number, total: number) => void;
  onBack: () => void;
  loading?: boolean;
}

export default function Step3Precificacao({ cliente, pecas, onConfirmar, onBack, loading }: Props) {
  const [precos, setPrecos] = useState<Preco[]>([]);
  const [volumes, setVolumes] = useState<VolumeQuantidade[]>([]);
  const [avulsos, setAvulsos] = useState(0);

  useEffect(() => {
    getPrecos()
      .catch(() => mockPrecos)
      .then((data) => {
        setPrecos(data);
        const vols = data
          .filter((p) => p.tipo === "volume")
          .map((p) => ({ precoId: p.id, nome: p.nome, preco: p.preco, quantidade: 0 }));
        setVolumes(vols);
      });
  }, []);

  const precoAvulso = precos.find((p) => p.tipo === "avulso")?.preco ?? 0;

  const totalVolumes = volumes.reduce((acc, v) => acc + v.quantidade * v.preco, 0);
  const totalAvulso = avulsos * precoAvulso;
  const total = totalVolumes + totalAvulso;

  function changeQtd(precoId: string, delta: number) {
    setVolumes((prev) =>
      prev.map((v) =>
        v.precoId === precoId ? { ...v, quantidade: Math.max(0, v.quantidade + delta) } : v
      )
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-poppins font-bold text-brand-text">Precificação</h2>

      {/* Resumo cliente */}
      <div className="bg-white rounded-xl p-4 shadow-card border border-brand-gold/8 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-rose/15 flex items-center justify-center">
          <span className="font-semibold text-brand-rose">{cliente.nome.charAt(0)}</span>
        </div>
        <div>
          <p className="font-poppins font-semibold text-brand-text">{cliente.nome}</p>
          <p className="text-xs text-brand-text/50">{pecas.length} peças registradas</p>
        </div>
      </div>

      {/* Volumes */}
      <div className="bg-white rounded-2xl p-5 shadow-card border border-brand-gold/8">
        <h3 className="font-poppins font-semibold text-brand-text mb-4">Volumes de roupa</h3>
        <div className="flex flex-col gap-3">
          {volumes.map((v) => (
            <div key={v.precoId} className="flex items-center gap-4 p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
              <div className="flex-1">
                <p className="text-sm font-poppins font-medium text-brand-text">{v.nome}</p>
                <p className="text-xs text-brand-text/50">{formatCurrency(v.preco)} por saco</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeQtd(v.precoId, -1)}
                  disabled={v.quantidade === 0}
                  className="w-7 h-7 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-text/50 hover:bg-brand-gold/10 hover:border-brand-gold/60 disabled:opacity-30 transition-all"
                >
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center font-poppins font-semibold text-brand-text">{v.quantidade}</span>
                <button
                  onClick={() => changeQtd(v.precoId, 1)}
                  className="w-7 h-7 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-text/50 hover:bg-brand-gold/10 hover:border-brand-gold/60 transition-all"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="w-20 text-right">
                <p className="text-sm font-semibold text-brand-gold font-poppins">
                  {formatCurrency(v.quantidade * v.preco)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avulsos */}
      {precoAvulso > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-brand-gold/8">
          <h3 className="font-poppins font-semibold text-brand-text mb-4">Peças avulsas</h3>
          <div className="flex items-center gap-4 p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
            <div className="flex-1">
              <p className="text-sm font-poppins font-medium text-brand-text">Peça avulsa</p>
              <p className="text-xs text-brand-text/50">{formatCurrency(precoAvulso)} por peça</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAvulsos((v) => Math.max(0, v - 1))}
                disabled={avulsos === 0}
                className="w-7 h-7 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-text/50 hover:bg-brand-gold/10 hover:border-brand-gold/60 disabled:opacity-30 transition-all"
              >
                <Minus size={13} />
              </button>
              <span className="w-8 text-center font-poppins font-semibold text-brand-text">{avulsos}</span>
              <button
                onClick={() => setAvulsos((v) => v + 1)}
                className="w-7 h-7 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-text/50 hover:bg-brand-gold/10 hover:border-brand-gold/60 transition-all"
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="w-20 text-right">
              <p className="text-sm font-semibold text-brand-gold font-poppins">
                {formatCurrency(totalAvulso)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Total */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #D4AF37 0%, #E8C84A 100%)" }}
      >
        <div>
          <p className="text-white/70 text-sm font-inter">Total geral</p>
          <p className="text-3xl font-poppins font-bold text-white">{formatCurrency(total)}</p>
        </div>
        <div className="text-right text-white/70 text-sm font-inter">
          <p>{volumes.reduce((a, v) => a + v.quantidade, 0)} sacos</p>
          {avulsos > 0 && <p>{avulsos} avulsa{avulsos !== 1 ? "s" : ""}</p>}
        </div>
      </div>

      <div className="flex gap-3 justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button
          onClick={() => onConfirmar(volumes.filter((v) => v.quantidade > 0), avulsos, total)}
          loading={loading}
          disabled={total === 0}
          size="lg"
        >
          Confirmar Entrada
        </Button>
      </div>
    </div>
  );
}
