# 📊 Finync

> Um gerenciador financeiro minimalista, focado em performance, controle de estado em tempo real e arquitetura moderna.

![Status do Projeto](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)
![Licença](https://img.shields.io/badge/License-MIT-blue)

---

## 💻 Tecnologias Utilizadas

Este projeto foi construído utilizando o que há de mais moderno no ecossistema front-end e back-end as a service:

*   **[Next.js 14](https://nextjs.org/):** Framework React com App Router para renderização otimizada.
*   **[React](https://react.dev/):** Biblioteca para construção de interfaces de usuário.
*   **[TypeScript](https://www.typescriptlang.org/):** Tipagem estática para maior segurança e previsibilidade do código.
*   **[Tailwind CSS](https://tailwindcss.com/):** Estilização utilitária para um design responsivo e ágil.
*   **[Zustand](https://github.com/pmndrs/zustand):** Gerenciamento de estado global leve e performático.
*   **[Supabase](https://supabase.com/):** Banco de dados PostgreSQL com autenticação e políticas de segurança (RLS) nativas.
*   **[Lucide React](https://lucide.dev/):** Ícones limpos e consistentes.
*   **[Sonner](https://sonner.emilkowal.ski/):** Sistema de notificações (Toasts) elegante e acessível.

---

## ✨ Funcionalidades (MVP)

*   **Autenticação Segura:** Login e cadastro de usuários integrados diretamente com a API do Supabase.
*   **Proteção de Rotas:** Redirecionamento automático e blindagem do Dashboard contra acessos não autorizados.
*   **Gerenciamento de Cartões:** Cadastro de cartões de crédito/débito vinculados exclusivamente ao usuário autenticado (RLS).
*   **Fluxo de Transações:** Adição de receitas e despesas com atualização matemática em tempo real.
*   **Sincronização de Estado:** Integração fluida entre o banco de dados e a interface utilizando Zustand, eliminando telas de carregamento desnecessárias e garantindo a persistência dos dados.

---

## 🚀 Como Executar o Projeto Localmente

Siga os passos abaixo para rodar uma cópia deste projeto na sua máquina local:

### 1. Clone o repositório
```bash
git clone [https://github.com/SEU_USUARIO/finync.git](https://github.com/joaoshimoda/finync.git)
cd finync