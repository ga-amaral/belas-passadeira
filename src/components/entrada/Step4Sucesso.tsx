"use client";

import { CheckCircle, RefreshCw, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import { Cliente } from "@/types";
import { reenviarPdf } from "@/lib/api";
import { useState } from "react";
import toast from "react-hot-toast";

interface Props {
  cliente: Cliente;
  entradaId: string;
  envioPdfFalhou?: boolean;
  onNovoAtendimento: () => void;
}

export default function Step4Sucesso({ cliente, entradaId, envioPdfFalhou, onNovoAtendimento }: Props) {
  const [reenviando, setReenviando] = useState(false);
  const [enviado, setEnviado] = useState(!envioPdfFalhou);

  async function handleReenviar() {
    setReenviando(true);
    try {
      await reenviarPdf(entradaId).catch(() => {});
      setEnviado(true);
      toast.success("PDF reenviado com sucesso!");
    } catch {
      toast.error("Erro ao reenviar. Tente novamente.");
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 max-w-md mx-auto text-center">
      {enviado ? (
        <>
          <div className="w-20 h-20 rounded-full bg-emerald-600/15 flex items-center justify-center animate-scale-in">
            <CheckCircle size={40} className="text-brand-text" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-poppins font-bold text-brand-text">Registro concluído!</h2>
            <p className="text-brand-text/60 mt-2 font-inter">
              PDF enviado para o WhatsApp de <strong className="text-brand-text">{cliente.nome}</strong>
            </p>
            <p className="text-sm text-brand-text/40 mt-1">{cliente.whatsapp}</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertTriangle size={40} className="text-amber-500" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-poppins font-bold text-brand-text">Registro salvo!</h2>
            <p className="text-brand-text/60 mt-2 font-inter">
              Mas houve um problema ao enviar o PDF para o WhatsApp de {cliente.nome}.
            </p>
          </div>
          <Button variant="secondary" onClick={handleReenviar} loading={reenviando}>
            <RefreshCw size={16} /> Reenviar PDF
          </Button>
        </>
      )}

      <div className="w-full pt-4 border-t border-brand-gold/10">
        <Button fullWidth size="lg" onClick={onNovoAtendimento}>
          Novo atendimento
        </Button>
      </div>
    </div>
  );
}
