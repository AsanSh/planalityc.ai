export const PROGRESS_COLUMN_CONFIG_KEY = "progress-projects-column-config";

export type ProgressCustomColumn = {
	id: string;
	label: string;
	groupId: string;
};

export const PROGRESS_GROUP_IDS = [
	"projectData",
	"collections",
	"profitability",
	"cost",
	"expenses",
	"custom",
] as const;

export type ProgressGroupId = (typeof PROGRESS_GROUP_IDS)[number];

export type ProgressColumnConfig = {
	labelOverrides: Record<string, string>;
	customColumns: ProgressCustomColumn[];
	/** projectId → columnId → numeric value */
	customValues: Record<string, Record<string, number>>;
	/** which metric sections are shown in block layout */
	visibleGroups: Record<ProgressGroupId, boolean>;
};

const DEFAULT_VISIBLE_GROUPS: Record<ProgressGroupId, boolean> = {
	projectData: true,
	collections: true,
	profitability: true,
	cost: true,
	expenses: true,
	custom: true,
};

const DEFAULT_CONFIG: ProgressColumnConfig = {
	labelOverrides: {},
	customColumns: [],
	customValues: {},
	visibleGroups: { ...DEFAULT_VISIBLE_GROUPS },
};

export function loadProgressColumnConfig(): ProgressColumnConfig {
	try {
		const raw = localStorage.getItem(PROGRESS_COLUMN_CONFIG_KEY);
		if (!raw) return { ...DEFAULT_CONFIG };
		const parsed = JSON.parse(raw) as Partial<ProgressColumnConfig>;
		return {
			labelOverrides: parsed.labelOverrides ?? {},
			customColumns: parsed.customColumns ?? [],
			customValues: parsed.customValues ?? {},
			visibleGroups: {
				...DEFAULT_VISIBLE_GROUPS,
				...(parsed.visibleGroups ?? {}),
			},
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function saveProgressColumnConfig(config: ProgressColumnConfig): void {
	localStorage.setItem(PROGRESS_COLUMN_CONFIG_KEY, JSON.stringify(config));
}

export function newCustomColumnId(): string {
	return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
