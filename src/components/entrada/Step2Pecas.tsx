"use client";

import { useState, useCallback } from "react";
import { Trash2, Edit2, Check } from "lucide-react";
import { Cliente, PecaItem } from "@/types";
import WebcamCapture from "./WebcamCapture";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import { identificarPeca as apiIdentificarPeca } from "@/lib/api";
import { mockDescricaoIA } from "@/lib/mocks";
import toast from "react-hot-toast";
import Image from "next/image";

interface Props {
  cliente: Cliente;
  pecas: PecaItem[];
  onChange: (pecas: PecaItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const TAMANHOS_LENCOL = ["Solteiro", "Casal", "Queen", "King"];
const TAMANHOS_TOALHA = ["Rosto", "Banho", "Piso"];

export default function Step2Pecas({ cliente, pecas, onChange, onNext, onBack }: Props) {
  const [processando, setProcessando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const handleCaptura = useCallback(async (blob: Blob, dataUrl: string) => {
    setProcessando(true);
    try {
      const resultado = await apiIdentificarPeca(blob).catch((err) => {
        console.warn("[IA] Falha ao identificar via OpenAI, usando mock:", err);
        return mockDescricaoIA();
      });
      const tamanhoDefinido =
        ("tamanhoSugerido" in resultado && resultado.tamanhoSugerido)
          ? (resultado as { tamanhoSugerido: string | null }).tamanhoSugerido || undefined
          : (resultado.tipo === "lencol" ? "Casal" : resultado.tipo === "toalha" ? "Banho" : undefined);

      const novaPeca: PecaItem = {
        id: String(Date.now()),
        foto: dataUrl,
        fotoBlob: blob,
        descricao: resultado.descricao || "Peça de roupa",
        tipo: (["lencol", "toalha", "outro"].includes(resultado.tipo) ? resultado.tipo : "outro") as PecaItem["tipo"],
        tamanho: tamanhoDefinido,
      };
      onChange([...pecas, novaPeca]);
      toast.success("Peça identificada com sucesso!");
    } catch {
      toast.error("Erro ao identificar a peça. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }, [pecas, onChange]);

  function updatePeca(id: string, changes: Partial<PecaItem>) {
    onChange(pecas.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  function removePeca(id: string) {
    onChange(pecas.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-white shadow-card border border-brand-gold/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-rose/15 flex items-center justify-center">
              <span className="text-sm font-semibold text-brand-rose">{cliente.nome.charAt(0)}</span>
            </div>
            <div>
              <p className="font-poppins font-semibold text-brand-text text-sm">{cliente.nome}</p>
              <p className="text-xs text-brand-text/50">{cliente.whatsapp}</p>
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="bg-brand-gold/10 px-3 py-1.5 rounded-full">
          <span className="text-sm font-poppins font-semibold text-brand-gold">
            {pecas.length} {pecas.length === 1 ? "peça" : "peças"}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Câmera */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-brand-gold/8 flex flex-col items-center gap-4">
          <h3 className="font-poppins font-semibold text-brand-text self-start">Captura de Peças</h3>
          <div className="relative w-full flex justify-center">
            <WebcamCapture onCapture={handleCaptura} disabled={processando} />
            {processando && (
              <div className="absolute inset-0 z-10 rounded-xl bg-white/85 flex flex-col items-center justify-center gap-3">
                <Spinner />
                <p className="text-sm font-inter text-brand-text/60">Identificando peça...</p>
              </div>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-brand-gold/8 flex flex-col gap-3">
          <h3 className="font-poppins font-semibold text-brand-text">
            Peças identificadas
          </h3>
          <div className="flex-1 overflow-y-auto max-h-96 scrollbar-thin flex flex-col gap-2">
            {pecas.length === 0 ? (
              <div className="text-center py-12 text-brand-text/30">
                <p className="text-sm font-inter">Capture as peças usando a câmera</p>
              </div>
            ) : (
              pecas.map((peca) => (
                <div
                  key={peca.id}
                  className="flex gap-3 p-3 rounded-xl bg-brand-bg border border-brand-gold/8 group"
                >
                  {/* Foto */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-brand-rose/10">
                    <Image
                      src={peca.foto}
                      alt={peca.descricao}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {editandoId === peca.id ? (
                      <div className="flex gap-2 items-start">
                        <input
                          autoFocus
                          value={peca.descricao}
                          onChange={(e) => updatePeca(peca.id, { descricao: e.target.value })}
                          className="flex-1 text-sm bg-white border border-brand-gold/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold/40"
                          onBlur={() => setEditandoId(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditandoId(null)}
                        />
                        <button onClick={() => setEditandoId(null)} className="text-brand-mint">
                          <Check size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-inter text-brand-text truncate">{peca.descricao}</p>
                    )}

                    {/* Tamanho dropdown */}
                    {(peca.tipo === "lencol" || peca.tipo === "toalha") && (
                      <select
                        value={peca.tamanho ?? ""}
                        onChange={(e) => updatePeca(peca.id, { tamanho: e.target.value })}
                        className="mt-1 text-xs bg-white border border-brand-gold/20 rounded-lg px-2 py-0.5 text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
                      >
                        {(peca.tipo === "lencol" ? TAMANHOS_LENCOL : TAMANHOS_TOALHA).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => setEditandoId(peca.id)}
                      className="p-1 rounded hover:bg-brand-gold/10 text-brand-text/30 hover:text-brand-gold"
                    >
                      <Edit2 size={13} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => removePeca(peca.id)}
                      className="p-1 rounded hover:bg-red-50 text-brand-text/30 hover:text-red-500"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext} disabled={pecas.length === 0}>
          Finalizar Entrada ({pecas.length} {pecas.length === 1 ? "peça" : "peças"})
        </Button>
      </div>
    </div>
  );
}
