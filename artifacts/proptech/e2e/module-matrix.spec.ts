import { expect, test, type Page } from "@playwright/test";

type SignupModule = "Строительство" | "Финансы" | "Аренда" | "Закуп" | "CRM";

const password = process.env.E2E_PASSWORD || "PlanalitycE2E!2026";
const canAutoRegister = process.env.E2E_AUTO_REGISTER === "1";

const modulePaths = {
	construction: "/construction/projects",
	finance: "/construction/accounts",
	rental: "/rental/properties",
	warehouse: "/warehouse/items",
	crm: "/crm/leads",
} as const;

async function selectModules(page: Page, modules: SignupModule[]) {
	for (const moduleName of modules) {
		const card = page.locator("button", { hasText: moduleName }).first();
		await expect(card).toBeVisible();
		const isActive = (await card.getAttribute("aria-pressed")) === "true";
		if (!isActive) await card.click();
	}

	if (!modules.includes("Строительство")) {
		const constructionCard = page.locator("button", { hasText: "Строительство" }).first();
		const isActive = (await constructionCard.getAttribute("aria-pressed")) === "true";
		if (isActive) await constructionCard.click();
	}
}

async function registerCompany(page: Page, modules: SignupModule[]) {
	const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	const email = `e2e-modules-${suffix}@planalityc.test`;

	await page.goto("/register");
	await page.getByPlaceholder("ООО «СтройИнвест»").fill(`Planalityc ${suffix}`);
	await page.getByPlaceholder("12345678901234").fill("99999999999999");
	await page.getByPlaceholder("+996 700 000 000").fill("+996 700 000 000");
	await page.getByPlaceholder("info@company.kg").fill(email);
	await selectModules(page, modules);
	await page.getByRole("button", { name: /Далее/ }).click();

	await page.getByPlaceholder("Айбек").fill("E2E");
	await page.getByPlaceholder("Асанов").fill("Matrix");
	await page.getByPlaceholder("Минимум 12 символов").fill(password);
	await page.getByPlaceholder("Повторите пароль").fill(password);
	await page.getByRole("button", { name: /Зарегистрироваться/ }).click();
	await page.waitForURL(
		/(dashboard|construction|rental|crm|warehouse|properties)/,
		{ timeout: 25_000 },
	);
}

async function expectRouteAllowed(page: Page, path: string) {
	await page.goto(path);
	await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
	await expect(page.locator("body")).not.toContainText("Страница не загрузилась");
}

async function expectRouteBlocked(page: Page, path: string) {
	await page.goto(path);
	await expect(page).not.toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}(?:$|[?#])`));
}

test.describe("Tenant module matrix smoke", () => {
	test.skip(!canAutoRegister, "Включите E2E_AUTO_REGISTER=1 для создания временных компаний");

	const scenarios: Array<{
		name: string;
		modules: SignupModule[];
		allowed: Array<keyof typeof modulePaths>;
		blocked: Array<keyof typeof modulePaths>;
	}> = [
		{
			name: "only rental",
			modules: ["Аренда"],
			allowed: ["rental"],
			blocked: ["construction", "finance", "warehouse", "crm"],
		},
		{
			name: "only warehouse",
			modules: ["Закуп"],
			allowed: ["warehouse"],
			blocked: ["construction", "finance", "rental", "crm"],
		},
		{
			name: "construction + warehouse",
			modules: ["Строительство", "Закуп"],
			allowed: ["construction", "warehouse"],
			blocked: ["finance", "rental", "crm"],
		},
		{
			name: "full suite",
			modules: ["Строительство", "Финансы", "Аренда", "Закуп", "CRM"],
			allowed: ["construction", "finance", "rental", "warehouse", "crm"],
			blocked: [],
		},
	];

	for (const scenario of scenarios) {
		test(scenario.name, async ({ page }) => {
			await registerCompany(page, scenario.modules);

			for (const key of scenario.allowed) {
				await expectRouteAllowed(page, modulePaths[key]);
			}

			for (const key of scenario.blocked) {
				await expectRouteBlocked(page, modulePaths[key]);
			}
		});
	}
});
