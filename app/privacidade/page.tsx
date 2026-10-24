import type { Metadata } from "next";

import { LegalContact, LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidade · Finync",
  description: "Quais dados o Finync guarda, por que guarda e como você controla tudo.",
};

const sections: LegalSection[] = [
  {
    id: "quem-somos",
    title: "Quem é responsável",
    body: (
      <p>
        O Finync é um aplicativo de organização financeira pessoal. Para os fins
        da Lei Geral de Proteção de Dados (Lei nº 13.709/2018, “LGPD”), o Finync
        é o controlador dos dados pessoais tratados no aplicativo. Dúvidas e
        pedidos sobre seus dados podem ser enviados para <LegalContact />.
      </p>
    ),
  },
  {
    id: "dados",
    title: "Quais dados guardamos",
    body: (
      <>
        <ul>
          <li>
            <strong>Conta:</strong> nome, e-mail, senha (armazenada apenas de
            forma criptografada) e, se você enviar, a foto de perfil.
          </li>
          <li>
            <strong>Dados financeiros que você cadastra:</strong> cartões
            (nome, dias de fechamento e vencimento e limite — nunca número
            completo, senha ou código de segurança), faturas, pagamentos,
            transações, contas fixas, receitas, orçamentos, categorias e
            dependentes com os valores divididos com eles.
          </li>
          <li>
            <strong>Preferências:</strong> moeda, formato de data, lembretes,
            organização do menu e opção de ocultar valores.
          </li>
          <li>
            <strong>Histórico e diagnóstico:</strong> registro das alterações
            feitas nos seus dados (para permitir desfazer) e registros de erros
            técnicos do aplicativo, sem valores financeiros.
          </li>
        </ul>
        <p>
          O Finync <strong>não pede nem armazena senhas de banco</strong> e não
          se conecta à sua conta bancária.
        </p>
      </>
    ),
  },
  {
    id: "faturas",
    title: "Importação de faturas",
    body: (
      <p>
        Quando você importa um arquivo de fatura (PDF, CSV, OFX ou planilha), a
        leitura acontece no seu próprio navegador. O arquivo original não é
        enviado aos nossos servidores; só são gravadas as transações que você
        revisa e confirma.
      </p>
    ),
  },
  {
    id: "finalidade",
    title: "Para que usamos os dados",
    body: (
      <>
        <ul>
          <li>Criar e manter sua conta e permitir o login.</li>
          <li>
            Mostrar seus saldos, faturas, orçamentos, divisões com dependentes
            e relatórios.
          </li>
          <li>Enviar e-mails da conta, como confirmação de cadastro e recuperação de senha.</li>
          <li>Exibir lembretes de vencimento, quando você ativa essa opção.</li>
          <li>Corrigir erros e manter o aplicativo seguro.</li>
        </ul>
        <p>
          A base legal é a execução do contrato com você (art. 7º, V, da LGPD)
          e, para diagnóstico e segurança, o legítimo interesse (art. 7º, IX).
          Não usamos seus dados para publicidade e{" "}
          <strong>não vendemos nem compartilhamos seus dados financeiros</strong>{" "}
          com terceiros para fins comerciais.
        </p>
      </>
    ),
  },
  {
    id: "armazenamento",
    title: "Onde os dados ficam",
    body: (
      <p>
        Os dados são armazenados no Supabase, serviço de banco de dados e
        autenticação que atua como operador, e podem ficar em servidores fora
        do Brasil, com as salvaguardas previstas na LGPD. O acesso é protegido
        por criptografia em trânsito e por regras de acesso no banco: cada
        conta só consegue ler e alterar os próprios registros.
      </p>
    ),
  },
  {
    id: "retencao",
    title: "Por quanto tempo",
    body: (
      <p>
        Mantemos seus dados enquanto sua conta existir. Ao excluir a conta, os
        dados da conta e todos os dados financeiros são apagados de forma
        permanente na mesma hora. Cópias de segurança técnicas do provedor
        podem levar alguns dias para expirar.
      </p>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos",
    body: (
      <>
        <p>Pela LGPD, você pode, a qualquer momento:</p>
        <ul>
          <li>
            <strong>Acessar e levar seus dados:</strong> em Configurações →
            Dados e privacidade → Exportar e fazer backup.
          </li>
          <li>
            <strong>Corrigir:</strong> editando qualquer registro no próprio app.
          </li>
          <li>
            <strong>Excluir:</strong> em Configurações → Dados e privacidade →
            Excluir conta.
          </li>
          <li>
            <strong>Tirar dúvidas ou fazer outros pedidos</strong>, como
            informações sobre o compartilhamento, por meio de <LegalContact />.
          </li>
        </ul>
        <p>
          Você também pode apresentar reclamação à Autoridade Nacional de
          Proteção de Dados (ANPD).
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies e armazenamento local",
    body: (
      <p>
        Usamos apenas cookies e armazenamento local necessários para manter
        você conectado e lembrar preferências deste aparelho, como o tema. Não
        usamos cookies de publicidade nem ferramentas de rastreamento de
        terceiros.
      </p>
    ),
  },
  {
    id: "mudancas",
    title: "Mudanças nesta política",
    body: (
      <p>
        Se esta política mudar de forma relevante, avisaremos no aplicativo
        antes de a mudança valer. A data no topo indica a última atualização.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidade"
      title="Política de privacidade"
      intro={
        <p>
          Seus dados financeiros são seus. Esta página explica, sem rodeios, o
          que o Finync guarda, por que guarda e como você controla tudo.
        </p>
      }
      sections={sections}
      otherDocument={{ href: "/termos", label: "Termos de uso" }}
    />
  );
}
