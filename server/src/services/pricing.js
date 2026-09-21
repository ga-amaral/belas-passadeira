function calculateOrderPricing(prices, requestedVolumes, requestedAvulsos) {
  const pricesById = new Map(prices.map((price) => [String(price.id), price]));
  const volumes = (requestedVolumes || []).map((volume) => {
    const quantity = Number(volume.quantidade);
    const price = pricesById.get(String(volume.precoId));

    if (!price || price.type !== "volume" || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Opção de precificação inválida.");
    }

    return { precoId: String(price.id), nome: price.name, quantidade: quantity, preco: Number(price.price) };
  });

  const avulsos = Number(requestedAvulsos);
  if (!Number.isInteger(avulsos) || avulsos < 0) {
    throw new Error("Quantidade de peças avulsas inválida.");
  }

  const avulso = prices.find((price) => price.type === "avulso");
  if (avulsos > 0 && !avulso) throw new Error("Opção de precificação inválida.");

  const totalVolumes = volumes.reduce((total, volume) => total + volume.quantidade * volume.preco, 0);
  const totalAvulsos = avulsos * Number(avulso?.price || 0);

  return {
    total: totalVolumes + totalAvulsos,
    volumes: volumes.map(({ preco, ...volume }) => volume),
    pdfVolumes: volumes,
  };
}

module.exports = { calculateOrderPricing };
