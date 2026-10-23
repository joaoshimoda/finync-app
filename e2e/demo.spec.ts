import { expect, test, type Page } from "@playwright/test";

/* The demo runs the real app pages on in-memory data, so it doubles as a
   login-free smoke test of every main screen and its key actions. The
   fictional data is built relative to today, so assertions avoid exact
   amounts and rely on structure and on what an action changes. */

const views = [
  { hash: "overview", heading: /^Olá, Marina/ },
  { hash: "transactions", heading: "Transações" },
  { hash: "cards", heading: "Cartões e faturas" },
  { hash: "fixed", heading: "Contas fixas e assinaturas" },
  { hash: "budgets", heading: "Orçamentos" },
  { hash: "dependents", heading: "Dependentes" },
  { hash: "analytics", heading: "Análises" },
] as const;

/* Any call to the Supabase API from the demo is a leak of fake data or a
   failed write; collect them so each test can assert there were none. */
function watchSupabase(page: Page) {
  const calls: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/supabase\.(co|in)\//.test(url) || url.includes("/rest/v1/") || url.includes("/auth/v1/")) {
      calls.push(`${request.method()} ${url}`);
    }
  });
  return calls;
}

async function openView(page: Page, hash: string) {
  await page.goto(`/demo#${hash}`);
  const view = views.find((item) => item.hash === hash)!;
  await expect(page.getByRole("heading", { level: 1, name: view.heading })).toBeVisible();
}

test.describe("demo", () => {
  for (const view of views) {
    test(`${view.hash} renders without errors or overflow`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const supabaseCalls = watchSupabase(page);

      await openView(page, view.hash);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("Não foi possível carregar esta área")).toHaveCount(0);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      expect(errors).toEqual([]);
      expect(supabaseCalls).toEqual([]);
    });
  }

  test("paying a fixed bill moves it to paid and can be undone", async ({ page }) => {
    const supabaseCalls = watchSupabase(page);
    await openView(page, "fixed");

    const payButtons = page.getByRole("button", { name: /^Marcar .+ como paga$/ });
    const openBefore = await payButtons.count();
    test.skip(openBefore === 0, "Every bill of the current month is already paid today.");

    const label = await payButtons.first().getAttribute("aria-label");
    const billName = label!.replace(/^Marcar /, "").replace(/ como paga$/, "");
    await payButtons.first().click();

    await expect(page.getByText(`${billName} marcada como paga.`)).toBeVisible();
    await expect(payButtons).toHaveCount(openBefore - 1);
    await expect(
      page.getByRole("button", { name: `Marcar ${billName} como pendente` }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Desfazer" }).first().click();
    await expect(payButtons).toHaveCount(openBefore);
    expect(supabaseCalls).toEqual([]);
  });

  test("subscriptions tab shows the yearly cost", async ({ page }) => {
    await openView(page, "fixed");
    await page.getByRole("tab", { name: /Assinaturas/ }).click();

    await expect(page.getByText(/Suas assinaturas somam/)).toBeVisible();
    await expect(page.getByText("Netflix")).toBeVisible();
  });

  test("transactions search narrows the list", async ({ page }) => {
    await openView(page, "transactions");
    await page.getByPlaceholder("Buscar transações").fill("Aluguel");

    await expect(page.getByText("Aluguel").first()).toBeVisible();
    await expect(page.getByText("Plano de saúde")).toHaveCount(0);
  });

  test("selecting another card switches the invoice", async ({ page }) => {
    await openView(page, "cards");
    await page.getByRole("button", { name: /Inter/ }).first().click();

    await expect(page.getByText(/Fatura de /).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Inter/ }).first()).toBeVisible();
  });

  test("dependents show what is still owed and a ready statement", async ({ page }) => {
    await openView(page, "dependents");
    await page.getByRole("button", { name: /Ana Souza/ }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Ana Souza" })).toBeVisible();
    const whatsapp = page.getByRole("link", { name: "Enviar resumo pelo WhatsApp" });
    await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=.*Ana/);
  });

  test("budgets show the month pace and per-category cards", async ({ page }) => {
    await openView(page, "budgets");

    /* The pace sentence is rendered twice (mobile and desktop layouts). */
    await expect(page.getByText(/% do mês passou/).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Alimentação").first()).toBeVisible();
    await page.getByRole("button", { name: /^Mais usado$/ }).click();
    await expect(page.getByRole("button", { name: /^Mais usado$/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("links inside pages stay in the demo", async ({ page, isMobile }) => {
    test.skip(isMobile, "The overview shortcut is checked once, on desktop.");
    await openView(page, "overview");

    await page.getByRole("link", { name: /Gerenciar/ }).first().click();
    await expect(page).toHaveURL(/\/demo#cards$/);
    await expect(page.getByRole("heading", { level: 1, name: "Cartões e faturas" })).toBeVisible();
  });

  test("restart brings back the original data", async ({ page }) => {
    await openView(page, "fixed");
    const payButtons = page.getByRole("button", { name: /^Marcar .+ como paga$/ });
    const openBefore = await payButtons.count();
    test.skip(openBefore === 0, "Every bill of the current month is already paid today.");

    await payButtons.first().click();
    await expect(payButtons).toHaveCount(openBefore - 1);

    await page.getByRole("button", { name: /Reiniciar/ }).click();
    await expect(page.getByText("Demonstração reiniciada.")).toBeVisible();
    await expect(payButtons).toHaveCount(openBefore);
  });
});
