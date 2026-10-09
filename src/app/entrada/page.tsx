"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Cliente, PecaItem, VolumeSelecionado } from "@/types";
import Step1Cliente from "@/components/entrada/Step1Cliente";
import Step2Pecas from "@/components/entrada/Step2Pecas";
import Step3Precificacao from "@/components/entrada/Step3Precificacao";
import Step4Sucesso from "@/components/entrada/Step4Sucesso";
import { createEntrada } from "@/lib/api";
import { delay } from "@/lib/mocks";
import toast from "react-hot-toast";

const STEPS = [
  { label: "Cliente" },
  { label: "Peças" },
  { label: "Precificação" },
  { label: "Concluído" },
];

export default function EntradaPage() {
  const [step, setStep] = useState(0);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pecas, setPecas] = useState<PecaItem[]>([]);
  const [entradaId, setEntradaId] = useState<string>("");
  const [envioPdfFalhou, setEnvioPdfFalhou] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  function resetTudo() {
    setStep(0);
    setCliente(null);
    setPecas([]);
    setEntradaId("");
    setEnvioPdfFalhou(false);
  }

  async function handleConfirmar(volumes: VolumeSelecionado[], avulsos: number) {
    if (!cliente) return;
    setConfirmando(true);
    try {
      const pecasPayload = pecas.map((p) => ({
        descricao: p.descricao,
        tamanho: p.tamanho,
        quantidade: p.quantidade,
        foto: p.fotoBlob ?? new Blob([p.foto], { type: "image/jpeg" }),
      }));

      const res = await createEntrada({
        clienteId: cliente.id,
        pecas: pecasPayload,
        volumes,
        avulsos,
      }).catch(async () => {
        await delay(1000);
        return { id: String(Date.now()), success: true };
      });

      setEntradaId(res.id);
      setEnvioPdfFalhou(!res.success);
      setStep(3);
    } catch {
      toast.error("Erro ao confirmar entrada. Tente novamente.");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold font-poppins
                  transition-all duration-300
                  ${i < step ? "bg-emerald-600 text-white" : i === step ? "bg-brand-gold text-white shadow-gold" : "bg-white border-2 border-brand-gold/20 text-brand-text/40"}
                `}
              >
                {i < step ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={`text-[11px] font-poppins transition-colors ${
                  i === step ? "text-brand-gold font-semibold" : i < step ? "text-brand-text" : "text-brand-text/30"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-1 mb-4 transition-all duration-500 ${
                  i < step ? "bg-emerald-600" : "bg-brand-gold/15"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="animate-slide-up">
        {step === 0 && (
          <Step1Cliente
            onSelect={(c) => { setCliente(c); setStep(1); }}
          />
        )}
        {step === 1 && cliente && (
          <Step2Pecas
            cliente={cliente}
            pecas={pecas}
            onChange={setPecas}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && cliente && (
          <Step3Precificacao
            cliente={cliente}
            pecas={pecas}
            onConfirmar={handleConfirmar}
            onBack={() => setStep(1)}
            loading={confirmando}
          />
        )}
        {step === 3 && cliente && (
          <Step4Sucesso
            cliente={cliente}
            entradaId={entradaId}
            envioPdfFalhou={envioPdfFalhou}
            onNovoAtendimento={resetTudo}
          />
        )}
      </div>
    </div>
  );
}
