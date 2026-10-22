import {
  Activity,
  BarChart3,
  CalendarRange,
  CircleDollarSign,
  CreditCard,
  FileDown,
  FileUp,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  Receipt,
  Repeat2,
  Settings,
  ShieldCheck,
  Tags,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type GuideGroupKey =
  | "start"
  | "daily"
  | "planning"
  | "tools"
  | "account";

export const guideGroups: Array<{ key: GuideGroupKey; label: string }> = [
  { key: "start", label: "Primeiros passos" },
  { key: "daily", label: "Dia a dia" },
  { key: "planning", label: "Planejamento" },
  { key: "tools", label: "Ferramentas" },
  { key: "account", label: "Conta e segurança" },
];

export type GuideSection = {
  id: string;
  group: GuideGroupKey;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  href: string;
  actionLabel: string;
  accent: string;
  steps: string[];
  tip: string;
};

export const guideSections: GuideSection[] = [
  {
    id: "competencia",
    group: "start",
    title: "Entenda o mês financeiro",
    shortTitle: "Mês financeiro",
    description:
      "O seletor de mês controla toda a leitura do Finync: receitas e contas usam o mês civil; cartões usam o mês de vencimento da fatura.",
    icon: CalendarRange,
    href: "/dashboard",
    actionLabel: "Ver visão geral",
    accent: "text-sky-400 bg-sky-500/10",
    steps: [
      "Use o carrossel de meses no topo para avançar ou voltar o período analisado.",
      "Receitas, PIX, débito e contas fixas aparecem no mês em que foram lançados.",
      "Compras no cartão aparecem no mês da fatura: no dia do fechamento ou depois, entram na fatura seguinte.",
    ],
    tip: "Se um gasto do cartão parecer estar no mês errado, confira o fechamento e o vencimento cadastrados no cartão.",
  },
  {
    id: "dashboard",
    group: "start",
    title: "Leia sua Visão Geral",
    shortTitle: "Visão Geral",
    description:
      "A página inicial reúne a sobra do mês, a evolução do saldo, cartões, vencimentos, categorias e movimentações recentes.",
    icon: LayoutDashboard,
    href: "/dashboard",
    actionLabel: "Abrir Dashboard",
    accent: "text-emerald-400 bg-emerald-500/10",
    steps: [
      "Sobra no fim do mês projeta quanto resta depois dos seus gastos pessoais previstos e quanto você pode gastar por dia até o mês acabar.",
      "Saldo ao longo do mês mostra seu saldo dia a dia: a linha contínua é o que já aconteceu e a tracejada, o que está previsto.",
      "Em Cartões, toque em Detalhes para virar o cartão e ver sua parte, quanto cada dependente deve e pagar a fatura.",
      "Próximos vencimentos lista contas e faturas em aberto por data; Gastos por categoria mostra onde o dinheiro foi e o uso de cada orçamento.",
    ],
    tip: "Valores de dependentes aparecem na fatura, pois serão cobrados no cartão, mas não reduzem seu saldo pessoal projetado.",
  },
  {
    id: "receitas",
    group: "daily",
    title: "Registre receitas",
    shortTitle: "Receitas",
    description:
      "Salários, freelances e outras entradas dão contexto aos indicadores de saldo, comprometimento e poupança.",
    icon: CircleDollarSign,
    href: "/dashboard/transactions",
    actionLabel: "Adicionar receita",
    accent: "text-emerald-400 bg-emerald-500/10",
    steps: [
      "Abra o menu Novo e escolha Nova Receita.",
      "Informe valor, data, descrição e categoria.",
      "Confirme o lançamento; os KPIs e gráficos são atualizados automaticamente.",
    ],
    tip: "Use descrições consistentes, como Salário ou Freelance, para facilitar buscas e análises futuras.",
  },
  {
    id: "transacoes",
    group: "daily",
    title: "Registre e organize despesas",
    shortTitle: "Transações",
    description:
      "A tela de Transações funciona como um extrato completo, com busca, filtros, edição, exclusão e alteração de categorias.",
    icon: Receipt,
    href: "/dashboard/transactions",
    actionLabel: "Abrir Transações",
    accent: "text-rose-400 bg-rose-500/10",
    steps: [
      "Escolha Débito/PIX para gastos que saem da conta no momento da compra.",
      "Escolha Cartão de Crédito e selecione o cartão usado para lançar na fatura correta.",
      "Use a busca, os botões de tipo e os filtros de origem, cartão e categoria para encontrar lançamentos.",
      "No botão de ordenação, escolha entre mais recentes, mais antigas, maior ou menor valor e ordem alfabética, e agrupe por dia, por categoria ou sem agrupar. A escolha fica salva.",
      "No menu de cada linha, edite ou exclua a transação; categorias de parcelas são propagadas para todo o grupo.",
    ],
    tip: "Uma compra parcelada deve receber o valor total e a quantidade de parcelas. O Finync divide e projeta cada ocorrência.",
  },
  {
    id: "cartoes",
    group: "daily",
    title: "Cadastre cartões e ciclos",
    shortTitle: "Cartões",
    description:
      "Fechamento e vencimento definem em qual fatura cada compra entra e tornam a projeção mensal confiável.",
    icon: CreditCard,
    href: "/dashboard/cards",
    actionLabel: "Gerenciar Cartões",
    accent: "text-violet-400 bg-violet-500/10",
    steps: [
      "Cadastre nome, limite, dia de fechamento e dia de vencimento.",
      "Compras anteriores ao fechamento entram na fatura vigente; no dia do fechamento ou depois, vão para a próxima.",
      "Vire o cartão para conferir total, gastos pessoais e valores por dependente.",
      "Use Pagar Fatura para liquidar as transações daquele cartão no mês selecionado.",
    ],
    tip: "Excluir um cartão também remove suas transações vinculadas. O Finync sempre pede confirmação antes dessa ação.",
  },
  {
    id: "recorrencias",
    group: "daily",
    title: "Controle fixos e assinaturas",
    shortTitle: "Recorrências",
    description:
      "Contas fixas e assinaturas são projetadas por 12 meses, mas seguem regras diferentes de pagamento.",
    icon: Repeat2,
    href: "/dashboard/fixed",
    actionLabel: "Abrir Recorrências",
    accent: "text-amber-400 bg-amber-500/10",
    steps: [
      "Débito/PIX recorrente vira Conta Fixa e nasce pendente até você dar baixa.",
      "Cartão de Crédito recorrente vira Assinatura vinculada ao cartão escolhido.",
      "Uma assinatura futura entra no saldo projetado, mas só aparece na fatura atual quando chega a data da cobrança.",
      "Marque contas fixas como pagas individualmente ou selecione várias para uma baixa em massa.",
    ],
    tip: "Ao excluir uma recorrência, escolha entre remover somente o mês atual ou este e os próximos lançamentos.",
  },
  {
    id: "orcamentos",
    group: "planning",
    title: "Defina orçamentos por categoria",
    shortTitle: "Orçamentos",
    description:
      "Crie limites mensais para seus gastos pessoais e acompanhe quanto ainda pode consumir em cada categoria.",
    icon: Gauge,
    href: "/dashboard/orcamentos",
    actionLabel: "Abrir Orçamentos",
    accent: "text-amber-400 bg-amber-500/10",
    steps: [
      "Escolha o mês e crie um orçamento para uma categoria de despesa.",
      "Informe o limite mensal e em qual percentual deseja receber o alerta visual.",
      "O consumo é atualizado automaticamente com PIX, débito, fixos e compras na competência da fatura.",
      "Edite ou remova o limite sem alterar nenhuma transação existente.",
    ],
    tip: "Os limites analisam somente seus gastos pessoais; despesas de dependentes permanecem isoladas.",
  },
  {
    id: "dependentes",
    group: "planning",
    title: "Separe gastos de dependentes",
    shortTitle: "Dependentes",
    description:
      "Vincule despesas de terceiros sem distorcer sua leitura pessoal de renda, poupança e categorias.",
    icon: UsersRound,
    href: "/dashboard/dependentes",
    actionLabel: "Gerenciar Dependentes",
    accent: "text-cyan-400 bg-cyan-500/10",
    steps: [
      "Cadastre o nome da pessoa na área Dependentes.",
      "Ao criar ou editar uma despesa, selecione opcionalmente quem é o responsável pelo gasto.",
      "O valor continua compondo a fatura do cartão, mas é isolado nos resumos por dependente.",
      "O Analytics considera somente seu fluxo pessoal e exclui essas despesas dos indicadores de saúde financeira.",
    ],
    tip: "Use a página de Dependentes para conferir quanto cada pessoa deve no período selecionado.",
  },
  {
    id: "categorias",
    group: "planning",
    title: "Personalize categorias",
    shortTitle: "Categorias",
    description:
      "Categorias alimentam filtros e gráficos. Você pode criar opções próprias com nome, tipo e ícone.",
    icon: Tags,
    href: "/configuracoes",
    actionLabel: "Configurar Categorias",
    accent: "text-fuchsia-400 bg-fuchsia-500/10",
    steps: [
      "Em Configurações, abra Preferências e localize o gerenciador de categorias.",
      "Defina um nome, escolha se é receita ou despesa e selecione um ícone.",
      "A nova categoria aparece imediatamente nos formulários e filtros.",
      "Categorias em uso não podem ser excluídas; Outros e Crédito/Estorno são protegidas.",
    ],
    tip: "Ao recategorizar uma parcela, o Finync atualiza todas as parcelas do mesmo grupo.",
  },
  {
    id: "importacao",
    group: "tools",
    title: "Importe faturas por arquivo",
    shortTitle: "Importação",
    description:
      "O importador lê faturas, sugere categorias e compara lançamentos antes de gravar qualquer item.",
    icon: FileUp,
    href: "/dashboard/importar",
    actionLabel: "Importar Fatura",
    accent: "text-blue-400 bg-blue-500/10",
    steps: [
      "Exporte a fatura do banco e envie o arquivo aceito pelo importador.",
      "Escolha o cartão e o mês de vencimento correspondente à fatura.",
      "Revise descrições, parcelas, dependentes e categorias no preview.",
      "Confira os itens novos, duplicados e que exigem revisão antes de confirmar a importação.",
    ],
    tip: "Pagamentos de fatura e estornos são tratados separadamente. Revise valores negativos antes da confirmação.",
  },
  {
    id: "analytics",
    group: "tools",
    title: "Interprete o Analytics",
    shortTitle: "Analytics",
    description:
      "O Centro de Comando transforma seu histórico pessoal em tendências, composição e concentração de gastos.",
    icon: BarChart3,
    href: "/dashboard/analytics",
    actionLabel: "Abrir Analytics",
    accent: "text-lime-400 bg-lime-500/10",
    steps: [
      "Confira Entradas, Saídas, Balanço Líquido e Taxa de Poupança no topo.",
      "Use o gráfico de fluxo para comparar receitas e despesas ao longo dos períodos.",
      "Top Categorias mostra onde houve maior concentração de dinheiro.",
      "Composição separa contas fixas e cartão; Maiores Despesas destaca os lançamentos mais relevantes.",
    ],
    tip: "O Analytics é pessoal: gastos vinculados a dependentes não entram nos KPIs nem nos gráficos.",
  },
  {
    id: "integridade",
    group: "tools",
    title: "Verifique a integridade dos dados",
    shortTitle: "Integridade",
    description:
      "A Central de Integridade confere vínculos, parcelas, faturas, pagamentos e cadastros sem modificar seus lançamentos.",
    icon: ShieldCheck,
    href: "/dashboard/integridade",
    actionLabel: "Verificar Dados",
    accent: "text-emerald-400 bg-emerald-500/10",
    steps: [
      "Abra a Central de Integridade para executar as verificações da sua conta.",
      "Confira o resumo de avisos, erros e ocorrências críticas encontrado pelo diagnóstico.",
      "Use Revisar para acessar diretamente a área relacionada a cada inconsistência.",
      "Depois da correção, execute a verificação novamente para confirmar o resultado.",
    ],
    tip: "O diagnóstico é somente leitura: nenhuma transação ou configuração é alterada durante a verificação.",
  },
  {
    id: "atividades",
    group: "tools",
    title: "Consulte o histórico de alterações",
    shortTitle: "Atividades",
    description:
      "Veja quando transações, cartões, faturas, pagamentos e configurações financeiras foram criados, editados ou excluídos.",
    icon: Activity,
    href: "/dashboard/atividades",
    actionLabel: "Abrir Histórico",
    accent: "text-sky-400 bg-sky-500/10",
    steps: [
      "Abra Atividades para consultar os eventos mais recentes da sua conta.",
      "Filtre por área, tipo de ação ou período para encontrar uma mudança específica.",
      "Nas edições, abra os detalhes para comparar o valor anterior com o novo.",
      "Use Desfazer em alterações individuais que possam ser revertidas com segurança.",
    ],
    tip: "Faturas automáticas, operações em grupo e exclusões com efeito em cascata ficam protegidas contra reversão parcial.",
  },
  {
    id: "backup",
    group: "tools",
    title: "Exporte e preserve seus dados",
    shortTitle: "Backup",
    description:
      "Gere uma cópia completa em JSON ou um extrato de transações em CSV diretamente no seu dispositivo.",
    icon: FileDown,
    href: "/dashboard/exportar",
    actionLabel: "Abrir Exportação",
    accent: "text-cyan-400 bg-cyan-500/10",
    steps: [
      "Use o backup JSON para preservar cadastros, vínculos, faturas, pagamentos e histórico.",
      "Use o CSV quando precisar analisar as movimentações em uma planilha.",
      "Guarde o arquivo JSON em um local privado e protegido.",
      "Faça novos backups periodicamente para manter a cópia atualizada.",
    ],
    tip: "O backup não contém senha, token de sessão ou credenciais do Supabase Auth.",
  },
  {
    id: "privacidade",
    group: "account",
    title: "Ajuste perfil e privacidade",
    shortTitle: "Configurações",
    description:
      "Gerencie identidade, preferências, categorias, senha, saldos ocultos e permissões do navegador.",
    icon: Settings,
    href: "/configuracoes",
    actionLabel: "Abrir Configurações",
    accent: "text-zinc-300 bg-zinc-500/10",
    steps: [
      "Em Meu Perfil, altere nome de exibição e foto.",
      "Em Preferências, defina moeda, formato de data, categorias e se os saldos devem iniciar ocultos.",
      "Em Segurança, troque sua senha com validação.",
      "Ative notificações somente quando desejar permitir alertas nativos do navegador.",
    ],
    tip: "As preferências são sincronizadas com sua conta e mantêm um fallback local quando o dispositivo está sem conexão.",
  },
  {
    id: "seguranca",
    group: "account",
    title: "Saiba como seus dados são protegidos",
    shortTitle: "Segurança",
    description:
      "Autenticação, sessão e políticas do Supabase mantêm cada conta isolada.",
    icon: LockKeyhole,
    href: "/configuracoes",
    actionLabel: "Revisar Segurança",
    accent: "text-teal-400 bg-teal-500/10",
    steps: [
      "Todas as rotas do painel são protegidas antes da renderização.",
      "As políticas RLS limitam leituras e alterações ao usuário autenticado.",
      "Ao sair, o Finync encerra a sessão e limpa os dados financeiros do estado local.",
      "Use a recuperação de senha na tela de login caso perca o acesso.",
    ],
    tip: "Nunca compartilhe códigos de acesso, links de recuperação ou sua senha.",
  },
];

export const quickStartSteps = [
  {
    title: "Cadastre o cartão",
    description: "Informe fechamento e vencimento para organizar as faturas.",
    href: "/dashboard/cards",
  },
  {
    title: "Registre sua receita",
    description: "Adicione salário e entradas para calcular o saldo projetado.",
    href: "/dashboard/transactions",
  },
  {
    title: "Organize recorrências",
    description: "Separe contas fixas de assinaturas cobradas no cartão.",
    href: "/dashboard/fixed",
  },
  {
    title: "Revise o mês",
    description: "Confira saldos, pendências e distribuição na Visão Geral.",
    href: "/dashboard",
  },
];

export type FrequentlyAskedQuestion = {
  question: string;
  answer: string;
  topic: string;
};

export const frequentlyAskedQuestions: FrequentlyAskedQuestion[] = [
  {
    topic: "Cartões",
    question: "Por que uma compra de agosto aparece em setembro?",
    answer:
      "Porque cartões seguem o mês de vencimento da fatura. Se a compra ocorreu no dia do fechamento ou depois, ela pertence à próxima fatura.",
  },
  {
    topic: "Transações",
    question: "Como lanço uma compra parcelada?",
    answer:
      "Ao criar a despesa no cartão, informe o valor total da compra e a quantidade de parcelas. O Finync divide o valor e lança cada parcela na fatura correspondente.",
  },
  {
    topic: "Cartões",
    question: "O que acontece quando eu pago a fatura?",
    answer:
      "Em Cartões, use Pagar Fatura: todas as transações daquele cartão no mês selecionado são marcadas como pagas e deixam de aparecer como pendentes.",
  },
  {
    topic: "Cartões",
    question: "Excluir um cartão apaga as compras dele?",
    answer:
      "Sim. As transações vinculadas ao cartão também são removidas, por isso o Finync sempre pede confirmação. Faça um backup antes se quiser guardar o histórico.",
  },
  {
    topic: "Recorrências",
    question: "Qual a diferença entre conta fixa e assinatura?",
    answer:
      "Conta fixa é paga por Débito ou PIX e fica pendente até você dar baixa. Assinatura é cobrada no cartão e entra sozinha na fatura na data de cobrança.",
  },
  {
    topic: "Recorrências",
    question: "Assinatura futura reduz meu saldo disponível?",
    answer:
      "Sim. Ela entra na projeção do fim do mês, mas só passa a compor a fatura atual quando chega a data prevista de cobrança.",
  },
  {
    topic: "Dependentes",
    question: "Gasto de dependente altera meus gráficos?",
    answer:
      "Não. Ele continua na fatura bruta do cartão, mas é excluído do saldo pessoal, dos orçamentos e do Analytics.",
  },
  {
    topic: "Dependentes",
    question: "Como registro que um dependente me pagou?",
    answer:
      "Na aba Dependentes, use Registrar acerto no card da pessoa. Ele pode ser total ou parcial, e o saldo devido é atualizado na hora.",
  },
  {
    topic: "Importação",
    question: "E se eu importar a mesma fatura duas vezes?",
    answer:
      "O importador compara cada item com o que já existe e marca os duplicados antes de salvar. Se algo entrar por engano, exclua o lançamento em Transações.",
  },
  {
    topic: "Categorias",
    question: "Por que não consigo excluir uma categoria?",
    answer:
      "Categorias vinculadas a transações não podem ser removidas. Recategorize os lançamentos antes de tentar novamente.",
  },
  {
    topic: "Privacidade",
    question: "Como escondo meus valores na tela?",
    answer:
      "Clique no ícone de olho da Visão Geral. Para que os saldos sempre iniciem ocultos, ative a opção em Configurações > Preferências.",
  },
  {
    topic: "Backup",
    question: "Como guardo uma cópia dos meus dados?",
    answer:
      "Em Exportar e Backup, baixe o arquivo JSON com todos os cadastros e histórico, ou o CSV para abrir as transações em uma planilha.",
  },
  {
    topic: "Conta",
    question: "Esqueci minha senha. O que faço?",
    answer:
      "Na tela de login, use Esqueci minha senha. Você receberá um link por e-mail para criar uma nova senha.",
  },
];
