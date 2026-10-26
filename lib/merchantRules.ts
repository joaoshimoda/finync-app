/* Offline knowledge about how Brazilian banks write merchants: a category
   guess for lines with no history yet, and a cleaner name for the noisy
   text that card processors and statements add. Pure, so it can be tested
   and grown one case at a time. */

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasTerm(text: string, term: string) {
  return ` ${text} `.includes(` ${term} `);
}

/* First match wins, so specific terms go before generic ones. A null
   category stops the search: "mercado livre" is a store, not groceries. */
const expenseCategoryRules: Array<{ category: string | null; terms: string[] }> = [
  {
    category: null,
    terms: [
      "mercado livre", "mercadolivre", "mercado pago", "mercadopago", "shopee",
      "aliexpress", "amazon marketplace", "magalu", "magazine luiza", "americanas",
      "shein", "temu",
    ],
  },
  {
    category: "Lazer",
    terms: [
      "netflix", "spotify", "disney", "disneyplus", "prime video", "primevideo",
      "hbo", "hbomax", "globoplay", "deezer", "youtube premium", "youtubepremium",
      "paramount", "crunchyroll", "steam", "playstation", "xbox", "nintendo",
      "cinema", "cinemark", "kinoplex", "ingresso", "ingressos", "sympla",
      "eventim", "airbnb", "booking", "decolar", "hotel", "pousada",
    ],
  },
  {
    category: "Transporte",
    terms: [
      "uber", "99app", "99 pop", "99pop", "99 taxi", "cabify", "posto", "postos",
      "combustivel", "auto posto", "shell", "ipiranga", "petrobras", "br mania",
      "estacionamento", "estapar", "sem parar", "semparar", "conectcar", "veloe",
      "pedagio", "metro", "cptm", "bilhete unico", "onibus", "localiza", "movida",
      "unidas", "latam", "gol linhas", "azul linhas", "buser",
    ],
  },
  {
    category: "Alimentação",
    terms: [
      "ifood", "ifd", "rappi", "aiqfome", "ze delivery", "restaurante",
      "restaurantes", "lanchonete", "lanches", "padaria", "panificadora",
      "pizzaria", "pizza", "burger", "hamburgueria", "mcdonalds", "mc donalds",
      "burger king", "subway", "outback", "starbucks", "cafeteria", "cafe",
      "supermercado", "supermercados", "mercado", "mercearia", "atacadao",
      "assai", "carrefour", "pao de acucar", "hortifruti", "sacolao", "acougue",
      "emporio", "doceria", "sorveteria", "confeitaria", "churrascaria",
    ],
  },
  {
    category: "Saúde",
    terms: [
      "farmacia", "farmacias", "drogaria", "drogarias", "drogasil", "droga raia",
      "raia", "pague menos", "panvel", "hospital", "clinica", "laboratorio",
      "consulta", "unimed", "amil", "sulamerica", "hapvida", "odonto",
      "dentista", "smartfit", "smart fit", "bluefit", "gympass", "wellhub",
      "totalpass", "academia",
    ],
  },
  {
    category: "Moradia",
    terms: [
      "aluguel", "condominio", "imobiliaria", "iptu", "enel", "cemig", "copel",
      "celesc", "coelba", "light sa", "sabesp", "cedae", "copasa", "sanepar",
      "comgas", "naturgy", "energia eletrica", "conta de luz", "conta de agua",
      "claro residencial", "vivo fibra", "net servicos", "internet",
    ],
  },
  {
    category: "Educação",
    terms: [
      "escola", "colegio", "faculdade", "universidade", "curso", "cursos",
      "udemy", "alura", "coursera", "livraria", "saraiva", "mensalidade escolar",
    ],
  },
];

const incomeCategoryRules: Array<{ category: string; terms: string[] }> = [
  { category: "Salário", terms: ["salario", "folha de pagamento", "proventos", "pagto salario"] },
  {
    category: "Investimentos",
    terms: ["rendimento", "rendimentos", "rend pago", "juros poupanca", "dividendos", "jcp"],
  },
];

/* A category for a line the user never categorized, or null. Only labels
   the user still has are suggested, when that list is given. */
export function guessCategory(
  description: string,
  kind: "expense" | "income",
  knownCategories?: Iterable<string>,
) {
  const text = normalize(description);
  const known = knownCategories ? new Set(knownCategories) : null;
  const rules = kind === "income" ? incomeCategoryRules : expenseCategoryRules;

  for (const rule of rules) {
    if (!rule.terms.some((term) => hasTerm(text, term))) continue;
    if (!rule.category) return null;

    return !known || known.has(rule.category) ? rule.category : null;
  }

  return null;
}

/* Merchants recognized by name, shown the way people write them. */
const knownMerchants: Array<{ name: string; terms: string[] }> = [
  { name: "iFood", terms: ["ifood", "ifd"] },
  { name: "Uber", terms: ["uber"] },
  { name: "99", terms: ["99app", "99 pop", "99pop", "99 taxi"] },
  { name: "Rappi", terms: ["rappi"] },
  { name: "Zé Delivery", terms: ["ze delivery"] },
  { name: "Netflix", terms: ["netflix"] },
  { name: "Spotify", terms: ["spotify"] },
  { name: "Disney+", terms: ["disney", "disneyplus"] },
  { name: "Prime Video", terms: ["prime video", "primevideo"] },
  { name: "Max", terms: ["hbo", "hbomax"] },
  { name: "Globoplay", terms: ["globoplay"] },
  { name: "YouTube Premium", terms: ["youtube premium", "youtubepremium"] },
  { name: "Mercado Livre", terms: ["mercado livre", "mercadolivre"] },
  { name: "Shopee", terms: ["shopee"] },
  { name: "AliExpress", terms: ["aliexpress"] },
  { name: "Amazon", terms: ["amazon", "amzn"] },
  { name: "Magalu", terms: ["magalu", "magazine luiza"] },
  { name: "Apple", terms: ["apple com bill", "apple com"] },
  { name: "Google", terms: ["google"] },
  { name: "Steam", terms: ["steam"] },
  { name: "Drogasil", terms: ["drogasil"] },
  { name: "Droga Raia", terms: ["droga raia", "drogaraia"] },
  { name: "Smart Fit", terms: ["smartfit", "smart fit"] },
  { name: "Sem Parar", terms: ["sem parar", "semparar"] },
  { name: "Starbucks", terms: ["starbucks"] },
  { name: "McDonald's", terms: ["mcdonalds", "mc donalds"] },
  { name: "Burger King", terms: ["burger king"] },
];

/* Payment processors put their code before the merchant: "PAG*LOJA",
   "IFD*RESTAURANTE", "MP *LOJA", "PAYPAL *LOJA". */
const processorPrefixPattern =
  /^(?:pag|pg|mp|mercpago|mercadopago|ebn|ec|dl|dlo|pagseguro|ps|sumup|stone|cielo|payu|paypal|htm|hna|zp|zig|zoop|ifd|pic|picpay|ame|rd|sq|tm)\s*\*\s*/i;

/* Statement prefixes that say how money moved, not where. */
const statementPrefixes: Array<{ pattern: RegExp; label?: string }> = [
  { pattern: /^pix\s+(?:enviado|transf(?:erencia)?|pagamento)\s*[-:]?\s*/i, label: "Pix para" },
  { pattern: /^pix\s+recebido\s*[-:]?\s*/i, label: "Pix de" },
  { pattern: /^(?:compra\s+(?:no\s+)?(?:cartao\s+(?:de\s+)?)?debito|compra\s+debito|cp\s+deb|debito\s+visa|debito\s+master)\s*[-:]?\s*/i },
  { pattern: /^(?:deb(?:ito)?\.?\s+aut(?:omatico)?\.?|debito\s+automatico)\s*[-:]?\s*/i },
  { pattern: /^(?:pagto|pagamento|pgto)\s+(?:de\s+)?boleto\s*[-:]?\s*/i },
];

const legalSuffixPattern = /\s+(?:ltda|me|epp|eireli|s\/?a|sa|mei)\.?$/i;
const smallWords = new Set(["de", "da", "do", "das", "dos", "e", "em", "para"]);

function toTitleCase(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && smallWords.has(word)
        ? word
        : word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1),
    )
    .join(" ");
}

/* A friendlier name for the line, or null when there is nothing to clean.
   Only all-caps or processor-coded text is rewritten; a name the bank
   already wrote nicely is left alone. */
export function cleanMerchantName(description: string) {
  const trimmed = description.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;

  const text = normalize(trimmed);
  const merchant = knownMerchants.find((item) =>
    item.terms.some((term) => hasTerm(text, term)),
  );
  if (merchant) return merchant.name === trimmed ? null : merchant.name;

  let rest = trimmed;
  let label: string | undefined;

  for (const prefix of statementPrefixes) {
    if (prefix.pattern.test(rest)) {
      rest = rest.replace(prefix.pattern, "");
      label = prefix.label;
      break;
    }
  }

  const hadProcessor = processorPrefixPattern.test(rest);
  rest = rest.replace(processorPrefixPattern, "");
  rest = rest.replace(legalSuffixPattern, "").replace(/[*_]+/g, " ").replace(/\s+/g, " ").trim();

  const isShouting = /[A-Z]/.test(trimmed) && trimmed === trimmed.toUpperCase();
  if (!rest || (!hadProcessor && !label && !isShouting && rest === trimmed)) return null;

  const name = isShouting || hadProcessor ? toTitleCase(rest) : rest;
  const cleaned = label ? `${label} ${name}` : name;

  return cleaned === trimmed ? null : cleaned;
}
