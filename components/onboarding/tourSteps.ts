export type ProductTourStep = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  route?: string;
  target?: string;
  previewEvent?: string;
  nextLabel?: string;
};

export const PRODUCT_TOUR_EVENT = "finync:start-product-tour";
export const PRODUCT_TOUR_PREVIEW_EVENTS = {
  card: "finync:tour-preview-card",
  expense: "finync:tour-preview-expense",
  income: "finync:tour-preview-income",
  recurring: "finync:tour-preview-recurring",
} as const;

export const productTourSteps: ProductTourStep[] = [
  {
    id: "welcome",
    eyebrow: "Bem-vindo ao Finync",
    title: "Vamos configurar seu controle financeiro",
    description:
      "Este tour acontece dentro do aplicativo. Em poucos passos, você verá onde acessar e como usar cada função essencial.",
  },
  {
    id: "month",
    eyebrow: "Seu período financeiro",
    title: "Tudo começa pelo mês selecionado",
    description:
      "Use este controle para navegar entre períodos. Receitas e contas seguem o mês civil; cartões seguem o mês de vencimento da fatura.",
    route: "/dashboard",
    target: "month-selector",
  },
  {
    id: "privacy",
    eyebrow: "Privacidade rápida",
    title: "Oculte seus valores quando precisar",
    description:
      "Use o ícone de olho para esconder ou revelar todos os saldos da Dashboard sem alterar nenhum dado financeiro.",
    route: "/dashboard",
    target: "dashboard-privacy",
  },
  {
    id: "new",
    eyebrow: "Ação principal",
    title: "Crie lançamentos pelo menu Novo",
    description:
      "Aqui você registra uma despesa, adiciona uma receita ou cadastra um novo cartão sem sair da Visão Geral.",
    route: "/dashboard",
    target: "dashboard-new",
  },
  {
    id: "cards-navigation",
    eyebrow: "Passo 1 · Cartões",
    title: "Abra a gestão de cartões",
    description:
      "Esta aba concentra cartões, limites, ciclos, faturas, pagamentos e o detalhamento entre gastos pessoais e dependentes.",
    route: "/dashboard",
    target: "nav-cards",
  },
  {
    id: "cards-create",
    eyebrow: "Cadastro do cartão",
    title: "Comece informando fechamento e vencimento",
    description:
      "Este botão abre o formulário do cartão. Esses dois dias definem automaticamente em qual fatura cada compra será contabilizada.",
    route: "/dashboard/cards",
    target: "cards-add",
    nextLabel: "Abrir formulário",
  },
  {
    id: "cards-modal",
    eyebrow: "Dentro do cadastro",
    title: "Estes dados organizam todo o ciclo",
    description:
      "Nome e limite identificam o cartão. Fechamento decide quando uma compra muda de fatura; vencimento define o mês em que ela será paga.",
    route: "/dashboard/cards",
    target: "card-modal",
    previewEvent: PRODUCT_TOUR_PREVIEW_EVENTS.card,
  },
  {
    id: "transactions-navigation",
    eyebrow: "Passo 2 · Movimentações",
    title: "Seu extrato completo fica em Transações",
    description:
      "Use esta área para buscar, filtrar, editar, excluir e recategorizar qualquer lançamento.",
    route: "/dashboard/cards",
    target: "nav-transactions",
  },
  {
    id: "transactions-create",
    eyebrow: "Receitas e despesas",
    title: "Adicione uma nova movimentação",
    description:
      "Este menu separa entradas de saídas. Primeiro vamos abrir o formulário de despesa para você reconhecer cada campo.",
    route: "/dashboard/transactions",
    target: "transactions-add",
    nextLabel: "Abrir despesa",
  },
  {
    id: "expense-modal",
    eyebrow: "Formulário de despesa",
    title: "O método de pagamento muda o lançamento",
    description:
      "Débito ou PIX sai da conta no momento. Cartão exige escolher o cartão e permite parcelar, repetir como assinatura e vincular um dependente.",
    route: "/dashboard/transactions",
    target: "transaction-modal",
    previewEvent: PRODUCT_TOUR_PREVIEW_EVENTS.expense,
    nextLabel: "Ver receita",
  },
  {
    id: "income-modal",
    eyebrow: "Formulário de receita",
    title: "Entradas têm um fluxo mais simples",
    description:
      "Informe valor, descrição, data e categoria. A receita atualiza imediatamente o saldo projetado e os indicadores pessoais.",
    route: "/dashboard/transactions",
    target: "income-modal",
    previewEvent: PRODUCT_TOUR_PREVIEW_EVENTS.income,
  },
  {
    id: "budgets",
    eyebrow: "Planejamento pessoal",
    title: "Defina limites por categoria",
    description:
      "Escolha uma categoria, informe o limite mensal e o Finync acompanhará o consumo pessoal automaticamente.",
    route: "/dashboard/orcamentos",
    target: "budgets-add",
  },
  {
    id: "fixed-navigation",
    eyebrow: "Passo 3 · Recorrências",
    title: "Fixos e assinaturas vivem nesta área",
    description:
      "Contas em PIX ou débito ficam separadas das assinaturas mensais cobradas no cartão.",
    route: "/dashboard/transactions",
    target: "nav-fixed",
  },
  {
    id: "fixed-create",
    eyebrow: "Planejamento recorrente",
    title: "Crie uma recorrência uma única vez",
    description:
      "O Finync projeta as próximas ocorrências e permite dar baixa em contas fixas sem microgerenciar compras do dia a dia.",
    route: "/dashboard/fixed",
    target: "recurrence-add",
    nextLabel: "Abrir recorrência",
  },
  {
    id: "fixed-modal",
    eyebrow: "Formulário de recorrência",
    title: "Escolha entre conta fixa e assinatura",
    description:
      "Débito ou PIX cria uma conta a pagar. Cartão cria uma assinatura mensal. Nos dois casos, o Finync projeta 12 ocorrências ligadas pelo mesmo grupo.",
    route: "/dashboard/fixed",
    target: "recurring-modal",
    previewEvent: PRODUCT_TOUR_PREVIEW_EVENTS.recurring,
  },
  {
    id: "dependents-navigation",
    eyebrow: "Passo 4 · Dependentes",
    title: "Separe gastos de outras pessoas",
    description:
      "O valor continua na fatura do cartão, mas não distorce seu saldo pessoal nem os indicadores do Analytics.",
    route: "/dashboard/fixed",
    target: "nav-dependents",
  },
  {
    id: "dependents-create",
    eyebrow: "Cadastro de pessoas",
    title: "Cadastre e acompanhe cada dependente",
    description:
      "Adicione o nome aqui. Depois, o dependente ficará disponível nos formulários de despesas, recorrências e importação.",
    route: "/dashboard/dependentes",
    target: "dependent-add",
  },
  {
    id: "import-navigation",
    eyebrow: "Passo 5 · Importação",
    title: "Importe uma fatura completa",
    description:
      "O importador lê o arquivo, sugere categorias e compara duplicidades antes de salvar qualquer lançamento.",
    route: "/dashboard/dependentes",
    target: "nav-import",
  },
  {
    id: "import-upload",
    eyebrow: "Revisão antes de salvar",
    title: "Envie o arquivo e confira o preview",
    description:
      "Selecione o cartão e o mês da fatura, envie o CSV ou PDF e revise parcelas, dependentes, créditos e possíveis duplicidades.",
    route: "/dashboard/importar",
    target: "import-upload",
  },
  {
    id: "analytics-navigation",
    eyebrow: "Passo 6 · Analytics",
    title: "Acompanhe sua saúde financeira",
    description:
      "O Analytics isola seus gastos pessoais e transforma o histórico em balanço, taxa de poupança e concentração por categoria.",
    route: "/dashboard/importar",
    target: "nav-analytics",
  },
  {
    id: "analytics",
    eyebrow: "Centro de comando",
    title: "Leia tendências sem montar planilhas",
    description:
      "Entradas, saídas, balanço líquido, categorias e composição são calculados automaticamente para o período escolhido.",
    route: "/dashboard/analytics",
    target: "analytics-dashboard",
  },
  {
    id: "integrity",
    eyebrow: "Diagnóstico",
    title: "Confira a consistência dos seus dados",
    description:
      "A Central de Integridade identifica vínculos incompletos, parcelas isoladas e divergências em faturas sem alterar seus lançamentos.",
    route: "/dashboard/integridade",
    target: "integrity-dashboard",
  },
  {
    id: "finish",
    eyebrow: "Tudo pronto",
    title: "Você já conhece o fluxo essencial",
    description:
      "O Guia do Usuário permanece disponível na navegação com instruções detalhadas, busca e este tour para consultar novamente.",
    route: "/dashboard",
  },
];
