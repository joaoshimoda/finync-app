const cardColorGradients: Record<string, string> = {
  "#18181b": "bg-gradient-to-br from-zinc-700 via-zinc-900 to-black",
  "#6d28d9": "bg-gradient-to-br from-violet-500 via-violet-700 to-purple-950",
  "#1d4ed8": "bg-gradient-to-br from-blue-500 via-blue-700 to-blue-950",
  "#ea580c": "bg-gradient-to-br from-orange-400 via-orange-600 to-orange-950",
  "#047857": "bg-gradient-to-br from-emerald-500 via-emerald-700 to-emerald-950",
  "#be123c": "bg-gradient-to-br from-rose-500 via-rose-700 to-rose-950",
};

export function getCardGradient(cardName: string, cardColor?: string) {
  const customGradient = cardColorGradients[cardColor?.toLowerCase() ?? ""];
  if (customGradient) return customGradient;

  const lowerName = cardName.toLowerCase();
  const normalizedName = lowerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalizedName.includes("nubank")) {
    return "bg-gradient-to-br from-purple-600 to-purple-900";
  }

  if (lowerName.includes("itaú") || normalizedName.includes("itau")) {
    return "bg-gradient-to-br from-orange-500 to-orange-700";
  }

  if (normalizedName.includes("c6") || normalizedName.includes("black")) {
    return "bg-gradient-to-br from-zinc-800 to-black";
  }

  if (
    normalizedName.includes("mercado pago") ||
    normalizedName.includes("mercadopago")
  ) {
    return "bg-gradient-to-br from-cyan-500 to-blue-600";
  }

  if (normalizedName.includes("inter")) {
    return "bg-gradient-to-br from-orange-400 to-orange-600";
  }

  if (normalizedName.includes("bradesco")) {
    return "bg-gradient-to-br from-red-600 to-red-800";
  }

  if (normalizedName.includes("santander")) {
    return "bg-gradient-to-br from-red-500 to-red-700";
  }

  if (
    normalizedName.includes("banco do brasil") ||
    /(^|\s)bb(\s|$)/.test(normalizedName)
  ) {
    return "bg-gradient-to-br from-blue-700 to-blue-900 text-yellow-400";
  }

  if (normalizedName.includes("caixa")) {
    return "bg-gradient-to-br from-blue-500 to-blue-800";
  }

  return "bg-gradient-to-br from-slate-500 to-slate-700";
}
