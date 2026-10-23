import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email!);
  await page.getByRole("textbox", { name: "Senha" }).fill(password!);
  await page.locator("form").getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });
}

test.describe("authenticated read-only smoke", () => {
  test.skip(
    !email || !password,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to enable authenticated smoke tests.",
  );

  test("core financial routes load without an error boundary", async ({ page }) => {
    await signIn(page);

    const routes = [
      ["/dashboard", /^Olá,/],
      ["/dashboard/transactions", "Transações"],
      ["/dashboard/cards", "Cartões e faturas"],
      ["/dashboard/fixed", "Contas fixas e assinaturas"],
      ["/dashboard/orcamentos", "Orçamentos"],
      ["/dashboard/dependentes", "Dependentes"],
      ["/dashboard/analytics", "Análises"],
      ["/dashboard/importar", "Importar fatura"],
      ["/dashboard/exportar", "Exportar e backup"],
      ["/dashboard/integridade", "Integridade dos dados"],
      ["/dashboard/atividades", "Atividades"],
    ] as const;

    for (const [route, heading] of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText("Não foi possível carregar esta área")).toHaveCount(0);
    }
  });
});
