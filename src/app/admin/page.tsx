"use client";

import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  FileText,
  PieChart,
  Search,
  Sparkles,
  Shirt,
  MessageCircle,
} from "lucide-react";
import { DashboardResumo, DashboardDailyRevenue } from "@/types";
import { getDashboardResumo } from "@/lib/api";
import { mockDashboard } from "@/lib/mocks";
import { formatCurrency, formatDate } from "@/lib/masks";
import { SkeletonCard } from "@/components/ui/SkeletonRow";
import toast from "react-hot-toast";

type PeriodoFiltro = "hoje" | "semana" | "mes" | "geral";

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [chartMetric, setChartMetric] = useState<"faturamento" | "pedidos">("faturamento");
  const [searchTransacoes, setSearchTransacoes] = useState("");
  const [hoveredBar, setHoveredBar] = useState<DashboardDailyRevenue | null>(null);

  async function carregarDados(silencioso = false) {
    if (!silencioso) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await getDashboardResumo().catch(() => mockDashboard);
      setData(res);
    } catch {
      setData(mockDashboard);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // Dados consolidados de acordo com o filtro selecionado
  const metricasPeriodo = useMemo(() => {
    if (!data) return { faturamento: 0, pedidos: 0, ticketMedio: 0, variacao: null, label: "" };

    switch (periodo) {
      case "hoje":
        return {
          faturamento: data.totalHoje ?? 0,
          pedidos: data.pedidosHoje ?? 0,
          ticketMedio: data.ticketMedioHoje ?? (data.pedidosHoje ? data.totalHoje / data.pedidosHoje : 0),
          variacao: data.variacaoHojeOntem ?? null,
          label: "Hoje",
          comparativoLabel: "vs. ontem",
        };
      case "semana":
        return {
          faturamento: data.totalSemana ?? 0,
          pedidos: data.pedidosSemana ?? 0,
          ticketMedio: data.ticketMedioSemana ?? (data.pedidosSemana ? data.totalSemana / data.pedidosSemana : 0),
          variacao: null,
          label: "Esta Semana",
          comparativoLabel: "",
        };
      case "mes":
        return {
          faturamento: data.totalMes ?? 0,
          pedidos: data.pedidosMes ?? 0,
          ticketMedio: data.ticketMedioMes ?? (data.pedidosMes ? data.totalMes / data.pedidosMes : 0),
          variacao: data.variacaoMesAnterior ?? null,
          label: "Este Mês",
          comparativoLabel: "vs. mês anterior",
        };
      case "geral":
      default: {
        const totalTodos = (data.pedidosRecentes || []).reduce((acc, p) => acc + p.totalGeral, 0) || data.totalMes;
        const pedidosTodos = (data.pedidosRecentes || []).length || data.pedidosMes;
        return {
          faturamento: totalTodos,
          pedidos: pedidosTodos,
          ticketMedio: pedidosTodos ? totalTodos / pedidosTodos : 0,
          variacao: null,
          label: "Todo o Histórico",
          comparativoLabel: "",
        };
      }
    }
  }, [data, periodo]);

  // Transações filtradas pelo input de busca
  const transacoesFiltradas = useMemo(() => {
    const list = data?.pedidosRecentes || [];
    if (!searchTransacoes.trim()) return list;
    const term = searchTransacoes.toLowerCase();
    return list.filter(
      (p) =>
        p.clienteNome.toLowerCase().includes(term) ||
        p.funcionariaNome.toLowerCase().includes(term) ||
        String(p.id).includes(term)
    );
  }, [data?.pedidosRecentes, searchTransacoes]);

  // Cálculo da distribuição de mix de receita
  const mixReceita = useMemo(() => {
    const recVol = data?.receitaVolumes ?? 0;
    const recAvu = data?.receitaAvulsos ?? 0;
    const soma = recVol + recAvu;
    const percVol = soma > 0 ? Math.round((recVol / soma) * 100) : 50;
    const percAvu = soma > 0 ? 100 - percVol : 50;
    return { recVol, recAvu, soma, percVol, percAvu };
  }, [data]);

  // Gráfico de Faturamento Diário
  const graficoData = useMemo(() => data?.graficoFaturamento || [], [data?.graficoFaturamento]);
  const maxValGrafico = useMemo(() => {
    if (graficoData.length === 0) return 100;
    const vals = graficoData.map((d) => (chartMetric === "faturamento" ? d.total : d.pedidos));
    return Math.max(...vals, 1);
  }, [graficoData, chartMetric]);

  const mediaDiaria = useMemo(() => {
    if (graficoData.length === 0) return 0;
    const soma = graficoData.reduce((acc, d) => acc + (chartMetric === "faturamento" ? d.total : d.pedidos), 0);
    return soma / graficoData.length;
  }, [graficoData, chartMetric]);

  // Exportar relatório em CSV
  function handleExportarCSV() {
    const pedidos = data?.pedidosRecentes || [];
    if (pedidos.length === 0) {
      toast.error("Nenhum dado disponível para exportação no momento.");
      return;
    }

    const headers = ["ID", "Data e Hora", "Cliente", "WhatsApp", "Funcionaria", "Qtd Volumes", "Qtd Avulsos", "Valor Total (R$)", "Status"];
    const rows = pedidos.map((p) => [
      p.id,
      p.createdAt ? formatDate(p.createdAt) : "",
      `"${(p.clienteNome || "").replace(/"/g, '""')}"`,
      `"${p.clienteWhatsapp || ""}"`,
      `"${(p.funcionariaNome || "").replace(/"/g, '""')}"`,
      p.volumesQtd,
      p.avulsosQtd,
      p.totalGeral.toFixed(2),
      p.status,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-financeiro-belas-passadeiras-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório financeiro exportado com sucesso!");
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Header com Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-poppins font-bold text-brand-text">
              Painel Financeiro & Operacional
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold-dark">
              <Sparkles size={12} /> Admin
            </span>
          </div>
          <p className="text-sm text-brand-text/60 mt-1 font-inter">
            Acompanhe o faturamento, ticket médio, fluxo de peças e produtividade da equipe.
          </p>
        </div>

        {/* Filtro de Período e Botões Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white border border-brand-gold/15 rounded-xl p-1 shadow-sm flex items-center gap-1">
            {(
              [
                { key: "hoje", label: "Hoje" },
                { key: "semana", label: "Semana" },
                { key: "mes", label: "Mês" },
                { key: "geral", label: "Geral" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPeriodo(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-poppins font-medium transition-all ${
                  periodo === tab.key
                    ? "bg-brand-gold text-white shadow-gold"
                    : "text-brand-text/60 hover:text-brand-text hover:bg-black/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => carregarDados(true)}
            disabled={refreshing || loading}
            title="Recarregar dados"
            className="p-2.5 rounded-xl bg-white border border-brand-gold/15 text-brand-text/70 hover:text-brand-gold hover:border-brand-gold/40 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleExportarCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-brand-gold/20 text-brand-text/80 hover:text-brand-gold-dark hover:border-brand-gold font-poppins text-xs font-medium shadow-sm transition-all"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Card Hero / Faturamento em Destaque */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-amber-50/40 p-6 md:p-8 border border-brand-gold/20 shadow-card">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-gold font-poppins">
                  Faturamento Consolidado ({metricasPeriodo.label})
                </span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-extrabold text-brand-text">
                    {formatCurrency(metricasPeriodo.faturamento)}
                  </h2>
                  {metricasPeriodo.variacao !== null && (
                    <div
                      className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-poppins font-semibold ${
                        metricasPeriodo.variacao >= 0
                          ? "bg-brand-mint/15 text-brand-mint"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {metricasPeriodo.variacao >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span>{Math.abs(metricasPeriodo.variacao)}%</span>
                      <span className="text-[10px] font-normal opacity-80 ml-0.5">{metricasPeriodo.comparativoLabel}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-brand-text/50 font-inter mt-1">
                  Receita bruta acumulada proveniente de pedidos concluídos e em processamento.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 border-t lg:border-t-0 lg:border-l border-brand-gold/15 pt-4 lg:pt-0 lg:pl-8">
                <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-brand-gold/10">
                  <p className="text-[11px] text-brand-text/50 font-inter">Ticket Médio</p>
                  <p className="text-lg sm:text-xl font-bold font-poppins text-brand-text mt-0.5">
                    {formatCurrency(metricasPeriodo.ticketMedio)}
                  </p>
                  <span className="text-[10px] text-brand-gold font-inter">por pedido</span>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-brand-gold/10">
                  <p className="text-[11px] text-brand-text/50 font-inter">Total de Pedidos</p>
                  <p className="text-lg sm:text-xl font-bold font-poppins text-brand-text mt-0.5">
                    {metricasPeriodo.pedidos}
                  </p>
                  <span className="text-[10px] text-brand-mint font-inter">entradas</span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white/80 backdrop-blur rounded-xl p-3 border border-brand-gold/10">
                  <p className="text-[11px] text-brand-text/50 font-inter">Clientes Ativos</p>
                  <p className="text-lg sm:text-xl font-bold font-poppins text-brand-text mt-0.5">
                    {data?.totalClientesAtivos ?? 0}
                  </p>
                  <span className="text-[10px] text-brand-text/40 font-inter">cadastrados</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Receita Hoje */}
            <div className="bg-white rounded-2xl p-5 shadow-card border border-brand-gold/10 flex items-start gap-4 hover:shadow-gold transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <DollarSign size={24} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-brand-text/50 font-inter font-medium">Hoje</p>
                <p className="text-2xl font-poppins font-bold text-brand-text mt-0.5 truncate">
                  {formatCurrency(data?.totalHoje ?? 0)}
                </p>
                <p className="text-xs text-brand-text/60 mt-1 font-inter">
                  <span className="font-semibold text-brand-text">{data?.pedidosHoje ?? 0}</span> pedidos registrados
                </p>
              </div>
            </div>

            {/* Card 2: Receita Semanal */}
            <div className="bg-white rounded-2xl p-5 shadow-card border border-brand-gold/10 flex items-start gap-4 hover:shadow-gold transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Calendar size={24} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-brand-text/50 font-inter font-medium">Esta Semana</p>
                <p className="text-2xl font-poppins font-bold text-brand-text mt-0.5 truncate">
                  {formatCurrency(data?.totalSemana ?? 0)}
                </p>
                <p className="text-xs text-brand-text/60 mt-1 font-inter">
                  <span className="font-semibold text-brand-text">{data?.pedidosSemana ?? 0}</span> pedidos registrados
                </p>
              </div>
            </div>

            {/* Card 3: Receita Mensal */}
            <div className="bg-white rounded-2xl p-5 shadow-card border border-brand-gold/10 flex items-start gap-4 hover:shadow-gold transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp size={24} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-brand-text/50 font-inter font-medium">Este Mês</p>
                <p className="text-2xl font-poppins font-bold text-brand-text mt-0.5 truncate">
                  {formatCurrency(data?.totalMes ?? 0)}
                </p>
                <p className="text-xs text-brand-text/60 mt-1 font-inter">
                  <span className="font-semibold text-brand-text">{data?.pedidosMes ?? 0}</span> pedidos registrados
                </p>
              </div>
            </div>

            {/* Card 4: Volume & Peças */}
            <div className="bg-white rounded-2xl p-5 shadow-card border border-brand-gold/10 flex items-start gap-4 hover:shadow-gold transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Shirt size={24} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-brand-text/50 font-inter font-medium">Itens Processados</p>
                <p className="text-2xl font-poppins font-bold text-brand-text mt-0.5 truncate">
                  {(data?.qtdVolumes ?? 0) + (data?.qtdAvulsos ?? 0)}
                </p>
                <p className="text-xs text-brand-text/60 mt-1 font-inter">
                  {data?.qtdVolumes ?? 0} volumes • {data?.qtdAvulsos ?? 0} avulsos
                </p>
              </div>
            </div>
          </div>

          {/* Seção Central: Gráfico de Linha do Tempo & Mix de Receita */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Histórico (2 Colunas) */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-brand-gold/10 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-base font-poppins font-bold text-brand-text">
                      Evolução Diária de Movimentação
                    </h3>
                    <p className="text-xs text-brand-text/50 font-inter mt-0.5">
                      Visualização dos últimos 14 dias com picos de atendimento
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-brand-bg rounded-lg p-1 border border-brand-gold/10 self-start sm:self-auto">
                    <button
                      onClick={() => setChartMetric("faturamento")}
                      className={`px-2.5 py-1 rounded-md text-xs font-poppins font-medium transition-all ${
                        chartMetric === "faturamento"
                          ? "bg-white text-brand-gold shadow-sm font-semibold"
                          : "text-brand-text/60 hover:text-brand-text"
                      }`}
                    >
                      Receita (R$)
                    </button>
                    <button
                      onClick={() => setChartMetric("pedidos")}
                      className={`px-2.5 py-1 rounded-md text-xs font-poppins font-medium transition-all ${
                        chartMetric === "pedidos"
                          ? "bg-white text-brand-gold shadow-sm font-semibold"
                          : "text-brand-text/60 hover:text-brand-text"
                      }`}
                    >
                      Pedidos (Qtd)
                    </button>
                  </div>
                </div>

                {/* Banner de Média */}
                <div className="flex items-center gap-4 text-xs font-inter text-brand-text/60 mb-4 pb-3 border-b border-brand-gold/10">
                  <span>
                    Média diária no período:{" "}
                    <strong className="text-brand-text font-poppins">
                      {chartMetric === "faturamento" ? formatCurrency(mediaDiaria) : `${mediaDiaria.toFixed(1)} pedidos`}
                    </strong>
                  </span>
                  {hoveredBar && (
                    <span className="ml-auto text-brand-gold font-poppins font-medium animate-fade-in">
                      {hoveredBar.diaSemana}, {hoveredBar.date}:{" "}
                      <strong>{formatCurrency(hoveredBar.total)}</strong> ({hoveredBar.pedidos} ped.)
                    </span>
                  )}
                </div>

                {/* Canvas de Barras SVG */}
                <div className="h-48 w-full flex items-end gap-2 pt-4 px-1">
                  {graficoData.map((d, index) => {
                    const val = chartMetric === "faturamento" ? d.total : d.pedidos;
                    const heightPercent = maxValGrafico > 0 ? Math.max((val / maxValGrafico) * 100, 4) : 4;
                    const isHovered = hoveredBar?.date === d.date;

                    return (
                      <div
                        key={index}
                        onMouseEnter={() => setHoveredBar(d)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                      >
                        {/* Tooltip no Hover */}
                        <div
                          className={`text-[10px] font-poppins font-semibold text-brand-text transition-opacity mb-1 ${
                            isHovered || val > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {chartMetric === "faturamento" ? (val > 0 ? `R$${val.toFixed(0)}` : "") : (val > 0 ? val : "")}
                        </div>

                        {/* Barra */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                            val > 0
                              ? isHovered
                                ? "bg-brand-gold shadow-gold-md"
                                : "bg-gradient-to-t from-brand-gold/80 to-brand-gold hover:bg-brand-gold"
                              : "bg-black/5 hover:bg-black/10"
                          }`}
                        />

                        {/* Rótulo Data */}
                        <span
                          className={`text-[10px] font-inter mt-2 transition-colors ${
                            isHovered ? "text-brand-gold font-bold" : "text-brand-text/40"
                          }`}
                        >
                          {d.date.split("/")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-brand-text/40 pt-3 border-t border-brand-gold/10 font-inter">
                <span>Últimos 14 dias</span>
                <span>Passe o cursor nas barras para ver detalhes</span>
              </div>
            </div>

            {/* Mix de Receita (1 Coluna) */}
            <div className="bg-white rounded-2xl p-6 shadow-card border border-brand-gold/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-poppins font-bold text-brand-text">Mix de Receita</h3>
                  <div className="p-1.5 rounded-lg bg-brand-gold/10 text-brand-gold">
                    <PieChart size={18} />
                  </div>
                </div>

                <p className="text-xs text-brand-text/60 font-inter mb-5">
                  Proporção de vendas entre pacotes volumétricos (50L, 100L) e peças avulsas.
                </p>

                {/* Barra de Progresso Composta */}
                <div className="h-4 w-full rounded-full bg-brand-bg overflow-hidden flex shadow-inner mb-4">
                  <div
                    style={{ width: `${mixReceita.percVol}%` }}
                    className="bg-brand-gold transition-all duration-500 relative group"
                    title={`Volumes: ${mixReceita.percVol}%`}
                  />
                  <div
                    style={{ width: `${mixReceita.percAvu}%` }}
                    className="bg-brand-rose transition-all duration-500"
                    title={`Avulsos: ${mixReceita.percAvu}%`}
                  />
                </div>

                {/* Legendas dos Itens */}
                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-brand-gold" />
                      <div>
                        <p className="text-xs font-semibold font-poppins text-brand-text">Pacotes / Volumes</p>
                        <p className="text-[11px] text-brand-text/50 font-inter">
                          {data?.qtdVolumes ?? 0} pacotes passados
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-poppins text-brand-text">
                        {formatCurrency(mixReceita.recVol)}
                      </p>
                      <p className="text-[10px] text-brand-gold font-semibold">{mixReceita.percVol}%</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-brand-rose" />
                      <div>
                        <p className="text-xs font-semibold font-poppins text-brand-text">Peças Avulsas</p>
                        <p className="text-[11px] text-brand-text/50 font-inter">
                          {data?.qtdAvulsos ?? 0} peças passadas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-poppins text-brand-text">
                        {formatCurrency(mixReceita.recAvu)}
                      </p>
                      <p className="text-[10px] text-brand-rose font-semibold">{mixReceita.percAvu}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-brand-gold/10 flex items-center justify-between text-xs text-brand-text/60 font-inter">
                <span>Total Consolidado</span>
                <span className="font-bold font-poppins text-brand-text">
                  {formatCurrency(mixReceita.soma)}
                </span>
              </div>
            </div>
          </div>

          {/* Rankings: Produtividade por Funcionária e Top Clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produtividade por Funcionária */}
            <div className="bg-white rounded-2xl p-6 shadow-card border border-brand-gold/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-poppins font-bold text-brand-text">
                      Produtividade por Funcionária
                    </h3>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Users size={18} />
                  </div>
                </div>
                <p className="text-xs text-brand-text/50 font-inter mb-4">
                  Desempenho de atendimento, faturamento gerado e ticket médio por colaboradora.
                </p>

                <div className="flex flex-col gap-3">
                  {(data?.topFuncionarias || []).length === 0 ? (
                    <p className="text-xs text-brand-text/40 py-6 text-center">Nenhum registro no período.</p>
                  ) : (
                    data?.topFuncionarias?.map((f, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-brand-gold/10 hover:border-brand-gold/30 bg-brand-bg/40 transition-all flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-gold/15 text-brand-gold font-bold font-poppins text-xs flex items-center justify-center">
                              {f.nome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold font-poppins text-brand-text">{f.nome}</p>
                              <p className="text-[10px] text-brand-text/50 font-inter">
                                {f.pedidos} pedido{f.pedidos !== 1 ? "s" : ""} • TM: {formatCurrency(f.ticketMedio)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold font-poppins text-brand-text">{formatCurrency(f.total)}</p>
                            <span className="text-[10px] text-brand-mint font-semibold">{f.percentual}% da receita</span>
                          </div>
                        </div>

                        {/* Barra de progresso da colaboradora */}
                        <div className="w-full bg-black/5 rounded-full h-1.5 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(f.percentual, 100)}%` }}
                            className="bg-brand-gold h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Top Clientes Mais Recorrentes */}
            <div className="bg-white rounded-2xl p-6 shadow-card border border-brand-gold/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-poppins font-bold text-brand-text">Clientes Mais Recorrentes</h3>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                    <Award size={18} />
                  </div>
                </div>
                <p className="text-xs text-brand-text/50 font-inter mb-4">
                  Principais clientes com maior volume financeiro e fidelidade.
                </p>

                <div className="flex flex-col gap-2.5">
                  {(data?.topClientes || []).length === 0 ? (
                    <p className="text-xs text-brand-text/40 py-6 text-center">Nenhum cliente registrado ainda.</p>
                  ) : (
                    data?.topClientes?.map((c, i) => {
                      const medalhas = ["🥇", "🥈", "🥉"];
                      const phoneClean = c.whatsapp.replace(/\D/g, "");

                      return (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-brand-gold/10 hover:border-brand-gold/30 bg-brand-bg/40 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-base shrink-0">{medalhas[i] || `#${i + 1}`}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold font-poppins text-brand-text truncate">{c.nome}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-brand-text/50 font-inter">{c.whatsapp || "Sem telefone"}</span>
                                {phoneClean && (
                                  <a
                                    href={`https://wa.me/55${phoneClean}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-brand-mint hover:text-brand-mint-light transition-colors"
                                    title="Abrir WhatsApp"
                                  >
                                    <MessageCircle size={13} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold font-poppins text-brand-text">{formatCurrency(c.total)}</p>
                            <span className="text-[10px] text-brand-gold font-medium">
                              {c.pedidos} pedido{c.pedidos !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Extrato de Transações Recentes */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-brand-gold/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-poppins font-bold text-brand-text">Últimas Transações Financeiras</h3>
                <p className="text-xs text-brand-text/50 font-inter mt-0.5">
                  Registro detalhado das entradas recentes com comprovantes
                </p>
              </div>

              {/* Busca rápida */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40" />
                <input
                  type="text"
                  value={searchTransacoes}
                  onChange={(e) => setSearchTransacoes(e.target.value)}
                  placeholder="Buscar cliente ou colaboradora..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-brand-gold/20 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 font-inter"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-gold/10 text-[11px] font-semibold text-brand-text/50 uppercase font-poppins tracking-wider">
                    <th className="pb-3 pl-2">ID</th>
                    <th className="pb-3">Data</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Atendente</th>
                    <th className="pb-3">Itens</th>
                    <th className="pb-3 text-right">Valor</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right pr-2">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gold/8 text-xs font-inter">
                  {transacoesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-brand-text/40 font-inter">
                        Nenhum pedido encontrado.
                      </td>
                    </tr>
                  ) : (
                    transacoesFiltradas.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-brand-bg/60 transition-colors">
                        <td className="py-3 pl-2 font-mono text-brand-text/60 font-medium">#{pedido.id}</td>
                        <td className="py-3 text-brand-text/70">{formatDate(pedido.createdAt)}</td>
                        <td className="py-3 font-medium text-brand-text">
                          {pedido.clienteNome}
                          {pedido.clienteWhatsapp && (
                            <span className="block text-[10px] text-brand-text/40 font-normal">
                              {pedido.clienteWhatsapp}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-brand-text/70">{pedido.funcionariaNome}</td>
                        <td className="py-3 text-brand-text/60">
                          {pedido.volumesQtd > 0 && <span>{pedido.volumesQtd} vol. </span>}
                          {pedido.avulsosQtd > 0 && <span>{pedido.avulsosQtd} avulsos</span>}
                          {pedido.volumesQtd === 0 && pedido.avulsosQtd === 0 && <span>—</span>}
                        </td>
                        <td className="py-3 text-right font-bold font-poppins text-brand-gold">
                          {formatCurrency(pedido.totalGeral)}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold font-poppins ${
                              pedido.status === "concluido" || pedido.status === "concluído"
                                ? "bg-brand-mint/15 text-brand-mint"
                                : "bg-brand-gold/15 text-brand-gold-dark"
                            }`}
                          >
                            {pedido.status}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          {pedido.pdfUrl ? (
                            <a
                              href={pedido.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-gold hover:text-brand-gold-dark underline"
                            >
                              <FileText size={13} />
                              PDF
                            </a>
                          ) : (
                            <span className="text-brand-text/30 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
