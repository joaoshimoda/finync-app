import { expect, test } from "@playwright/test";

/* The theme is applied by an inline script before the first paint:
   "Automático" follows the operating system, a saved choice wins. */

test.describe("theme", () => {
  test("follows a light operating system by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/demo#overview");
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
  });

  test("follows a dark operating system by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/demo#overview");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });

  test("a saved choice overrides the operating system", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.setItem("finync-theme", "dark"));
    await page.goto("/demo#overview");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator("html")).not.toHaveClass(/\blight\b/);
  });

  test("wallet cards keep their colours in the light theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/demo#cards");
    const card = page.locator(".theme-fixed").first();
    await expect(card).toBeVisible();
    const text = await card.evaluate((element) => getComputedStyle(element).getPropertyValue("--color-white").trim());
    expect(text).toBe("#fff");
  });
});
