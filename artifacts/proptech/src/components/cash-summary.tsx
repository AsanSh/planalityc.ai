import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { convertViaKgs, type NbkrResponse } from "@/lib/nbkr-currency";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface CashAccount {
	id: number | string;
	name: string;
	currentBalance: string | number;
	currency: string;
	legalEntityId?: number | null;
}

type LegalEntity = { id: number; name: string };

const EXCLUDED_KEY = "cashExcludedAccounts";

function loadExcluded(): Set<string> {
	try {
		return new Set(JSON.parse(localStorage.getItem(EXCLUDED_KEY) || "[]"));
	} catch {
		return new Set();
	}
}

function fmtMoney(n: number, currency: string): string {
	const formatted = new Intl.NumberFormat("ru-RU", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(n);
	return `${formatted} ${currency}`;
}

/**
 * Сводный виджет «Деньги бизнеса»: общий итог в валюте по умолчанию,
 * по клику раскрывается панель со счетами, сгруппированными по ОсОО
 * (юр. лицам) с подытогами. Переключатель «По юр. лицам / Все счета».
 * Тумблер у каждого счёта включает/исключает его из итога (хранится
 * локально). Курсы валют — с НБКР (/nbkr/rates).
 */
export function CashSummary({ accounts }: { accounts: CashAccount[] }) {
	const [byEntity, setByEntity] = useState(true);
	const [excluded, setExcluded] = useState<Set<string>>(loadExcluded);

	const { data: company } = useQuery({
		queryKey: ["company-my"],
		queryFn: () => api.get("/companies/my").then((r) => r.data),
		staleTime: 5 * 60 * 1000,
	});
	const { data: nbkr } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates"],
		queryFn: () => api.get("/nbkr/rates").then((r) => r.data),
		staleTime: 60 * 60 * 1000,
	});
	const { data: legalRaw = [] } = useQuery<LegalEntity[]>({
		queryKey: ["legal-entities"],
		queryFn: () => api.get<LegalEntity[]>("/legal-entities").then((r) => r.data),
		staleTime: 5 * 60 * 1000,
	});

	const defaultCurrency: string = company?.defaultCurrency || "KGS";
	const rates = nbkr?.rates || {};
	const list = useMemo(
		() => (Array.isArray(accounts) ? accounts : []),
		[accounts],
	);

	const isExcluded = (a: CashAccount) => excluded.has(String(a.id));

	function toggle(a: CashAccount) {
		setExcluded((prev) => {
			const next = new Set(prev);
			const k = String(a.id);
			if (next.has(k)) next.delete(k);
			else next.add(k);
			try {
				localStorage.setItem(EXCLUDED_KEY, JSON.stringify([...next]));
			} catch {
				/* ignore */
			}
			return next;
		});
	}

	const toDefault = (a: CashAccount) =>
		convertViaKgs(
			parseFloat(String(a.currentBalance || "0")) || 0,
			a.currency || "KGS",
			defaultCurrency,
			rates,
		);

	const total = list.reduce(
		(sum, a) => sum + (isExcluded(a) ? 0 : toDefault(a)),
		0,
	);

	const groups = useMemo(() => {
		const names = new Map<number, string>();
		(Array.isArray(legalRaw) ? legalRaw : []).forEach((e) =>
			names.set(e.id, e.name),
		);
		const map = new Map<
			string,
			{ key: string; name: string; accounts: CashAccount[]; subtotal: number }
		>();
		for (const a of list) {
			const hasEntity = a.legalEntityId != null;
			const key = hasEntity ? String(a.legalEntityId) : "none";
			const name = hasEntity
				? names.get(a.legalEntityId as number) ?? `ОсОО #${a.legalEntityId}`
				: "Без ОсОО";
			const g = map.get(key) ?? { key, name, accounts: [], subtotal: 0 };
			g.accounts.push(a);
			if (!excluded.has(String(a.id))) g.subtotal += toDefault(a);
			map.set(key, g);
		}
		return Array.from(map.values()).sort((x, y) => y.subtotal - x.subtotal);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [list, legalRaw, rates, defaultCurrency, excluded]);

	const renderAccount = (a: CashAccount) => {
		const off = isExcluded(a);
		const bal = parseFloat(String(a.currentBalance || "0")) || 0;
		const showConverted = (a.currency || "KGS") !== defaultCurrency;
		return (
			<div
				key={a.id}
				className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-gray-50"
			>
				<Switch
					checked={!off}
					onCheckedChange={() => toggle(a)}
					className="scale-90 data-[state=checked]:bg-emerald-500"
					aria-label={off ? "Включить в итог" : "Исключить из итога"}
				/>
				<span
					className={cn(
						"mr-2 flex-1 truncate text-[13px]",
						off ? "text-gray-400 line-through" : "text-gray-600",
					)}
				>
					{a.name}
				</span>
				<span
					className={cn(
						"whitespace-nowrap text-right font-mono text-[13px]",
						off ? "text-gray-400" : "text-gray-900",
					)}
				>
					{fmtMoney(bal, a.currency || "KGS")}
					{showConverted && !off && (
						<span className="block text-[11px] text-gray-500">
							≈ {fmtMoney(toDefault(a), defaultCurrency)}
						</span>
					)}
				</span>
			</div>
		);
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 font-mono text-xs text-white transition-colors hover:bg-gray-700"
				>
					<Wallet className="h-3.5 w-3.5 opacity-70" />
					<span>Деньги бизнеса: {fmtMoney(total, defaultCurrency)}</span>
					<ChevronDown className="h-3.5 w-3.5 opacity-70" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-96 p-0">
				<div className="flex items-start justify-between gap-2 border-b px-4 py-3">
					<div>
						<div className="text-xs text-gray-500">Деньги бизнеса</div>
						<div className="text-base font-semibold text-gray-900">
							{fmtMoney(total, defaultCurrency)}
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50 p-0.5 text-[11px]">
						<button
							type="button"
							onClick={() => setByEntity(true)}
							className={cn(
								"rounded-full px-2.5 py-1 transition-colors",
								byEntity ? "bg-cyan-600 text-white" : "text-gray-600",
							)}
						>
							По юр. лицам
						</button>
						<button
							type="button"
							onClick={() => setByEntity(false)}
							className={cn(
								"rounded-full px-2.5 py-1 transition-colors",
								!byEntity ? "bg-cyan-600 text-white" : "text-gray-600",
							)}
						>
							Все счета
						</button>
					</div>
				</div>

				<div className="max-h-[420px] overflow-y-auto py-1">
					{list.length === 0 ? (
						<div className="px-4 py-3 text-sm text-gray-600">Счетов нет</div>
					) : byEntity ? (
						groups.map((g) => (
							<div key={g.key} className="py-1">
								<div className="flex items-center justify-between px-4 py-1.5">
									<span className="text-[13px] font-semibold text-gray-900">
										{g.name}
									</span>
									<span className="whitespace-nowrap font-mono text-[13px] font-semibold text-gray-900">
										{fmtMoney(g.subtotal, defaultCurrency)}
									</span>
								</div>
								{g.accounts.map(renderAccount)}
							</div>
						))
					) : (
						list.map(renderAccount)
					)}
				</div>

				{nbkr?.date && (
					<div className="border-t px-4 py-2 text-[11px] text-gray-600">
						Курс НБКР на {nbkr.date}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
