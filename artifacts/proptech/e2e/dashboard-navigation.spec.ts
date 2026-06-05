import { test, expect, type Page } from "@playwright/test";

const email =
	process.env.E2E_EMAIL ||
	`e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@planalityc.test`;
const password = process.env.E2E_PASSWORD || "PlanalitycE2E!2026";
const hasProvidedCredentials = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
const canAutoRegister = process.env.E2E_AUTO_REGISTER === "1";

async function loginOrRegister(page: Page) {
	test.skip(
		!hasProvidedCredentials && !canAutoRegister,
		"Задайте E2E_EMAIL/E2E_PASSWORD или включите E2E_AUTO_REGISTER=1",
	);

	await page.goto("/login");
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').fill(password);
	await page.locator('button[type="submit"]').click();

	try {
		await page.waitForURL(
			/(dashboard|construction|rental|crm|warehouse|properties)/,
			{ timeout: 12_000 },
		);
		return;
	} catch {
		if (hasProvidedCredentials) {
			throw new Error("E2E credentials were provided but login failed");
		}
	}

	await page.goto("/register");
	await page.getByPlaceholder("ООО «СтройИнвест»").fill("Planalityc E2E");
	await page.getByPlaceholder("12345678901234").fill("99999999999999");
	await page.getByPlaceholder("+996 700 000 000").fill("+996 700 000 000");
	await page.getByPlaceholder("info@company.kg").fill(email);
	await page.getByRole("button", { name: /Далее/ }).click();

	await page.getByPlaceholder("Айбек").fill("E2E");
	await page.getByPlaceholder("Асанов").fill("Tester");
	await page.getByPlaceholder("Минимум 12 символов").fill(password);
	await page.getByPlaceholder("Повторите пароль").fill(password);
	await page.getByRole("button", { name: /Зарегистрироваться/ }).click();

	await page.waitForURL(
		/(dashboard|construction|rental|crm|warehouse|properties)/,
		{ timeout: 20_000 },
	);
}

test.describe("Dashboard navigation smoke", () => {
	test("login → смена модуля → вкладка Dashboard", async ({ page }) => {
		await loginOrRegister(page);

		// Модули теперь переключаются без dropdown: активный модуль подписан,
		// остальные раскрывают label на hover и ведут сразу на свой маршрут.
		const crmModule = page.locator('header a[href^="/crm"], header a[href^="/dashboard?tab=sales"]').first();
		if (await crmModule.isVisible()) {
			await crmModule.hover();
			await crmModule.click();
			await expect(page).toHaveURL(/(\/crm\/|tab=sales)/);
		}

		// Unified Dashboard keeps content visible; module switching lives in the fixed top rail.
		await page.goto("/dashboard?tab=control");
		await expect(page.locator('[role="tabpanel"]')).toBeVisible();
		await expect(page.locator('[role="tablist"]')).toHaveCount(0);
	});
});
