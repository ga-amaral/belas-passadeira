"use client";

import { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, Calendar, DollarSign } from "lucide-react";
import { DashboardResumo } from "@/types";
import { getDashboardResumo } from "@/lib/api";
import { mockDashboard } from "@/lib/mocks";
import { formatCurrency } from "@/lib/masks";
import { SkeletonCard } from "@/components/ui/SkeletonRow";

function StatCard({
  label,
  value,
  subvalue,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  subvalue?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-brand-gold/8 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} strokeWidth={1.5} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-brand-text/50 font-inter">{label}</p>
        <p className="text-2xl font-poppins font-bold text-brand-text mt-0.5">{value}</p>
        {subvalue && <p className="text-xs text-brand-mint mt-0.5 font-inter">{subvalue}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardResumo()
      .catch(() => mockDashboard)
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-brand-text">Dashboard</h1>
        <p className="text-sm text-brand-text/50 mt-1 font-inter">Resumo geral das operações</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-poppins font-semibold text-brand-text/60 uppercase tracking-wide mb-3">
              Pedidos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Hoje"
                value={data?.pedidosHoje ?? 0}
                icon={ShoppingBag}
                color="bg-brand-gold"
              />
              <StatCard
                label="Esta semana"
                value={data?.pedidosSemana ?? 0}
                icon={Calendar}
                color="bg-brand-rose"
              />
              <StatCard
                label="Este mês"
                value={data?.pedidosMes ?? 0}
                icon={TrendingUp}
                color="bg-brand-mint"
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-poppins font-semibold text-brand-text/60 uppercase tracking-wide mb-3">
              Faturamento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Receita hoje"
                value={formatCurrency(data?.totalHoje ?? 0)}
                icon={DollarSign}
                color="bg-brand-gold"
              />
              <StatCard
                label="Receita semanal"
                value={formatCurrency(data?.totalSemana ?? 0)}
                icon={DollarSign}
                color="bg-brand-rose"
              />
              <StatCard
                label="Receita mensal"
                value={formatCurrency(data?.totalMes ?? 0)}
                icon={DollarSign}
                color="bg-brand-mint"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
