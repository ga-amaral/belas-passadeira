import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const db = getDb();

  try {
    const { data: rawOrders, error } = await db
      .from("orders")
      .select("id, client_id, employee_id, total_amount, volumes_json, avulsos, status, pdf_path, created_at, clients:client_id(id, name, whatsapp), users:employee_id(id, name)")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !rawOrders) {
      // Fallback para o RPC clássico se disponível
      const { data: rpcData } = await db.rpc("get_dashboard_resumo");
      const d = (rpcData as Record<string, unknown>) || {};
      return NextResponse.json({
        pedidosHoje: Number(d.pedidosHoje ?? 0),
        pedidosSemana: Number(d.pedidosSemana ?? 0),
        pedidosMes: Number(d.pedidosMes ?? 0),
        totalHoje: Number(d.totalHoje ?? 0),
        totalSemana: Number(d.totalSemana ?? 0),
        totalMes: Number(d.totalMes ?? 0),
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    let totalHoje = 0, pedidosHoje = 0;
    let totalOntem = 0, pedidosOntem = 0;
    let totalSemana = 0, pedidosSemana = 0;
    let totalMes = 0, pedidosMes = 0;
    let totalMesAnterior = 0, pedidosMesAnterior = 0;
    let totalGeralReceita = 0;

    let receitaVolumes = 0, receitaAvulsos = 0;
    let qtdVolumes = 0, qtdAvulsos = 0;

    const clientMap = new Map<string | number, { id: string | number; nome: string; whatsapp: string; pedidos: number; total: number }>();
    const funcMap = new Map<string | number, { id: string | number; nome: string; pedidos: number; total: number }>();
    const diasMap = new Map<string, { date: string; fullDate: string; diaSemana: string; total: number; pedidos: number }>();
    const uniqueClients = new Set<string | number>();

    const diasSemanaNomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    // Preenche os últimos 14 dias para o gráfico contínuo
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      diasMap.set(key, {
        date: `${dia}/${mes}`,
        fullDate: key,
        diaSemana: diasSemanaNomes[d.getDay()],
        total: 0,
        pedidos: 0,
      });
    }

    const pedidosRecentes: Array<{
      id: string | number;
      clienteId?: string | number;
      clienteNome: string;
      clienteWhatsapp: string;
      funcionariaNome: string;
      totalGeral: number;
      status: string;
      volumesQtd: number;
      volumesDesc: string[];
      avulsosQtd: number;
      createdAt: string;
      pdfUrl?: string | null;
    }> = [];

    for (const o of rawOrders) {
      const t = new Date(o.created_at).getTime();
      const val = Number(o.total_amount || 0);
      const dateKey = String(o.created_at).split("T")[0];
      totalGeralReceita += val;

      if (t >= startOfToday) {
        pedidosHoje++;
        totalHoje += val;
      } else if (t >= startOfYesterday && t < startOfToday) {
        pedidosOntem++;
        totalOntem += val;
      }

      if (t >= startOfWeek) {
        pedidosSemana++;
        totalSemana += val;
      }

      if (t >= startOfMonth) {
        pedidosMes++;
        totalMes += val;
      } else if (t >= startOfLastMonth && t < startOfMonth) {
        pedidosMesAnterior++;
        totalMesAnterior += val;
      }

      if (diasMap.has(dateKey)) {
        const p = diasMap.get(dateKey)!;
        p.total += val;
        p.pedidos += 1;
      }

      // Parsing de volumes
      let parsedVolumes: Array<{ preco?: number; quantidade?: number; nome?: string }> = [];
      try {
        parsedVolumes = typeof o.volumes_json === "string" ? JSON.parse(o.volumes_json) : (o.volumes_json || []);
      } catch {
        parsedVolumes = [];
      }

      let volSubtotal = 0;
      let volCount = 0;
      const volNames: string[] = [];
      for (const v of parsedVolumes) {
        const q = Number(v.quantidade) || 1;
        volSubtotal += (Number(v.preco) || 0) * q;
        volCount += q;
        if (v.nome) volNames.push(`${q}x ${v.nome}`);
      }
      receitaVolumes += volSubtotal;
      qtdVolumes += volCount;

      const avCount = Number(o.avulsos || 0);
      qtdAvulsos += avCount;
      const avSubtotal = Math.max(0, val - volSubtotal);
      receitaAvulsos += avSubtotal;

      const client = (Array.isArray(o.clients) ? o.clients[0] : o.clients) as unknown as Record<string, unknown> | null;
      const user = (Array.isArray(o.users) ? o.users[0] : o.users) as unknown as Record<string, unknown> | null;

      if (client?.name) {
        const cId = (client.id || client.name) as string | number;
        uniqueClients.add(cId);
        const cData = clientMap.get(cId) || {
          id: cId,
          nome: String(client.name),
          whatsapp: String(client.whatsapp || ""),
          pedidos: 0,
          total: 0,
        };
        cData.pedidos++;
        cData.total += val;
        clientMap.set(cId, cData);
      }

      if (user?.name) {
        const uId = (user.id || user.name) as string | number;
        const uData = funcMap.get(uId) || {
          id: uId,
          nome: String(user.name),
          pedidos: 0,
          total: 0,
        };
        uData.pedidos++;
        uData.total += val;
        funcMap.set(uId, uData);
      }

      if (pedidosRecentes.length < 15) {
        pedidosRecentes.push({
          id: o.id,
          clienteId: client?.id as string | number | undefined,
          clienteNome: String(client?.name || "Cliente"),
          clienteWhatsapp: String(client?.whatsapp || ""),
          funcionariaNome: String(user?.name || "Funcionária"),
          totalGeral: val,
          status: String(o.status || "recebido"),
          volumesQtd: volCount,
          volumesDesc: volNames,
          avulsosQtd: avCount,
          createdAt: String(o.created_at),
          pdfUrl: o.pdf_path ? String(o.pdf_path) : null,
        });
      }
    }

    const ticketMedioHoje = pedidosHoje > 0 ? Number((totalHoje / pedidosHoje).toFixed(2)) : 0;
    const ticketMedioSemana = pedidosSemana > 0 ? Number((totalSemana / pedidosSemana).toFixed(2)) : 0;
    const ticketMedioMes = pedidosMes > 0 ? Number((totalMes / pedidosMes).toFixed(2)) : 0;
    const ticketMedioGeral = rawOrders.length > 0 ? Number((totalGeralReceita / rawOrders.length).toFixed(2)) : 0;

    const variacaoHojeOntem = totalOntem > 0
      ? Number((((totalHoje - totalOntem) / totalOntem) * 100).toFixed(1))
      : (totalHoje > 0 ? 100 : 0);

    const variacaoMesAnterior = totalMesAnterior > 0
      ? Number((((totalMes - totalMesAnterior) / totalMesAnterior) * 100).toFixed(1))
      : (totalMes > 0 ? 100 : 0);

    const topFuncionarias = Array.from(funcMap.values())
      .map((f) => ({
        ...f,
        ticketMedio: f.pedidos > 0 ? Number((f.total / f.pedidos).toFixed(2)) : 0,
        percentual: totalGeralReceita > 0 ? Number(((f.total / totalGeralReceita) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const topClientes = Array.from(clientMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return NextResponse.json({
      pedidosHoje,
      pedidosSemana,
      pedidosMes,
      totalHoje,
      totalSemana,
      totalMes,

      ticketMedioHoje,
      ticketMedioSemana,
      ticketMedioMes,
      ticketMedioGeral,

      pedidosOntem,
      totalOntem,
      variacaoHojeOntem,

      pedidosMesAnterior,
      totalMesAnterior,
      variacaoMesAnterior,

      totalClientesAtivos: uniqueClients.size,
      totalPecasProcessadas: qtdVolumes + qtdAvulsos,

      receitaVolumes,
      receitaAvulsos,
      qtdVolumes,
      qtdAvulsos,

      graficoFaturamento: Array.from(diasMap.values()),
      topFuncionarias,
      topClientes,
      pedidosRecentes,
    });
  } catch (err) {
    console.error("[Dashboard] Erro ao consolidar resumo:", err);
    return NextResponse.json({ message: "Erro ao gerar indicadores do dashboard" }, { status: 500 });
  }
}
