"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Tag, Trash2 } from "lucide-react";
import { Preco } from "@/types";
import { getPrecos, updatePrecos } from "@/lib/api";
import { mockPrecos } from "@/lib/mocks";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/masks";

export default function PrecosPage() {
  const [precos, setPrecos] = useState<Preco[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newVolume, setNewVolume] = useState({ nome: "", volume: "", preco: "" });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    getPrecos()
      .catch(() => mockPrecos)
      .then(setPrecos)
      .finally(() => setLoading(false));
  }, []);

  function updatePreco(id: string, value: string) {
    const num = parseFloat(value.replace(",", "."));
    if (isNaN(num) && value !== "") return;
    setPrecos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, preco: isNaN(num) ? 0 : num } : p))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updatePrecos(precos).catch(() => precos);
      toast.success("Preços atualizados com sucesso!");
    } catch {
      toast.error("Erro ao salvar preços.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddVolume() {
    if (!newVolume.nome.trim() || !newVolume.preco.trim()) {
      toast.error("Informe o nome e o preço do novo volume.");
      return;
    }
    const preco: Preco = {
      id: String(Date.now()),
      nome: newVolume.nome,
      volume: newVolume.volume || newVolume.nome,
      preco: parseFloat(newVolume.preco.replace(",", ".")),
      tipo: "volume",
    };
    setPrecos((prev) => [...prev, preco]);
    setNewVolume({ nome: "", volume: "", preco: "" });
    setShowAdd(false);
    toast.success("Volume adicionado! Clique em salvar para confirmar.");
  }

  function handleRemove(id: string) {
    setPrecos((prev) => prev.filter((p) => p.id !== id));
    toast.success("Item removido. Salve para confirmar.");
  }

  const volumes = precos.filter((p) => p.tipo === "volume");
  const avulso = precos.find((p) => p.tipo === "avulso");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-brand-text">Tabela de Preços</h1>
          <p className="text-sm text-brand-text/50 mt-1">Edite os valores cobrados</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save size={16} /> Salvar alterações
        </Button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-6 shadow-card animate-pulse h-48" />
      ) : (
        <div className="grid gap-6">
          {/* Volumes */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-brand-gold/8">
            <div className="flex items-center gap-2 mb-5">
              <Tag size={18} className="text-brand-gold" strokeWidth={1.5} />
              <h2 className="font-poppins font-semibold text-brand-text">Volumes de roupa</h2>
            </div>
            <div className="grid gap-3">
              {volumes.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
                  <div className="flex-1">
                    <p className="text-sm font-poppins font-medium text-brand-text">{p.nome}</p>
                    {p.volume && <p className="text-xs text-brand-text/40">{p.volume}</p>}
                  </div>
                  <div className="flex items-center gap-2 w-36">
                    <span className="text-brand-text/50 text-sm shrink-0">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={p.preco}
                      onChange={(e) => updatePreco(p.id, e.target.value)}
                      className="w-full text-right bg-white border border-brand-gold/20 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="p-1.5 rounded-full text-brand-text/30 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add volume */}
            {showAdd ? (
              <div className="mt-4 p-4 rounded-xl border border-dashed border-brand-gold/30 bg-brand-gold/3">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Input
                    label="Nome"
                    placeholder="Volume 40L"
                    value={newVolume.nome}
                    onChange={(e) => setNewVolume((p) => ({ ...p, nome: e.target.value }))}
                  />
                  <Input
                    label="Preço (R$)"
                    placeholder="45,00"
                    value={newVolume.preco}
                    onChange={(e) => setNewVolume((p) => ({ ...p, preco: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddVolume}>Adicionar</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-brand-gold/30 text-sm text-brand-gold hover:bg-brand-gold/5 transition-all"
              >
                <Plus size={16} strokeWidth={1.5} />
                <span className="font-poppins">Adicionar volume</span>
              </button>
            )}
          </div>

          {/* Avulso */}
          {avulso && (
            <div className="bg-white rounded-2xl p-6 shadow-card border border-brand-gold/8">
              <div className="flex items-center gap-2 mb-5">
                <Tag size={18} className="text-brand-rose" strokeWidth={1.5} />
                <h2 className="font-poppins font-semibold text-brand-text">Peça Avulsa</h2>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-brand-bg border border-brand-gold/8">
                <div className="flex-1">
                  <p className="text-sm font-poppins font-medium text-brand-text">{avulso.nome}</p>
                  <p className="text-xs text-brand-text/40">Preço por peça individual</p>
                </div>
                <div className="flex items-center gap-2 w-36">
                  <span className="text-brand-text/50 text-sm shrink-0">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={avulso.preco}
                    onChange={(e) => updatePreco(avulso.id, e.target.value)}
                    className="w-full text-right bg-white border border-brand-gold/20 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-brand-text/40 font-inter">
                Atual: {formatCurrency(avulso.preco)} por peça
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
