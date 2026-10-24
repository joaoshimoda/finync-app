import type { Metadata } from "next";
import Link from "next/link";

import { LegalContact, LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Termos de uso · Finync",
  description: "As regras de uso do Finync e as responsabilidades de cada lado.",
};

const sections: LegalSection[] = [
  {
    id: "aceite",
    title: "Aceite",
    body: (
      <p>
        Ao criar uma conta ou usar o Finync, você concorda com estes termos e
        com a <Link href="/privacidade">política de privacidade</Link>. Se não
        concordar, não use o aplicativo.
      </p>
    ),
  },
  {
    id: "servico",
    title: "O que o Finync oferece",
    body: (
      <p>
        O Finync é uma ferramenta de organização financeira pessoal: registra
        cartões, faturas, contas, receitas e orçamentos, divide gastos com
        dependentes e gera projeções e relatórios a partir dos dados que você
        informa ou importa. O Finync não é banco, não movimenta dinheiro e não
        se conecta às suas contas bancárias.
      </p>
    ),
  },
  {
    id: "conta",
    title: "Sua conta",
    body: (
      <ul>
        <li>Você precisa ter pelo menos 18 anos ou autorização de um responsável.</li>
        <li>As informações de cadastro devem ser verdadeiras e atualizadas.</li>
        <li>
          Você é responsável por manter sua senha em segredo e pelas ações
          feitas com a sua conta. Se suspeitar de acesso indevido, troque a
          senha e use “Sair de todos os outros aparelhos” em Configurações.
        </li>
      </ul>
    ),
  },
  {
    id: "uso",
    title: "Uso permitido",
    body: (
      <>
        <p>Você concorda em não:</p>
        <ul>
          <li>tentar acessar dados de outras pessoas ou burlar as regras de segurança;</li>
          <li>usar o aplicativo para atividades ilegais;</li>
          <li>sobrecarregar, copiar ou fazer engenharia reversa do serviço.</li>
        </ul>
        <p>
          Contas que violem estas regras podem ser suspensas ou encerradas.
        </p>
      </>
    ),
  },
  {
    id: "informacoes",
    title: "Números e projeções",
    body: (
      <p>
        Saldos, projeções, lembretes e relatórios são calculados a partir do
        que você cadastra e importa, e podem conter diferenças em relação aos
        valores do seu banco. Eles servem para organização e{" "}
        <strong>não são aconselhamento financeiro</strong>. Confira sempre a
        fatura e o extrato oficiais antes de pagar ou tomar decisões.
      </p>
    ),
  },
  {
    id: "dados",
    title: "Seus dados",
    body: (
      <p>
        Os dados que você cadastra continuam sendo seus. Você pode exportá-los
        ou excluir a conta a qualquer momento, conforme a{" "}
        <Link href="/privacidade">política de privacidade</Link>. Recomendamos
        fazer backups periódicos pela tela de exportação.
      </p>
    ),
  },
  {
    id: "disponibilidade",
    title: "Disponibilidade e responsabilidade",
    body: (
      <p>
        Trabalhamos para manter o Finync estável e seguro, mas o serviço pode
        passar por manutenções, falhas ou interrupções. Na medida permitida
        pela lei, o Finync não se responsabiliza por perdas decorrentes de
        decisões tomadas com base nas informações exibidas, por dados
        incorretos informados pelo usuário ou por indisponibilidades
        temporárias. Nada nestes termos limita direitos garantidos pelo
        Código de Defesa do Consumidor.
      </p>
    ),
  },
  {
    id: "encerramento",
    title: "Encerramento",
    body: (
      <p>
        Você pode encerrar sua conta quando quiser, em Configurações → Dados e
        privacidade → Excluir conta. A exclusão é imediata e permanente.
      </p>
    ),
  },
  {
    id: "mudancas",
    title: "Mudanças nos termos",
    body: (
      <p>
        Podemos atualizar estes termos para refletir mudanças no aplicativo ou
        na lei. Mudanças relevantes serão avisadas no aplicativo antes de
        valer. Continuar usando o Finync depois disso significa concordar com
        a nova versão.
      </p>
    ),
  },
  {
    id: "contato",
    title: "Lei aplicável e contato",
    body: (
      <p>
        Estes termos seguem as leis do Brasil. Dúvidas podem ser enviadas para{" "}
        <LegalContact />.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Termos"
      title="Termos de uso"
      intro={
        <p>
          As regras para usar o Finync, escritas para serem lidas. Em resumo:
          os dados são seus, os números servem para organizar e não substituem
          a fatura oficial, e você pode sair quando quiser.
        </p>
      }
      sections={sections}
      otherDocument={{ href: "/privacidade", label: "Política de privacidade" }}
    />
  );
}
