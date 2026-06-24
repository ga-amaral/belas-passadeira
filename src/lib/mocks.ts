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
