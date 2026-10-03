function mergePollingPedidos(current, incoming, pendingIds) {
  const currentById = new Map(current.map((pedido) => [pedido.id, pedido]));

  return incoming.map((pedido) => (
    pendingIds.has(pedido.id) ? (currentById.get(pedido.id) || pedido) : pedido
  ));
}

function groupPedidosByStatus(pedidos, statuses) {
  const grouped = Object.fromEntries(statuses.map((status) => [status, []]));

  for (const pedido of pedidos) {
    if (grouped[pedido.status]) grouped[pedido.status].push(pedido);
  }

  return grouped;
}

function shouldApplyPollingResult(epochAtStart, currentEpoch) {
  return epochAtStart === currentEpoch;
}

function getBackgroundDragScrollLeft(scrollLeftInicial, startX, clientX) {
  return scrollLeftInicial - (clientX - startX);
}

module.exports = { getBackgroundDragScrollLeft, groupPedidosByStatus, mergePollingPedidos, shouldApplyPollingResult };
