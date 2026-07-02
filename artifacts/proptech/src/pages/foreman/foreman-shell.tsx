import { Boxes, ClipboardList, ScrollText } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const TABS = [
	{ href: "/foreman", label: "Остатки", icon: Boxes },
	{ href: "/foreman/requests", label: "Мои заявки", icon: ScrollText },
	{ href: "/foreman/new", label: "Создать", icon: ClipboardList },
];

/** Лёгкая мобильная оболочка приложения прораба (PWA): шапка + нижняя навигация. */
export function ForemanShell({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	const [location] = useLocation();
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
				<h1 className="text-lg font-semibold">{title}</h1>
			</header>

			<main className="mx-auto w-full max-w-md flex-1 overflow-y-auto p-4 pb-24">
				{children}
			</main>

			<nav className="fixed inset-x-0 bottom-0 border-t bg-card">
				<div className="mx-auto flex max-w-md">
					{TABS.map((t) => {
						const active = location === t.href;
						const Icon = t.icon;
						return (
							<Link
								key={t.href}
								href={t.href}
								className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
									active ? "text-primary" : "text-muted-foreground"
								}`}
							>
								<Icon className="h-5 w-5" />
								{t.label}
							</Link>
						);
					})}
				</div>
			</nav>
		</div>
	);
}
