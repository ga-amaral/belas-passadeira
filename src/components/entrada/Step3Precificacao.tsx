"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Cliente, OpcaoPreco, PecaItem, VolumeSelecionado } from "@/types";
import { getOpcoesPreco } from "@/lib/api";
import Button from "@/components/ui/Button";

interface Props {
  cliente: Cliente;
  pecas: PecaItem[];
  onConfirmar: (volumes: VolumeSelecionado[], avulsos: number) => void;
  onBack: () => void;
  loading?: boolean;
}

export default function Step3Precificacao({ cliente, pecas, onConfirmar, onBack, loading }: Props) {
  const [opcoes, setOpcoes] = useState<OpcaoPreco[]>([]);
  const [volumes, setVolumes] = useState<VolumeSelecionado[]>([]);
  const [avulsos, setAvulsos] = useState(0);

  useEffect(() => {
    getOpcoesPreco()
      .then((data) => {
        setOpcoes(data);
        setVolumes(data.filter((opcao) => opcao.tipo === "volume")
          .map((opcao) => ({ precoId: opcao.id, nome: opcao.nome, quantidade: 0 })));
      })
      .catch(() => setOpcoes([]));
  }, []);

  const possuiAvulso = opcoes.some((opcao) => opcao.tipo === "avulso");
  const quantidadeSacos = volumes.reduce((total, volume) => total + volume.quantidade, 0);
  const totalItens = quantidadeSacos + avulsos;

  function changeQtd(precoId: string, delta: number) {
    setVolumes((prev) => prev.map((volume) => (
      volume.precoId === precoId
        ? { ...volume, quantidade: Math.max(0, volume.quantidade + delta) }
        : volume
    )));
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-poppins font-bold text-brand-text">Precificação</h2>

      <div className="bg-white rounded-xl p-4 shadow-card border border-brand-gold/8 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-rose/15 flex items-center justify-center">
          <span className="font-semibold text-brand-rose">{cliente.nome.charAt(0)}</span>
        </div>
        <div>
          <p className="font-poppins font-semibold text-brand-text">{cliente.nome}</p>
          <p className="text-xs text-brand-text/50">{pecas.reduce((t, p) => t + p.quantidade, 0)} peças registradas</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-card border border-brand-gold/8">
        <h3 className="font-poppins font-semibold text-brand-text mb-4">Volumes de roupa</h3>
        <div className="flex flex-col gap-3">
          {volumes.map((volume) => (
            <div key={volume.precoId} className="flex items-center gap-4 p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
              <p className="flex-1 text-sm font-poppins font-medium text-brand-text">{volume.nome}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => changeQtd(volume.precoId, -1)} disabled={volume.quantidade === 0} className="w-7 h-7 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-text/50 hover:bg-brand-gold/10 disabled:opacity-30 transition-all">
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center font-poppins font-semibold text-brand-text">{volume.quantidade}</span>
                <button onClick={() => changeQtd(volume.precoId, 1)} className="w-7 h-7 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-text/50 hover:bg-brand-gold/10 transition-all">
                  <Plus size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {possuiAvulso && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-brand-gold/8">
          <h3 className="font-poppins font-semibold text-brand-text mb-4">Peças avulsas</h3>
          <div className="flex items-center gap-4 p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
            <p className="flex-1 text-sm font-poppins font-medium text-brand-text">Peça avulsa</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setAvulsos((value) => Math.max(0, value - 1))} disabled={avulsos === 0} className="w-7 h-7 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-text/50 hover:bg-brand-gold/10 disabled:opacity-30 transition-all">
                <Minus size={13} />
              </button>
              <span className="w-8 text-center font-poppins font-semibold text-brand-text">{avulsos}</span>
              <button onClick={() => setAvulsos((value) => value + 1)} className="w-7 h-7 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-text/50 hover:bg-brand-gold/10 transition-all">
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #D4AF37 0%, #E8C84A 100%)" }}>
        <div>
          <p className="text-white/70 text-sm font-inter">Resumo da entrada</p>
          <p className="text-xl font-poppins font-bold text-white">Valores definidos pela administração</p>
        </div>
        <div className="text-right text-white/70 text-sm font-inter">
          <p>{quantidadeSacos} sacos</p>
          {avulsos > 0 && <p>{avulsos} avulsa{avulsos !== 1 ? "s" : ""}</p>}
        </div>
      </div>

      <div className="flex gap-3 justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={() => onConfirmar(volumes.filter((volume) => volume.quantidade > 0), avulsos)} loading={loading} disabled={totalItens === 0} size="lg">
          Confirmar Entrada
        </Button>
      </div>
    </div>
  );
}
