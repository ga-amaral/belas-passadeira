import { Cliente, DashboardResumo, Entrada, Funcionaria, HistoricoCliente, Preco } from "@/types";

export const mockClientes: Cliente[] = [
  { id: "1", nome: "Maria Silva", whatsapp: "(11) 99999-1234", cpfCnpj: "123.456.789-00", bairro: "Centro", cidade: "São Paulo", estado: "SP" },
  { id: "2", nome: "Ana Oliveira", whatsapp: "(11) 98888-5678", cpfCnpj: "987.654.321-00", bairro: "Jardins", cidade: "São Paulo", estado: "SP" },
  { id: "3", nome: "Joana Mendes", whatsapp: "(11) 97777-9012", bairro: "Moema", cidade: "São Paulo", estado: "SP" },
  { id: "4", nome: "Lúcia Ferreira", whatsapp: "(11) 96666-3456", cidade: "Guarulhos", estado: "SP" },
];

export const mockFuncionarias: Funcionaria[] = [
  { id: "1", name: "Carla Souza", email: "carla@belaspassadeiras.com", ativo: true },
  { id: "2", name: "Fernanda Lima", email: "fernanda@belaspassadeiras.com", ativo: true },
];

export const mockPrecos: Preco[] = [
  { id: "1", nome: "Volume 20L", volume: "20L", preco: 25.0, tipo: "volume" },
  { id: "2", nome: "Volume 30L", volume: "30L", preco: 35.0, tipo: "volume" },
  { id: "3", nome: "Volume 50L", volume: "50L", preco: 55.0, tipo: "volume" },
  { id: "4", nome: "Peça Avulsa", preco: 8.0, tipo: "avulso" },
];

export const mockEntradas: Entrada[] = [
  {
    id: "1",
    clienteId: "1",
    clienteNome: "Maria Silva",
    clienteWhatsapp: "(11) 99999-1234",
    funcionariaId: "1",
    funcionariaNome: "Carla Souza",
    totalGeral: 78.0,
    status: "concluído",
    pecas: [
      { descricao: "Camisa branca masculina" },
      { descricao: "Calça jeans" },
      { descricao: "Lençol casal", tamanho: "Casal" },
    ],
    volumes: [{ precoId: "1", nome: "20L", preco: 25, quantidade: 2 }],
    avulsos: 1,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "2",
    clienteId: "2",
    clienteNome: "Ana Oliveira",
    clienteWhatsapp: "(11) 98888-5678",
    funcionariaId: "2",
    funcionariaNome: "Fernanda Lima",
    totalGeral: 55.0,
    status: "concluído",
    pecas: [{ descricao: "Toalha de banho", tamanho: "Banho" }, { descricao: "Vestido" }],
    volumes: [{ precoId: "3", nome: "50L", preco: 55, quantidade: 1 }],
    avulsos: 0,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const mockDashboard: DashboardResumo = {
  pedidosHoje: 4,
  pedidosSemana: 23,
  pedidosMes: 97,
  totalHoje: 320.0,
  totalSemana: 1840.0,
  totalMes: 7720.0,
  ticketMedioHoje: 80.0,
  ticketMedioSemana: 80.0,
  ticketMedioMes: 79.58,
  ticketMedioGeral: 79.58,
  pedidosOntem: 3,
  totalOntem: 245.0,
  variacaoHojeOntem: 30.6,
  pedidosMesAnterior: 82,
  totalMesAnterior: 6450.0,
  variacaoMesAnterior: 19.7,
  totalClientesAtivos: 42,
  totalPecasProcessadas: 340,
  receitaVolumes: 5800.0,
  receitaAvulsos: 1920.0,
  qtdVolumes: 110,
  qtdAvulsos: 213,
  graficoFaturamento: [
    { date: "11/09", fullDate: "2026-09-11", diaSemana: "Sex", total: 420, pedidos: 5 },
    { date: "12/09", fullDate: "2026-09-12", diaSemana: "Sáb", total: 580, pedidos: 7 },
    { date: "13/09", fullDate: "2026-09-13", diaSemana: "Dom", total: 110, pedidos: 1 },
    { date: "14/09", fullDate: "2026-09-14", diaSemana: "Seg", total: 390, pedidos: 4 },
    { date: "15/09", fullDate: "2026-09-15", diaSemana: "Ter", total: 460, pedidos: 6 },
    { date: "16/09", fullDate: "2026-09-16", diaSemana: "Qua", total: 245, pedidos: 3 },
    { date: "17/09", fullDate: "2026-09-17", diaSemana: "Qui", total: 320, pedidos: 4 },
  ],
  topFuncionarias: [
    { id: "1", nome: "Mariana Silva", pedidos: 45, total: 3580, ticketMedio: 79.55, percentual: 46.4 },
    { id: "2", nome: "Fernanda Lima", pedidos: 38, total: 2980, ticketMedio: 78.42, percentual: 38.6 },
    { id: "3", nome: "Carla Mendes", pedidos: 14, total: 1160, ticketMedio: 82.85, percentual: 15.0 },
  ],
  topClientes: [
    { id: "1", nome: "Larissa Pacheco", whatsapp: "(14) 98804-4079", pedidos: 8, total: 720 },
    { id: "2", nome: "Gabriel Amaral", whatsapp: "(16) 99742-9623", pedidos: 6, total: 540 },
    { id: "3", nome: "Carlos Eduardo", whatsapp: "(11) 98765-4321", pedidos: 5, total: 480 },
    { id: "4", nome: "Beatriz Santos", whatsapp: "(11) 97654-3210", pedidos: 4, total: 390 },
    { id: "5", nome: "Juliana Rocha", whatsapp: "(11) 96543-2109", pedidos: 4, total: 350 },
  ],
  pedidosRecentes: [
    {
      id: 10,
      clienteNome: "Gabriel",
      clienteWhatsapp: "(16) 99742-9623",
      funcionariaNome: "Funcionário Temp",
      totalGeral: 18,
      status: "recebido",
      volumesQtd: 0,
      volumesDesc: [],
      avulsosQtd: 2,
      createdAt: new Date().toISOString(),
      pdfUrl: null,
    },
    {
      id: 9,
      clienteNome: "Gabriel",
      clienteWhatsapp: "(16) 99742-9623",
      funcionariaNome: "Funcionário Temp",
      totalGeral: 28,
      status: "recebido",
      volumesQtd: 1,
      volumesDesc: ["Volume 20L"],
      avulsosQtd: 0,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      pdfUrl: null,
    },
  ],
};

export const mockHistorico: HistoricoCliente = {
  pedidos: [
    { id: "1", data: new Date(Date.now() - 86400000).toISOString(), total: 78.0, pecas: [] },
    { id: "2", data: new Date(Date.now() - 7 * 86400000).toISOString(), total: 45.0, pecas: [] },
    { id: "3", data: new Date(Date.now() - 30 * 86400000).toISOString(), total: 90.0, pecas: [] },
  ],
  itensEmpresa: { sacos: 3, cabides: 12 },
};

// Mock API delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock IA description response
export const mockDescricaoIA = async (): Promise<{ descricao: string; tipo: string }> => {
  await delay(1500);
  const itens = [
    { descricao: "Camisa social branca masculina", tipo: "outro" },
    { descricao: "Calça jeans azul", tipo: "outro" },
    { descricao: "Lençol de casal bege", tipo: "lencol" },
    { descricao: "Toalha de banho azul", tipo: "toalha" },
    { descricao: "Vestido floral", tipo: "outro" },
    { descricao: "Bermuda xadrez", tipo: "outro" },
    { descricao: "Toalha de rosto bege", tipo: "toalha" },
  ];
  return itens[Math.floor(Math.random() * itens.length)];
};
