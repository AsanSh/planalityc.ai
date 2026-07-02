import { useCallback, useEffect, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmDialogOptions {
	title?: string;
	confirmText?: string;
	cancelText?: string;
	destructive?: boolean;
}

interface ConfirmRequest {
	message: string;
	options?: ConfirmDialogOptions;
	resolve: (result: boolean) => void;
}

// Модульный синглтон: хост регистрирует сеттер, confirmDialog кладёт в него запрос.
let requestConfirm: ((request: ConfirmRequest) => void) | null = null;

export function confirmDialog(
	message: string,
	options?: ConfirmDialogOptions,
): Promise<boolean> {
	if (!requestConfirm) {
		// Хост не смонтирован — деградируем до нативного confirm, чтобы ничего не сломать
		return Promise.resolve(window.confirm(message));
	}
	const request = requestConfirm;
	return new Promise<boolean>((resolve) => {
		request({ message, options, resolve });
	});
}

export function ConfirmDialogHost() {
	const [current, setCurrent] = useState<ConfirmRequest | null>(null);

	useEffect(() => {
		requestConfirm = (request) => {
			setCurrent((prev) => {
				// Одновременно показываем один диалог; новый запрос вытесняет старый
				prev?.resolve(false);
				return request;
			});
		};
		return () => {
			requestConfirm = null;
		};
	}, []);

	const close = useCallback(
		(result: boolean) => {
			current?.resolve(result);
			setCurrent(null);
		},
		[current],
	);

	const options = current?.options;

	return (
		<AlertDialog
			open={current !== null}
			onOpenChange={(open) => {
				if (!open) close(false);
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{options?.title ?? "Подтверждение"}
					</AlertDialogTitle>
					<AlertDialogDescription className="whitespace-pre-line">
						{current?.message ?? ""}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => close(false)}>
						{options?.cancelText ?? "Отмена"}
					</AlertDialogCancel>
					<AlertDialogAction
						className={
							options?.destructive
								? "bg-rose-600 hover:bg-rose-700 text-white"
								: undefined
						}
						onClick={() => close(true)}
					>
						{options?.confirmText ?? "Подтвердить"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
