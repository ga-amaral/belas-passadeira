type PriceRecord = { id: string | number; name: string; price: string | number; type: string };
type RequestedVolume = { precoId: string; quantidade: number };

export function calculateOrderPricing(prices: PriceRecord[], requestedVolumes: RequestedVolume[], requestedAvulsos: number) {
  const pricesById = new Map(prices.map((price) => [String(price.id), price]));
  const volumesWithPrice = (requestedVolumes || []).map((volume) => {
    const quantity = Number(volume.quantidade);
    const price = pricesById.get(String(volume.precoId));

    if (!price || price.type !== "volume" || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Opção de precificação inválida.");
    }

    return { precoId: String(price.id), nome: price.name, quantidade: quantity, preco: Number(price.price) };
  });

  const avulsos = Number(requestedAvulsos);
  if (!Number.isInteger(avulsos) || avulsos < 0) throw new Error("Quantidade de peças avulsas inválida.");

  const avulso = prices.find((price) => price.type === "avulso");
  if (avulsos > 0 && !avulso) throw new Error("Opção de precificação inválida.");

  const totalVolumes = volumesWithPrice.reduce((total, volume) => total + volume.quantidade * volume.preco, 0);
  const totalAvulsos = avulsos * Number(avulso?.price || 0);

  return {
    total: totalVolumes + totalAvulsos,
    volumes: volumesWithPrice.map((volume) => ({
      precoId: volume.precoId,
      nome: volume.nome,
      quantidade: volume.quantidade,
    })),
    pdfVolumes: volumesWithPrice,
  };
}
