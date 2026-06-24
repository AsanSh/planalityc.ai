import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, Lock, Unlock, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PortalPreviewDialog, type PortalPreviewType } from "@/components/portal-preview-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import {
	getPortalAccess,
	getPortalPath,
	resolvePortalKind,
	type PortalAccessRecord,
	upsertPortalAccess,
} from "@/lib/client-portal";

interface PortalAccessCellProps {
	counterpartyId: number;
	counterpartyName: string;
	roles: string[];
	phone?: string | null;
	email?: string | null;
}

type PortalKind = PortalAccessRecord["portalKind"];

// portalKind → реальный create-эндпоинт и имя поля id в теле запроса.
const CREATE_ENDPOINT: Record<PortalKind, string> = {
	buyer: "/portal/create-buyer-account",
	tenant: "/portal/create-tenant-account",
	investor: "/portal/create-investor-account",
	contractor: "/portal/create-contractor-account",
	supplier: "/portal/create-supplier-account",
};

const ID_FIELD: Record<PortalKind, string> = {
	buyer: "buyerId",
	tenant: "tenantId",
	investor: "investorId",
	contractor: "contractorId",
	supplier: "supplierId",
};

interface AccountStatus {
	exists: boolean;
	userId?: number;
	phone?: string | null;
	email?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	isActive?: boolean;
}

function splitName(fullName: string) {
	const parts = (fullName || "").trim().split(/\s+/);
	return {
		firstName: parts[0] || "",
		lastName: parts.slice(1).join(" ") || "",
	};
}

export function PortalAccessCell({
	counterpartyId,
	counterpartyName,
	roles,
	phone,
	email,
}: PortalAccessCellProps) {
	const { toast } = useToast();
	const qc = useQueryClient();
	const portalKind = useMemo(() => resolvePortalKind(roles), [roles]);
	const cached = useMemo(() => getPortalAccess(counterpartyId), [counterpartyId]);

	const [previewOpen, setPreviewOpen] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [form, setForm] = useState(() => ({
		phone: phone || "",
		email: email || "",
		...splitName(counterpartyName),
	}));

	// Источник правды — сервер: есть ли уже аккаунт в портале у контрагента.
	const { data: status } = useQuery<AccountStatus>({
		queryKey: ["portal-account-status", portalKind, counterpartyId],
		queryFn: () =>
			api
				.get<AccountStatus>(`/portal/account-status/${portalKind}/${counterpartyId}`)
				.then((r) => r.data),
		enabled: !!counterpartyId,
	});

	const enabled = Boolean(status?.exists);
	const login = status?.phone || status?.email || cached?.login;
	const portalPath = getPortalPath(portalKind);
	const previewType = portalKind as PortalPreviewType;

	useEffect(() => {
		if (!formOpen) return;
		setForm({
			phone: phone || "",
			email: email || "",
			...splitName(counterpartyName),
		});
	}, [formOpen, phone, email, counterpartyName]);

	const createMutation = useMutation({
		mutationFn: async () => {
			const res = await api.post<{
				user?: { phone?: string | null; email?: string | null };
				loginUrl?: string;
				created: boolean;
			}>(CREATE_ENDPOINT[portalKind], {
				[ID_FIELD[portalKind]]: counterpartyId,
				phone: form.phone,
				email: form.email || undefined,
				firstName: form.firstName,
				lastName: form.lastName,
			});
			return res.data;
		},
		onSuccess: (data) => {
			const serverLogin = data?.user?.phone || data?.user?.email || form.phone;
			// localStorage остаётся только UI-кэшем, отражающим состояние сервера.
			upsertPortalAccess({
				counterpartyId,
				counterpartyName,
				roles,
				phone: form.phone,
				email: form.email || null,
				enabled: true,
			});
			void qc.invalidateQueries({
				queryKey: ["portal-account-status", portalKind, counterpartyId],
			});
			setFormOpen(false);
			toast({
				title: "Доступ к порталу открыт",
				description: data?.loginUrl
					? `Логин: ${serverLogin}. Вход: ${data.loginUrl} (по SMS-коду)`
					: `Логин: ${serverLogin}. Вход — по телефону и SMS-коду.`,
			});
		},
		onError: (e: unknown) => {
			toast({
				title: getApiErrorMessage(e, "Не удалось открыть доступ к порталу"),
				variant: "destructive",
			});
		},
	});

	const submit = () => {
		if (!form.phone || !form.firstName || !form.lastName) {
			toast({ title: "Укажите телефон, имя и фамилию", variant: "destructive" });
			return;
		}
		createMutation.mutate();
	};

	return (
		<>
			<div className="flex min-w-[260px] items-center justify-between gap-2">
				<div className="min-w-0">
					<p
						className={`text-[11px] font-semibold ${enabled ? "text-emerald-700" : "text-am-text-muted"}`}
					>
						{enabled ? "Портал открыт" : "Нет доступа"}
					</p>
					<p className="truncate text-[10px] text-am-text-subtle" title={login || "Создать доступ"}>
						{enabled ? login : "покупатель / арендатор / поставщик"}
					</p>
				</div>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						size="icon"
						variant="outline"
						onClick={() => setPreviewOpen(true)}
						className="h-8 w-8 rounded-full"
						title="Превью портала клиента"
					>
						<Eye className="h-3.5 w-3.5" />
					</Button>
					{enabled && (
						<a
							href={portalPath}
							target="_blank"
							rel="noreferrer"
							className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-am-border bg-white text-am-text-muted shadow-sm hover:text-am-text-strong"
							title="Открыть портал"
						>
							<ExternalLink className="h-3.5 w-3.5" />
						</a>
					)}
					{!enabled && (
						<Button
							type="button"
							size="sm"
							variant="default"
							onClick={() => setFormOpen(true)}
							className="h-8 gap-1.5 rounded-full bg-teal-600 px-3 hover:bg-teal-700"
						>
							<Unlock className="h-3.5 w-3.5" />
							Открыть
						</Button>
					)}
					{enabled && (
						<span
							className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700"
							title="Доступ к порталу выдан"
						>
							<Lock className="h-3.5 w-3.5" />
							Выдан
						</span>
					)}
				</div>
			</div>

			<Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserPlus className="h-5 w-5 text-teal-600" />
							Доступ в портал клиента
						</DialogTitle>
						<DialogDescription>
							Для «{counterpartyName}» будет создан личный кабинет с входом по номеру
							телефона и SMS-коду.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Телефон *</Label>
							<Input
								className="mt-1"
								type="tel"
								placeholder="+996 700 123 456"
								value={form.phone}
								onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
							/>
							<p className="mt-1 text-[10px] text-am-text-subtle">
								На этот номер придёт SMS-код для входа
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div>
								<Label>Имя *</Label>
								<Input
									className="mt-1"
									value={form.firstName}
									onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
								/>
							</div>
							<div>
								<Label>Фамилия *</Label>
								<Input
									className="mt-1"
									value={form.lastName}
									onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
								/>
							</div>
						</div>
						<div>
							<Label>Email (необязательно)</Label>
							<Input
								className="mt-1"
								type="email"
								value={form.email}
								onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
							/>
						</div>
						<div className="flex gap-2 pt-1">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => setFormOpen(false)}
							>
								Отмена
							</Button>
							<Button
								className="flex-1 bg-teal-600 hover:bg-teal-700"
								onClick={submit}
								disabled={createMutation.isPending}
							>
								{createMutation.isPending ? "..." : "Создать доступ"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<PortalPreviewDialog
				type={previewType}
				id={counterpartyId}
				open={previewOpen}
				onClose={() => setPreviewOpen(false)}
			/>
		</>
	);
}
