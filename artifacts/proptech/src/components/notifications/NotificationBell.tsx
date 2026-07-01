import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import {
	AlertCircle,
	AlertTriangle,
	Bell,
	Check,
	CheckCircle,
	Info,
	Loader2,
	X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Notification {
	id: number;
	type: string;
	title: string;
	body?: string;
	message?: string;
	icon?: string;
	color?: string;
	link?: string;
	isRead: boolean;
	createdAt: string;
}

const iconMap: Record<string, any> = {
	"alert-circle": AlertCircle,
	"check-circle": CheckCircle,
	"alert-triangle": AlertTriangle,
	info: Info,
};

const colorMap: Record<string, string> = {
	red: "text-rose-600",
	green: "text-emerald-600",
	yellow: "text-amber-600",
	blue: "text-blue-500",
};

export function NotificationBell() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);

	// Get unread count
	const { data: unreadData } = useQuery({
		queryKey: ["notifications-unread-count"],
		queryFn: () =>
			api
				.get<{ count: number }>("/notifications/unread-count")
				.then((r) => r.data),
		refetchInterval: 60000, // Refresh every 60s (было 30s)
		staleTime: 30000, // Считать данные свежими 30 секунд
	});

	// Get notifications
	const {
		data: notifications = [],
		isLoading,
		isError,
		refetch,
	} = useQuery<Notification[]>({
		queryKey: ["notifications"],
		queryFn: () =>
			api
				.get("/notifications", { params: { limit: "20" } })
				.then((r) => r.data),
		enabled: isOpen,
	});

	const notificationsArray = Array.isArray(notifications) ? notifications : [];
	const unreadCount = unreadData?.count || 0;

	// Mark as read mutation
	const markReadMutation = useMutation({
		mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-unread-count"],
			});
		},
	});

	// Mark all as read
	const markAllReadMutation = useMutation({
		mutationFn: () => api.patch("/notifications/mark-all-read"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-unread-count"],
			});
			toast({ title: "Все уведомления отмечены прочитанными" });
		},
	});

	// Delete notification
	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/notifications/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-unread-count"],
			});
		},
	});

	const handleNotificationClick = (notification: Notification) => {
		if (!notification.isRead) {
			markReadMutation.mutate(notification.id);
		}
		if (notification.link) {
			setIsOpen(false);
		}
	};

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative h-11 w-11 rounded-2xl border border-transparent text-slate-700 hover:border-cyan-100 hover:bg-cyan-50 dark:text-white/60 dark:hover:border-cyan-400/20 dark:hover:bg-white/8"
					aria-label="Уведомления"
				>
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 p-0 px-1 text-[10px] font-bold text-white"
						>
							{unreadCount > 99 ? "99+" : unreadCount}
						</Badge>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-white/80 bg-white/94 p-0 shadow-2xl shadow-slate-950/18 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/97"
			>
				<div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 to-cyan-950 px-5 py-4 text-white">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
								Action center
							</p>
							<h3 className="mt-1 text-lg font-bold">Уведомления</h3>
							<p className="mt-0.5 text-xs text-white/55">
								События, согласования и системные напоминания
							</p>
						</div>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => markAllReadMutation.mutate()}
							className="h-9 rounded-full bg-white/10 px-3 text-xs text-white hover:bg-white/18 hover:text-white"
						>
							<Check className="h-3 w-3 mr-1" />
							Прочитать все
						</Button>
					)}
					</div>
				</div>

				<ScrollArea className="h-[430px]">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-14 text-slate-500 dark:text-white/50">
							<Loader2 className="mb-3 h-7 w-7 animate-spin text-cyan-700 dark:text-cyan-300" />
							<p className="text-sm font-medium">Загружаю уведомления…</p>
						</div>
					) : isError ? (
						<div className="flex flex-col items-center justify-center px-8 py-14 text-center">
							<div className="grid h-14 w-14 place-items-center rounded-3xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300">
								<AlertTriangle className="h-6 w-6" />
							</div>
							<p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
								Не удалось загрузить уведомления
							</p>
							<p className="mt-1 text-xs text-slate-500 dark:text-white/50">
								Проверьте подключение к серверу и повторите попытку.
							</p>
							<Button
								variant="outline"
								size="sm"
								className="mt-4 rounded-full"
								onClick={() => refetch()}
							>
								Повторить
							</Button>
						</div>
					) : notificationsArray.length === 0 ? (
						<div className="flex flex-col items-center justify-center px-8 py-14 text-center text-slate-500 dark:text-white/50">
							<div className="grid h-16 w-16 place-items-center rounded-[28px] border border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-300">
								<Bell className="h-7 w-7" />
							</div>
							<p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
								Все спокойно
							</p>
							<p className="mt-1 text-xs text-slate-500 dark:text-white/50">
								Новые задачи, просрочки и согласования появятся здесь.
							</p>
						</div>
					) : (
						<div className="space-y-2 p-2">
							{notificationsArray.map((notification) => {
								const IconComponent =
									iconMap[notification.icon || "info"] || Info;
								const iconColor =
									colorMap[notification.color || "blue"] || "text-blue-500";
								const message = notification.message || notification.body || "";

								return (
									<div
										key={notification.id}
										className={`rounded-3xl border px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/8 ${
											!notification.isRead
												? "border-cyan-100 bg-cyan-50/80 dark:border-cyan-400/20 dark:bg-cyan-500/10"
												: "border-slate-100 bg-white/78 dark:border-white/8 dark:bg-white/[0.035]"
										}`}
									>
										<div className="flex gap-3">
											<div className={`mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-2xl bg-white dark:bg-white/8 shadow-sm ${iconColor}`}>
												<IconComponent className="h-5 w-5" />
											</div>

											<div className="flex-1 min-w-0">
												{notification.link ? (
													<Link href={notification.link}>
														<button
															onClick={() =>
																handleNotificationClick(notification)
															}
															className="text-left w-full"
														>
															<p className="text-sm font-semibold text-slate-950 dark:text-white">
																{notification.title}
															</p>
															{message && (
																<p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-white/50">
																	{message}
																</p>
															)}
															<p className="mt-2 text-[11px] font-medium text-slate-400 dark:text-white/35">
																{formatDistanceToNow(
																	new Date(notification.createdAt),
																	{
																		addSuffix: true,
																		locale: ru,
																	},
																)}
															</p>
														</button>
													</Link>
												) : (
													<div>
														<p className="text-sm font-semibold text-slate-950 dark:text-white">
															{notification.title}
														</p>
														{message && (
															<p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-white/50">
																{message}
															</p>
														)}
														<p className="mt-2 text-[11px] font-medium text-slate-400 dark:text-white/35">
															{formatDistanceToNow(
																new Date(notification.createdAt),
																{
																	addSuffix: true,
																	locale: ru,
																},
															)}
														</p>
													</div>
												)}
											</div>

											<div className="flex-shrink-0 flex items-start gap-1">
												{!notification.isRead && (
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 rounded-full text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
														onClick={(e) => {
															e.stopPropagation();
															markReadMutation.mutate(notification.id);
														}}
													>
														<Check className="h-3 w-3" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-white/35 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
													onClick={(e) => {
														e.stopPropagation();
														deleteMutation.mutate(notification.id);
													}}
												>
													<X className="h-3 w-3" />
												</Button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</ScrollArea>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
