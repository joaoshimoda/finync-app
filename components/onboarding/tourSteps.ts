import {
  Activity,
  BarChart3,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  CircleHelp,
  CreditCard,
  Eye,
  FileDown,
  FileUp,
  Filter,
  Gauge,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  PieChart,
  Plus,
  Receipt,
  Repeat2,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SplitSquareHorizontal,
  TrendingUp,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type ProductTourFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
};

export type ProductTourStep = {
  id: string;
  section: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  features: ProductTourFeature[];
  tip?: string;
};

export const PRODUCT_TOUR_EVENT = "finync:start-product-tour";

export const productTourSteps: ProductTourStep[] = [
  {
    id: "welcome",
    section: "Boas-vindas",
    icon: Sparkles,
    title: "Bem-vindo ao Finync",
    summary:
      "Em poucos minutos você vai conhecer cada aba e saber exatamente por onde começar. Para o Finync funcionar bem, siga esta ordem:",
    features: [
      {
        icon: CreditCard,
        title: "1. Cadastre seus cartões",
        description:
          "Com o dia de fechamento e vencimento, cada compra cai na fatura certa.",
      },
      {
        icon: CircleDollarSign,
        title: "2. Registre suas receitas",
        description:
          "Salário e outras entradas são a base do seu saldo projetado.",
      },
      {
        icon: Repeat2,
        title: "3. Adicione contas fixas e assinaturas",
        description:
          "Aluguel, internet e streaming são projetados para os próximos meses.",
      },
    ],
    tip: "Use as setas do teclado para avançar ou clique em qualquer etapa da lista.",
  },
  {
    id: "dashboard",
    section: "Visão",
    icon: LayoutDashboard,
    title: "Visão Geral",
    summary:
      "Sua página inicial. Mostra num relance como está o mês: receitas, saldo projetado, faturas e o que ainda falta pagar.",
    features: [
      {
        icon: CalendarRange,
        title: "Seletor de mês",
        description:
          "Fica no topo e muda o período de todas as telas. Receitas e contas seguem o mês do lançamento; o cartão segue o mês de vencimento da fatura.",
      },
      {
        icon: Plus,
        title: "Botão Novo",
        description:
          "O atalho para registrar uma despesa, uma receita ou um cartão de qualquer lugar.",
      },
      {
        icon: Eye,
        title: "Ocultar valores",
        description:
          "O ícone de olho esconde todos os saldos da tela, útil em lugares públicos.",
      },
    ],
    tip: "Saldo Disponível é o que deve sobrar no fim do mês depois de todos os seus gastos planejados.",
  },
  {
    id: "transactions",
    section: "Visão",
    icon: Receipt,
    title: "Transações",
    summary:
      "Seu extrato completo. Todas as receitas e despesas ficam aqui, de todas as origens.",
    features: [
      {
        icon: Plus,
        title: "Lance receitas e despesas",
        description:
          "Débito e PIX saem na hora. No cartão, escolha qual foi usado e, se quiser, parcele: informe o valor total e o Finync divide as parcelas.",
      },
      {
        icon: Filter,
        title: "Busque e filtre",
        description:
          "Encontre qualquer lançamento por texto, tipo, origem, cartão ou categoria.",
      },
      {
        icon: ListChecks,
        title: "Edite e recategorize",
        description:
          "Pelo menu de cada linha. Ao mudar a categoria de uma parcela, todas as parcelas da compra são atualizadas.",
      },
    ],
  },
  {
    id: "cards",
    section: "Planejamento",
    icon: CreditCard,
    title: "Cartões",
    summary:
      "Cadastre seus cartões de crédito e acompanhe cada fatura: total, limite usado e quanto é seu ou de dependentes.",
    features: [
      {
        icon: CalendarDays,
        title: "Fechamento e vencimento",
        description:
          "Compras antes do fechamento entram na fatura atual; no dia do fechamento ou depois, vão para a próxima.",
      },
      {
        icon: WalletCards,
        title: "Detalhes da fatura",
        description:
          "Vire o cartão para ver o total separado entre seus gastos e os de cada dependente.",
      },
      {
        icon: HandCoins,
        title: "Pagar fatura",
        description:
          "Marca como pagas todas as compras daquele cartão no mês selecionado.",
      },
    ],
    tip: "Se uma compra aparecer no mês errado, confira os dias de fechamento e vencimento do cartão.",
  },
  {
    id: "fixed",
    section: "Planejamento",
    icon: CalendarDays,
    title: "Contas Fixas",
    summary:
      "Gastos que se repetem todo mês. Você cadastra uma vez e o Finync projeta os próximos 12 meses.",
    features: [
      {
        icon: Receipt,
        title: "Contas fixas (Débito/PIX)",
        description:
          "Aluguel, luz, internet. Ficam pendentes até você dar baixa, uma por uma ou várias de uma vez.",
      },
      {
        icon: Repeat2,
        title: "Assinaturas (Cartão)",
        description:
          "Streaming, apps, academia. Entram sozinhas na fatura do cartão quando chega a data de cobrança.",
      },
    ],
    tip: "Ao excluir, você escolhe remover só o mês atual ou também os próximos.",
  },
  {
    id: "budgets",
    section: "Planejamento",
    icon: Gauge,
    title: "Orçamentos",
    summary:
      "Defina quanto quer gastar por mês em cada categoria e acompanhe o consumo sem fazer contas.",
    features: [
      {
        icon: Gauge,
        title: "Limite por categoria",
        description:
          "Ex.: R$ 800 em Alimentação. A barra enche conforme você gasta, em PIX, débito, contas fixas ou cartão.",
      },
      {
        icon: Sparkles,
        title: "Alerta de consumo",
        description:
          "Escolha em qual percentual quer ser avisado, como 80% do limite.",
      },
    ],
    tip: "Só seus gastos pessoais contam. Despesas de dependentes ficam de fora.",
  },
  {
    id: "dependents",
    section: "Planejamento",
    icon: UsersRound,
    title: "Dependentes",
    summary:
      "Para quando outras pessoas usam seu cartão, como familiares ou amigos. O gasto fica na fatura, mas não bagunça suas finanças pessoais.",
    features: [
      {
        icon: UsersRound,
        title: "Cadastre a pessoa",
        description:
          "Depois, basta selecioná-la ao lançar uma despesa, recorrência ou importação.",
      },
      {
        icon: SplitSquareHorizontal,
        title: "Veja quanto cada um deve",
        description:
          "O resumo mostra o valor de cada dependente no mês selecionado.",
      },
      {
        icon: HandCoins,
        title: "Registre acertos",
        description:
          "Quando a pessoa te pagar, registre o acerto total ou parcial.",
      },
    ],
  },
  {
    id: "import",
    section: "Ferramentas",
    icon: FileUp,
    title: "Importar Faturas",
    summary:
      "Economize tempo: envie a fatura do banco em vez de lançar compra por compra.",
    features: [
      {
        icon: FileUp,
        title: "Envie CSV ou PDF",
        description:
          "Escolha o cartão e o mês de vencimento e envie o arquivo exportado do seu banco.",
      },
      {
        icon: ListChecks,
        title: "Revise antes de salvar",
        description:
          "O Finync sugere categorias, identifica parcelas e avisa sobre duplicadas. Nada é gravado sem sua confirmação.",
      },
    ],
  },
  {
    id: "analytics",
    section: "Visão",
    icon: BarChart3,
    title: "Analytics",
    summary:
      "Gráficos prontos sobre sua saúde financeira, sem precisar montar planilhas.",
    features: [
      {
        icon: TrendingUp,
        title: "Indicadores do período",
        description:
          "Entradas, saídas, balanço líquido e quanto da renda você conseguiu poupar.",
      },
      {
        icon: PieChart,
        title: "Para onde vai o dinheiro",
        description:
          "Ranking de categorias, composição entre fixos e cartão e as maiores despesas.",
      },
    ],
    tip: "Considera apenas seus gastos pessoais. O que é de dependentes não entra nos números.",
  },
  {
    id: "tools",
    section: "Ferramentas",
    icon: ShieldCheck,
    title: "Segurança dos seus dados",
    summary:
      "Três ferramentas para manter tudo correto e sob seu controle. Você não precisa usá-las todo dia.",
    features: [
      {
        icon: ShieldCheck,
        title: "Integridade",
        description:
          "Faz uma verificação e aponta parcelas soltas, vínculos incompletos e faturas divergentes. Não altera nenhum dado.",
      },
      {
        icon: Activity,
        title: "Atividades",
        description:
          "Histórico de tudo o que foi criado, editado ou excluído, com opção de desfazer alterações.",
      },
      {
        icon: FileDown,
        title: "Exportar e Backup",
        description:
          "Baixe uma cópia completa em JSON ou o extrato em CSV para usar em planilhas.",
      },
    ],
  },
  {
    id: "finish",
    section: "Suporte",
    icon: CircleHelp,
    title: "Tudo pronto!",
    summary:
      "Você já conhece o Finync. Se surgir alguma dúvida, a ajuda está sempre à mão:",
    features: [
      {
        icon: Search,
        title: "Busca rápida (Ctrl + K)",
        description: "Encontre qualquer página ou ação sem usar o menu.",
      },
      {
        icon: CircleHelp,
        title: "Guia do Usuário",
        description:
          "Explicações detalhadas, perguntas frequentes e este tutorial para rever quando quiser.",
        href: "/dashboard/ajuda",
      },
      {
        icon: Settings,
        title: "Configurações",
        description:
          "Perfil, senha, moeda, categorias personalizadas e preferências de privacidade.",
        href: "/configuracoes",
      },
    ],
  },
];
