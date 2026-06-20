import { expect, test, type Page } from "@playwright/test";

const user = {
	id: 1,
	companyId: 1,
	email: "qa@planalityc.test",
	firstName: "QA",
	lastName: "Smoke",
	role: "company_admin",
	isActive: true,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const company = {
	id: 1,
	name: "Planalityc QA",
	legalName: "Planalityc QA LLC",
	bin: "00000000000000",
	phone: "+996 700 000 000",
	email: "qa@planalityc.test",
	address: "Bishkek",
	isActive: true,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const smokeRoutes = [
	"/",
	"/dashboard?tab=control",
	"/dashboard?tab=construction",
	"/construction/projects",
	"/construction/chess",
	"/construction/tasks",
	"/construction/budget",
	"/construction/accounts",
	"/construction/operations",
	"/crm/leads",
	"/crm/clients",
	"/crm/deals",
	"/crm/sales-contracts",
	"/rental/properties",
	"/rental/tenants",
	"/rental/contracts",
	"/rental/payments",
	"/warehouse/items",
	"/warehouse/requests",
	"/warehouse/marketplace",
	"/warehouse/orders",
	"/settings",
	"/users",
	"/counterparties",
] as const;

function getMockApiBody(path: string, method: string) {
	if (path === "/auth/me") return user;
	if (path.includes("/nbkr") || path.includes("/currency")) {
		return { rates: [], usd: 89, eur: 97, rub: 1 };
	}
	if (path.includes("/company") || path.includes("/companies")) {
		return path.match(/\/companies\/\d+$/) || path.includes("current")
			? company
			: [company];
	}
	if (method === "GET") return [];
	return { ok: true, id: 1 };
}

async function mockAuthenticatedApi(page: Page) {
	await page.addInitScript(() => {
		window.localStorage.setItem("auth_token", "qa-smoke-token");
	});

	await page.route("http://localhost:3000/**", async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(getMockApiBody(path, request.method())),
		});
	});
}

test.describe("Authenticated route smoke", () => {
	for (const routePath of smokeRoutes) {
		test(`${routePath} renders without app crash`, async ({ page }) => {
			const runtimeErrors: string[] = [];
			page.on("pageerror", (error) => runtimeErrors.push(error.message));
			page.on("console", (message) => {
				if (message.type() === "error") runtimeErrors.push(message.text());
			});

			await mockAuthenticatedApi(page);
			await page.goto(routePath, { waitUntil: "domcontentloaded" });
			await expect(page.locator("body")).not.toContainText("Страница не загрузилась");
			await expect(page.locator("body")).not.toContainText("404");
			expect(runtimeErrors).toEqual([]);
		});
	}
});
