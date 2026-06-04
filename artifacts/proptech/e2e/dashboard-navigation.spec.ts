import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Dashboard navigation smoke", () => {
	test.beforeEach(() => {
		test.skip(
			!email || !password,
			"Задайте E2E_EMAIL и E2E_PASSWORD для smoke-теста",
		);
	});

	test("login → смена модуля → вкладка Dashboard", async ({ page }) => {
		await page.goto("/login");
		await page.locator('input[type="email"]').fill(email!);
		await page.locator('input[type="password"]').fill(password!);
		await page.locator('button[type="submit"]').click();

		await page.waitForURL(
			/(dashboard|construction|rental|crm|warehouse|properties)/,
			{ timeout: 20_000 },
		);

		// Модули теперь переключаются без dropdown: активный модуль подписан,
		// остальные раскрывают label на hover и ведут сразу на свой маршрут.
		const crmModule = page.locator('header a[href^="/crm"], header a[href^="/dashboard?tab=sales"]').first();
		if (await crmModule.isVisible()) {
			await crmModule.hover();
			await crmModule.click();
			await expect(page).toHaveURL(/(\/crm\/|tab=sales)/);
		}

		// Unified Dashboard — смена вкладки
		await page.goto("/dashboard?tab=control");
		await expect(page.getByRole("heading", { name: "Обзор" })).toBeVisible();

		const financeTab = page.getByRole("tab", { name: "Финансы" });
		if (await financeTab.isVisible()) {
			await financeTab.click();
			await expect(page).toHaveURL(/tab=finance/);
		}
	});
});
