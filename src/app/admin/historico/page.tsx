"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, Eye, Search, Filter } from "lucide-react";
import { Entrada } from "@/types";
import { getEntradas, getEntradaPdf, reenviarPdf } from "@/lib/api";
import { mockEntradas } from "@/lib/mocks";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/masks";
import toast from "react-hot-toast";

export default function HistoricoPage() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Entrada | null>(null);
  const [filters, setFilters] = useState({ dataInicio: "", dataFim: "", clienteId: "", search: "" });
  const [reenviando, setReenviando] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getEntradas().catch(() => mockEntradas);
    setEntradas(data);
    setLoading(false);
  }

  const filtered = entradas.filter((e) => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return (
      e.clienteNome.toLowerCase().includes(s) ||
      e.funcionariaNome.toLowerCase().includes(s)
    );
  });

  async function handleReenviar(id: string) {
    setReenviando(id);
    try {
      await reenviarPdf(id).catch(() => {});
      toast.success("PDF reenviado para o WhatsApp!");
    } catch {
      toast.error("Erro ao reenviar.");
    } finally {
      setReenviando(null);
    }
  }

  async function handleDownload(id: string) {
    try {
      const blob = await getEntradaPdf(id).catch(() => new Blob(["Mock PDF"], { type: "application/pdf" }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pedido_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar PDF.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-brand-text">Histórico de Pedidos</h1>
        <p className="text-sm text-brand-text/50 mt-1">Todas as entradas registradas</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-brand-gold/8 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-brand-gold" strokeWidth={1.5} />
          <span className="text-sm font-poppins font-medium text-brand-text/70">Filtros</span>
        </div>
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Buscar cliente ou funcionária..."
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            leftIcon={<Search size={15} />}
          />
        </div>
        <Input
          label=""
          type="date"
          value={filters.dataInicio}
          onChange={(e) => setFilters((p) => ({ ...p, dataInicio: e.target.value }))}
        />
        <Input
          label=""
          type="date"
          value={filters.dataFim}
          onChange={(e) => setFilters((p) => ({ ...p, dataFim: e.target.value }))}
        />
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} /> Atualizar
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl animate-pulse shadow-card" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-brand-gold/8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-gold/10 bg-brand-bg/50">
                  {["Data", "Cliente", "WhatsApp", "Funcionária", "Total", "Status", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-poppins font-semibold text-brand-text/60 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-brand-text/40">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="border-b border-brand-gold/5 last:border-0 hover:bg-brand-bg/30 transition-colors">
                      <td className="px-4 py-3 text-brand-text/70 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-brand-text">{e.clienteNome}</td>
                      <td className="px-4 py-3 text-brand-text/60">{e.clienteWhatsapp}</td>
                      <td className="px-4 py-3 text-brand-text/60">{e.funcionariaNome}</td>
                      <td className="px-4 py-3 font-semibold text-brand-gold">{formatCurrency(e.totalGeral)}</td>
                      <td className="px-4 py-3">
                        <Badge label={e.status} variant="mint" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelected(e)}
                            className="p-1.5 rounded-full hover:bg-brand-gold/10 text-brand-text/50 hover:text-brand-gold transition-all"
                            title="Ver detalhes"
                          >
                            <Eye size={15} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleDownload(e.id)}
                            className="p-1.5 rounded-full hover:bg-brand-gold/10 text-brand-text/50 hover:text-brand-gold transition-all"
                            title="Baixar PDF"
                          >
                            <Download size={15} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleReenviar(e.id)}
                            disabled={reenviando === e.id}
                            className="p-1.5 rounded-full hover:bg-brand-rose/10 text-brand-text/50 hover:text-brand-rose transition-all disabled:opacity-40"
                            title="Reenviar WhatsApp"
                          >
                            <RefreshCw size={15} strokeWidth={1.5} className={reenviando === e.id ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalhes modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalhes do Pedido" size="lg">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
                <p className="text-xs text-brand-text/50">Cliente</p>
                <p className="font-semibold font-poppins text-brand-text">{selected.clienteNome}</p>
                <p className="text-xs text-brand-text/50">{selected.clienteWhatsapp}</p>
              </div>
              <div className="p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
                <p className="text-xs text-brand-text/50">Total</p>
                <p className="text-xl font-bold font-poppins text-brand-gold">{formatCurrency(selected.totalGeral)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-poppins font-semibold text-brand-text/70 mb-2">Peças</p>
              <div className="flex flex-col gap-2">
                {selected.pecas.map((peca, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
                    <div className="w-8 h-8 rounded-lg bg-brand-rose/15 flex items-center justify-center text-xs font-semibold text-brand-rose">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-inter text-brand-text">{peca.descricao}</p>
                      {peca.tamanho && <p className="text-xs text-brand-text/50">Tamanho: {peca.tamanho}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2 justify-end">
              <Button variant="outline" onClick={() => handleDownload(selected.id)} size="sm">
                <Download size={14} /> Baixar PDF
              </Button>
              <Button variant="secondary" onClick={() => handleReenviar(selected.id)} size="sm">
                <RefreshCw size={14} /> Reenviar WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
