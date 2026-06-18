export function getCardGradient(cardName: string) {
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
