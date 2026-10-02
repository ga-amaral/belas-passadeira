const PEDIDO_STATUSES = Object.freeze([
  "entrada",
  "molho_secagem",
  "secar",
  "passar",
  "concluido",
]);

const PEDIDO_STATUS_LABELS = Object.freeze({
  entrada: "Entrada",
  molho_secagem: "Molho e Secagem",
  secar: "Secar",
  passar: "Passar",
  concluido: "Concluído",
});

function isPedidoStatus(value) {
  return typeof value === "string" && PEDIDO_STATUSES.includes(value);
}

module.exports = { PEDIDO_STATUSES, PEDIDO_STATUS_LABELS, isPedidoStatus };
