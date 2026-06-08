export function DocsTab({ unitId }: { unitId: number }) {
	return (
		<div className="space-y-3 text-sm text-slate-600">
			<p>
				Документы по квартире #{unitId} — загрузка через модуль ПТО (акт передачи, доп. соглашения).
			</p>
			<p className="text-xs text-slate-400">
				Используйте «Изменить площадь» в режиме ПТО для прикрепления файлов к перерасчёту.
			</p>
		</div>
	);
}
