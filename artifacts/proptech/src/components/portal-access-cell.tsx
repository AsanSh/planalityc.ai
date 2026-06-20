import { ExternalLink, Eye, Lock, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { PortalPreviewDialog, type PortalPreviewType } from "@/components/portal-preview-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
	getPortalAccess,
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

export function PortalAccessCell({
	counterpartyId,
	counterpartyName,
	roles,
	phone,
	email,
}: PortalAccessCellProps) {
	const { toast } = useToast();
	const initial = useMemo(() => getPortalAccess(counterpartyId), [counterpartyId]);
	const [record, setRecord] = useState<PortalAccessRecord | undefined>(initial);
	const [previewOpen, setPreviewOpen] = useState(false);
	const enabled = Boolean(record?.enabled);
	const previewType = (record?.portalKind ?? resolvePortalKind(roles)) as PortalPreviewType;

	const toggle = () => {
		const next = upsertPortalAccess({
			counterpartyId,
			counterpartyName,
			roles,
			phone,
			email,
			enabled: !enabled,
		});
		setRecord(next);
		toast({
			title: next.enabled ? "Доступ к порталу открыт" : "Доступ к порталу закрыт",
			description: next.enabled ? `Логин: ${next.login}` : counterpartyName,
		});
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
					<p className="truncate text-[10px] text-am-text-subtle" title={record?.login || "Создать доступ"}>
						{enabled ? record?.login : "покупатель / арендатор / поставщик"}
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
					{enabled && record?.portalPath && (
						<a
							href={record.portalPath}
							target="_blank"
							rel="noreferrer"
							className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-am-border bg-white text-am-text-muted shadow-sm hover:text-am-text-strong"
							title="Открыть портал"
						>
							<ExternalLink className="h-3.5 w-3.5" />
						</a>
					)}
					<Button
						type="button"
						size="sm"
						variant={enabled ? "outline" : "default"}
						onClick={toggle}
						className={enabled ? "h-8 gap-1.5 rounded-full px-3" : "h-8 gap-1.5 rounded-full bg-teal-600 px-3 hover:bg-teal-700"}
					>
						{enabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
						{enabled ? "Закрыть" : "Открыть"}
					</Button>
				</div>
			</div>
			<PortalPreviewDialog
				type={previewType}
				id={counterpartyId}
				open={previewOpen}
				onClose={() => setPreviewOpen(false)}
			/>
		</>
	);
}
