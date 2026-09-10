import { expect, test } from "@playwright/test";

test.describe("public routes", () => {
  test("landing exposes the primary journeys", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Seu dinheiro, sem pontos cegos/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Criar conta/i }).first(),
    ).toHaveAttribute("href", "/signup");
    await expect(
      page.getByRole("link", { name: /Explorar demonstração/i }),
    ).toHaveAttribute("href", "/demo");
  });

  test("demo renders without horizontal overflow", async ({ page }) => {
    await page.goto("/demo");

    await expect(
      page.getByRole("heading", { name: "Visão geral" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  });

  test("login exposes credentials and recovery flow", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Bem-vindo de volta" }),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
    await expect(
      page.getByRole("link", { name: "Esqueci minha senha" }),
    ).toHaveAttribute("href", "/recuperar-senha");
  });

  test("signup exposes the account creation form", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: "Crie sua conta" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nome")).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar conta" })).toBeEnabled();
  });
});

test.describe("server-side route protection", () => {
  for (const route of ["/dashboard", "/dashboard/transactions", "/configuracoes"]) {
    test(`${route} redirects anonymous users`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "Bem-vindo de volta" }),
      ).toBeVisible();
    });
  }
});
