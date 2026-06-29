import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Building2,
	CheckCircle2,
	KeyRound,
	Landmark,
	LayoutGrid,
	ShieldCheck,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
	company_admin: "Админ компании",
	sales_manager: "Менеджер продаж",
	finance: "Финансы",
	rental_manager: "Менеджер аренды",
	rental_department_head: "Руководитель отдела аренды",
	staff: "Сотрудник",
	administrator: "Администратор",
	accountant: "Бухгалтер",
	construction_director: "Директор по строительству",
	pto_engineer: "Инженер ПТО",
	procurement_specialist: "Специалист снабжения",
	cashier: "Кассир",
	lawyer: "Юрист",
};

const MODULE_CATEGORY_LABELS: Record<string, string> = {
	core: "Основные",
	analytics: "Аналитика",
	communication: "Коммуникации",
	operations: "Операции",
};

type Company = {
	id: number;
	name: string;
	legalName?: string | null;
	bin?: string | null;
	phone?: string | null;
	email?: string | null;
	address?: string | null;
	isActive: boolean;
	defaultCurrency?: string | null;
	moduleType?: string | null;
};

type PlatformUser = {
	id: number;
	email: string;
	phone?: string | null;
	firstName: string;
	lastName: string;
	role: string;
	isActive: boolean;
};

type PlatformModule = {
	key: string;
	name: string;
	description: string;
	category: string;
	isEnabled: boolean;
	enabledAt?: string | null;
	settings?: string | null;
};

type LegalEntity = {
	id: number;
	name: string;
	fullLegalName: string;
	inn: string;
	address?: string | null;
	phone?: string | null;
	email?: string | null;
	directorName?: string | null;
	accountant?: string | null;
	isActive: boolean;
};

type BankAccount = {
	id: number;
	legalEntityId?: number | null;
	module: string;
	name: string;
	type: string;
	bank?: string | null;
	bik?: string | null;
	accountNumber?: string | null;
	currency: string;
	openingBalance: string;
	currentBalance: string;
	isActive: boolean;
	notes?: string | null;
};

type CompanyDetailResponse = {
	company: Company;
	users: PlatformUser[];
	modules: PlatformModule[];
	legalEntities: LegalEntity[];
	bankAccounts: BankAccount[];
	summary: {
		usersTotal: number;
		usersActive: number;
		usersInactive: number;
		modulesEnabled: number;
		legalEntities: number;
		bankAccounts: number;
	};
};

function StatCard({
	label,
	value,
	hint,
	icon,
}: {
	label: string;
	value: string | number;
	hint?: string;
	icon: React.ReactNode;
}) {
	return (
		<Card className="rounded-[18px]">
			<CardContent className="flex items-center gap-4 p-4">
				<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
					{icon}
				</div>
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
						{label}
					</div>
					<div className="text-2xl font-semibold text-slate-950">{value}</div>
					{hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
				</div>
			</CardContent>
		</Card>
	);
}

export default function PlatformAdminCompanyDetail() {
	const [, params] = useRoute("/platform-admin/companies/:id");
	const id = params?.id;
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [saving, setSaving] = useState(false);
	const [resetLink, setResetLink] = useState<string | null>(null);
	const [resetEmail, setResetEmail] = useState("");
	const [moduleBusy, setModuleBusy] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["platform-admin-company", id],
		enabled: !!id,
		queryFn: () =>
			api
				.get<CompanyDetailResponse>(`/platform-admin/companies/${id}`)
				.then((r) => r.data),
	});

	const [form, setForm] = useState({
		name: "",
		legalName: "",
		bin: "",
		phone: "",
		email: "",
		address: "",
		isActive: true,
	});

	const company = data?.company;

	useEffect(() => {
		if (!company) return;
		setForm({
			name: company.name,
			legalName: company.legalName || "",
			bin: company.bin || "",
			phone: company.phone || "",
			email: company.email || "",
			address: company.address || "",
			isActive: company.isActive,
		});
	}, [company?.id]);

	function invalidateCompany() {
		queryClient.invalidateQueries({ queryKey: ["platform-admin-company", id] });
		queryClient.invalidateQueries({ queryKey: ["platform-admin-companies"] });
		queryClient.invalidateQueries({ queryKey: ["platform-admin-dashboard"] });
	}

	async function saveCompany() {
		if (!id) return;
		setSaving(true);
		try {
			await api.patch(`/platform-admin/companies/${id}`, form);
			toast({ title: "Данные компании сохранены" });
			invalidateCompany();
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				description: e instanceof Error ? e.message : "Не удалось сохранить",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}

	async function sendPasswordReset(userId: number, email: string) {
		if (!confirm(`Отправить ${email} ссылку для входа и установки пароля?`)) {
			return;
		}
		try {
			const { data } = await api.post<{
				message: string;
				emailSent: boolean;
				resetLink: string;
			}>(`/platform-admin/users/${userId}/send-password-reset`);
			setResetEmail(email);
			setResetLink(data.resetLink);
			toast({
				title: data.emailSent ? "Письмо отправлено" : "Ссылка создана",
				description: data.message,
			});
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				variant: "destructive",
				description: e instanceof Error ? e.message : "",
			});
		}
	}

	async function patchUser(userId: number, payload: Partial<PlatformUser>) {
		try {
			await api.patch(`/platform-admin/users/${userId}`, payload);
			invalidateCompany();
			toast({ title: "Пользователь обновлён" });
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				variant: "destructive",
				description: e instanceof Error ? e.message : "",
			});
		}
	}

	async function toggleModule(moduleKey: string, isEnabled: boolean) {
		if (!id) return;
		setModuleBusy(moduleKey);
		try {
			await api.patch(`/platform-admin/companies/${id}/modules/${moduleKey}`, {
				isEnabled,
			});
			invalidateCompany();
			toast({
				title: isEnabled ? "Модуль включён" : "Модуль отключён",
			});
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				variant: "destructive",
				description: e instanceof Error ? e.message : "",
			});
		} finally {
			setModuleBusy(null);
		}
	}

	async function toggleLegalEntity(entityId: number, isActive: boolean) {
		try {
			await api.patch(`/platform-admin/legal-entities/${entityId}`, { isActive });
			invalidateCompany();
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				variant: "destructive",
				description: e instanceof Error ? e.message : "",
			});
		}
	}

	async function toggleBankAccount(accountId: number, isActive: boolean) {
		try {
			await api.patch(`/platform-admin/bank-accounts/${accountId}`, { isActive });
			invalidateCompany();
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				variant: "destructive",
				description: e instanceof Error ? e.message : "",
			});
		}
	}

	if (isLoading) {
		return <Skeleton className="h-96 w-full" />;
	}

	if (!company || !data) {
		return <p className="text-muted-foreground">Компания не найдена</p>;
	}

	const modulesByCategory = data.modules.reduce<Record<string, PlatformModule[]>>(
		(acc, module) => {
			const category = module.category || "operations";
			acc[category] = acc[category] || [];
			acc[category].push(module);
			return acc;
		},
		{},
	);

	return (
		<div className="space-y-6">
			<Link
				href="/platform-admin/companies"
				className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:underline"
			>
				<ArrowLeft className="h-4 w-4" /> К списку компаний
			</Link>

			<Card className="rounded-[22px]">
				<CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
					<div>
						<div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
							Админ портала
						</div>
						<h1 className="mt-2 text-3xl font-bold text-slate-950">
							{company.name}
						</h1>
						<p className="mt-1 text-sm text-slate-500">
							ID: {company.id} · {company.defaultCurrency || "KGS"} ·{" "}
							{company.moduleType || "workspace"}
						</p>
					</div>
					<Badge variant={company.isActive ? "default" : "secondary"}>
						{company.isActive ? "Компания активна" : "Компания отключена"}
					</Badge>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
				<StatCard
					label="Пользователи"
					value={data.summary.usersTotal}
					hint={`${data.summary.usersActive} активных`}
					icon={<Users className="h-5 w-5" />}
				/>
				<StatCard
					label="Модули"
					value={`${data.summary.modulesEnabled}/${data.modules.length}`}
					hint="включено"
					icon={<LayoutGrid className="h-5 w-5" />}
				/>
				<StatCard
					label="Юрлица"
					value={data.summary.legalEntities}
					icon={<Building2 className="h-5 w-5" />}
				/>
				<StatCard
					label="Счета"
					value={data.summary.bankAccounts}
					icon={<Landmark className="h-5 w-5" />}
				/>
				<StatCard
					label="Статус"
					value={company.isActive ? "OK" : "Stop"}
					hint="доступ компании"
					icon={<ShieldCheck className="h-5 w-5" />}
				/>
			</div>

			<Tabs defaultValue="company" className="space-y-4">
				<TabsList className="flex w-fit flex-wrap">
					<TabsTrigger value="company">Компания</TabsTrigger>
					<TabsTrigger value="modules">Модули</TabsTrigger>
					<TabsTrigger value="users">Пользователи</TabsTrigger>
					<TabsTrigger value="legal">Юрлица и счета</TabsTrigger>
				</TabsList>

				<TabsContent value="company">
					<Card>
						<CardHeader>
							<CardTitle>Данные организации</CardTitle>
							<CardDescription>
								Эти данные видит платформа и системные сервисы компании.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="md:col-span-2">
									<Label>Название</Label>
									<Input
										className="mt-1"
										value={form.name}
										onChange={(e) =>
											setForm((f) => ({ ...f, name: e.target.value }))
										}
									/>
								</div>
								<div className="md:col-span-2">
									<Label>Юридическое название</Label>
									<Input
										className="mt-1"
										value={form.legalName}
										onChange={(e) =>
											setForm((f) => ({ ...f, legalName: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label>БИН / ИНН</Label>
									<Input
										className="mt-1"
										value={form.bin}
										onChange={(e) =>
											setForm((f) => ({ ...f, bin: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label>Телефон</Label>
									<Input
										className="mt-1"
										value={form.phone}
										onChange={(e) =>
											setForm((f) => ({ ...f, phone: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label>Email</Label>
									<Input
										className="mt-1"
										value={form.email}
										onChange={(e) =>
											setForm((f) => ({ ...f, email: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label>Адрес</Label>
									<Input
										className="mt-1"
										value={form.address}
										onChange={(e) =>
											setForm((f) => ({ ...f, address: e.target.value }))
										}
									/>
								</div>
							</div>
							<div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<Switch
									checked={form.isActive}
									onCheckedChange={(v) =>
										setForm((f) => ({ ...f, isActive: v }))
									}
								/>
								<div>
									<Label>Компания активна</Label>
									<p className="text-xs text-slate-500">
										Если отключить, сотрудники компании не смогут работать в системе.
									</p>
								</div>
							</div>
							<Button
								onClick={saveCompany}
								disabled={saving}
								className="bg-cyan-700 hover:bg-cyan-800"
							>
								{saving ? "Сохранение..." : "Сохранить компанию"}
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="modules">
					<div className="space-y-4">
						{Object.entries(modulesByCategory).map(([category, modules]) => (
							<Card key={category}>
								<CardHeader>
									<CardTitle>
										{MODULE_CATEGORY_LABELS[category] || "Модули"}
									</CardTitle>
									<CardDescription>
										Супер-админ может включать и отключать доступные продукты компании.
									</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
									{modules.map((module) => (
										<div
											key={module.key}
											className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
										>
											<div className="flex items-start justify-between gap-4">
												<div>
													<div className="font-semibold text-slate-950">
														{module.name}
													</div>
													<div className="mt-1 text-sm text-slate-500">
														{module.description}
													</div>
												</div>
												<Switch
													checked={module.isEnabled}
													disabled={moduleBusy === module.key}
													onCheckedChange={(value) =>
														toggleModule(module.key, value)
													}
												/>
											</div>
											<div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
												<CheckCircle2 className="h-4 w-4" />
												{module.isEnabled ? "Доступен компании" : "Отключён"}
											</div>
										</div>
									))}
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent value="users">
					<Card className="overflow-hidden">
						<CardHeader>
							<CardTitle>Пользователи компании</CardTitle>
							<CardDescription>
								Управление доступом, ролями и ссылками для установки пароля.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>ФИО</TableHead>
										<TableHead>Контакты</TableHead>
										<TableHead>Роль</TableHead>
										<TableHead>Активен</TableHead>
										<TableHead className="text-right">Действия</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{!data.users.length ? (
										<TableRow>
											<TableCell
												colSpan={5}
												className="py-10 text-center text-muted-foreground"
											>
												Нет пользователей
											</TableCell>
										</TableRow>
									) : (
										data.users.map((user) => (
											<TableRow key={user.id}>
												<TableCell>
													<div className="font-semibold">
														{user.firstName} {user.lastName}
													</div>
													<div className="text-xs text-slate-500">ID {user.id}</div>
												</TableCell>
												<TableCell className="text-sm">
													<div>{user.email}</div>
													<div className="text-xs text-slate-500">
														{user.phone || "телефон не указан"}
													</div>
												</TableCell>
												<TableCell>
													<Select
														value={user.role}
														onValueChange={(role) => patchUser(user.id, { role })}
													>
														<SelectTrigger className="w-[220px]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{Object.entries(ROLE_LABELS).map(([role, label]) => (
																<SelectItem key={role} value={role}>
																	{label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell>
													<Switch
														checked={user.isActive}
														onCheckedChange={(value) =>
															patchUser(user.id, { isActive: value })
														}
													/>
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant="outline"
														size="sm"
														className="gap-1"
														onClick={() => sendPasswordReset(user.id, user.email)}
													>
														<KeyRound className="h-3.5 w-3.5" />
														Ссылка для входа
													</Button>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="legal">
					<div className="grid gap-4 xl:grid-cols-2">
						<Card className="overflow-hidden">
							<CardHeader>
								<CardTitle>Юридические лица</CardTitle>
								<CardDescription>
									Юрлица компании, которые используются в документах и счетах.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{!data.legalEntities.length ? (
									<div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
										Юрлица пока не созданы
									</div>
								) : (
									data.legalEntities.map((entity) => (
										<div
											key={entity.id}
											className="rounded-2xl border border-slate-200 bg-white p-4"
										>
											<div className="flex items-start justify-between gap-4">
												<div>
													<div className="font-semibold">{entity.name}</div>
													<div className="text-sm text-slate-500">
														{entity.fullLegalName}
													</div>
													<div className="mt-2 grid gap-1 text-xs text-slate-500">
														<span>ИНН: {entity.inn || "—"}</span>
														<span>Директор: {entity.directorName || "—"}</span>
														<span>{entity.phone || "телефон не указан"}</span>
													</div>
												</div>
												<Switch
													checked={entity.isActive}
													onCheckedChange={(value) =>
														toggleLegalEntity(entity.id, value)
													}
												/>
											</div>
										</div>
									))
								)}
							</CardContent>
						</Card>

						<Card className="overflow-hidden">
							<CardHeader>
								<CardTitle>Банковские и кассовые счета</CardTitle>
								<CardDescription>
									Счета по модулям, валютам и юридическим лицам.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{!data.bankAccounts.length ? (
									<div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
										Счета пока не созданы
									</div>
								) : (
									data.bankAccounts.map((account) => (
										<div
											key={account.id}
											className="rounded-2xl border border-slate-200 bg-white p-4"
										>
											<div className="flex items-start justify-between gap-4">
												<div>
													<div className="font-semibold">{account.name}</div>
													<div className="text-sm text-slate-500">
														{account.bank || account.type} · {account.currency} ·{" "}
														{account.module}
													</div>
													<div className="mt-2 grid gap-1 text-xs text-slate-500">
														<span>Счёт: {account.accountNumber || "—"}</span>
														<span>Баланс: {account.currentBalance}</span>
													</div>
												</div>
												<Switch
													checked={account.isActive}
													onCheckedChange={(value) =>
														toggleBankAccount(account.id, value)
													}
												/>
											</div>
											{account.notes ? (
												<Textarea
													readOnly
													className="mt-3 min-h-12 text-xs"
													value={account.notes}
												/>
											) : null}
										</div>
									))
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>

			<Dialog open={!!resetLink} onOpenChange={(open) => !open && setResetLink(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ссылка для входа и установки пароля</DialogTitle>
						<DialogDescription>
							Передайте ссылку пользователю {resetEmail}. Действует 1 час.
						</DialogDescription>
					</DialogHeader>
					<Input readOnly value={resetLink || ""} className="text-xs" />
					<Button
						onClick={() => {
							if (resetLink) navigator.clipboard.writeText(resetLink);
							toast({ title: "Скопировано" });
						}}
					>
						Копировать ссылку
					</Button>
				</DialogContent>
			</Dialog>
		</div>
	);
}
