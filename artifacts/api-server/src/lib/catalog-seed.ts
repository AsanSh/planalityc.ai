/**
 * Базовый реальный справочник стройматериалов для инициализации каталога.
 * Категории соответствуют DEFAULT_ROOT_CATEGORIES (catalog.ts).
 * `tnved` — товарная позиция ТН ВЭД ЕАЭС (4 знака, ориентир) — официальный
 * классификатор, используемый ГНС/СТИ и таможней КР. Полный классификатор
 * (1С/ГНС, тысячи SKU) импортируется отдельно bulk-загрузкой.
 */

export interface SeedProduct {
	categorySlug: string;
	canonicalName: string;
	slug: string;
	unit: string;
	tnved: string;
}

export const CATALOG_SEED_PRODUCTS: SeedProduct[] = [
	// Металлопрокат (72–73)
	{ categorySlug: "metal", canonicalName: "Арматура А500С Ø10", slug: "rebar-a500-10", unit: "т", tnved: "7214" },
	{ categorySlug: "metal", canonicalName: "Арматура А500С Ø12", slug: "rebar-a500-12", unit: "т", tnved: "7214" },
	{ categorySlug: "metal", canonicalName: "Арматура А500С Ø16", slug: "rebar-a500-16", unit: "т", tnved: "7214" },
	{ categorySlug: "metal", canonicalName: "Уголок стальной 50×50×5", slug: "angle-50x50x5", unit: "т", tnved: "7216" },
	{ categorySlug: "metal", canonicalName: "Швеллер 10", slug: "channel-10", unit: "т", tnved: "7216" },
	{ categorySlug: "metal", canonicalName: "Труба профильная 40×40×2", slug: "tube-prof-40x40x2", unit: "м", tnved: "7306" },
	{ categorySlug: "metal", canonicalName: "Лист стальной 2 мм", slug: "steel-sheet-2", unit: "т", tnved: "7208" },
	{ categorySlug: "metal", canonicalName: "Катанка Ø6", slug: "wire-rod-6", unit: "т", tnved: "7213" },

	// Бетон и ЖБИ (3824, 6810)
	{ categorySlug: "concrete-zbi", canonicalName: "Бетон товарный B25 (М350)", slug: "concrete-b25", unit: "м3", tnved: "3824" },
	{ categorySlug: "concrete-zbi", canonicalName: "Бетон товарный B20 (М250)", slug: "concrete-b20", unit: "м3", tnved: "3824" },
	{ categorySlug: "concrete-zbi", canonicalName: "Плита перекрытия ПК 60-12", slug: "slab-pk-60-12", unit: "шт", tnved: "6810" },
	{ categorySlug: "concrete-zbi", canonicalName: "Блок ФБС 24-4-6", slug: "block-fbs-24-4-6", unit: "шт", tnved: "6810" },
	{ categorySlug: "concrete-zbi", canonicalName: "Перемычка брусковая 2ПБ", slug: "lintel-2pb", unit: "шт", tnved: "6810" },

	// Цемент и смеси (2523, 3214, 3824)
	{ categorySlug: "cement-mixes", canonicalName: "Цемент М400 (ЦЕМ II)", slug: "cement-m400", unit: "т", tnved: "2523" },
	{ categorySlug: "cement-mixes", canonicalName: "Цемент М500 (ЦЕМ I)", slug: "cement-m500", unit: "т", tnved: "2523" },
	{ categorySlug: "cement-mixes", canonicalName: "Пескобетон М300", slug: "sandconcrete-m300", unit: "мешок", tnved: "3824" },
	{ categorySlug: "cement-mixes", canonicalName: "Клей плиточный", slug: "tile-adhesive", unit: "мешок", tnved: "3824" },
	{ categorySlug: "cement-mixes", canonicalName: "Штукатурка гипсовая", slug: "plaster-gypsum", unit: "мешок", tnved: "3214" },
	{ categorySlug: "cement-mixes", canonicalName: "Шпаклёвка финишная", slug: "putty-finish", unit: "мешок", tnved: "3214" },

	// Кирпич и блоки (6810, 6904)
	{ categorySlug: "brick-blocks", canonicalName: "Кирпич керамический рядовой М150", slug: "brick-ceramic-m150", unit: "шт", tnved: "6904" },
	{ categorySlug: "brick-blocks", canonicalName: "Кирпич облицовочный", slug: "brick-facing", unit: "шт", tnved: "6904" },
	{ categorySlug: "brick-blocks", canonicalName: "Газоблок D500 600×300×200", slug: "gasblock-d500", unit: "м3", tnved: "6810" },
	{ categorySlug: "brick-blocks", canonicalName: "Пеноблок D600", slug: "foamblock-d600", unit: "м3", tnved: "6810" },
	{ categorySlug: "brick-blocks", canonicalName: "Керамзитоблок", slug: "claydite-block", unit: "шт", tnved: "6810" },

	// Инертные материалы (2505, 2517)
	{ categorySlug: "inert-materials", canonicalName: "Песок речной", slug: "sand-river", unit: "м3", tnved: "2505" },
	{ categorySlug: "inert-materials", canonicalName: "Песок мытый", slug: "sand-washed", unit: "м3", tnved: "2505" },
	{ categorySlug: "inert-materials", canonicalName: "Щебень 5-20", slug: "gravel-5-20", unit: "м3", tnved: "2517" },
	{ categorySlug: "inert-materials", canonicalName: "Щебень 20-40", slug: "gravel-20-40", unit: "м3", tnved: "2517" },
	{ categorySlug: "inert-materials", canonicalName: "Отсев", slug: "screening", unit: "м3", tnved: "2517" },
	{ categorySlug: "inert-materials", canonicalName: "ПГС", slug: "sand-gravel-mix", unit: "м3", tnved: "2505" },

	// Гидроизоляция (6807, 2715, 3824)
	{ categorySlug: "waterproofing", canonicalName: "Рубероид РКП-350", slug: "ruberoid-rkp350", unit: "рулон", tnved: "6807" },
	{ categorySlug: "waterproofing", canonicalName: "Мастика битумная", slug: "bitumen-mastic", unit: "кг", tnved: "2715" },
	{ categorySlug: "waterproofing", canonicalName: "Праймер битумный", slug: "bitumen-primer", unit: "л", tnved: "2715" },
	{ categorySlug: "waterproofing", canonicalName: "Гидроизоляция обмазочная", slug: "waterproof-coating", unit: "мешок", tnved: "3824" },

	// Утеплители (6806, 3921)
	{ categorySlug: "insulation", canonicalName: "Минвата 100 мм (плита)", slug: "mineral-wool-100", unit: "м3", tnved: "6806" },
	{ categorySlug: "insulation", canonicalName: "Пенопласт ПСБ-С-25 50 мм", slug: "eps-25-50", unit: "м3", tnved: "3921" },
	{ categorySlug: "insulation", canonicalName: "Экструзионный пенополистирол 50 мм", slug: "xps-50", unit: "м3", tnved: "3921" },

	// Кровля (7210, 6807, 6811)
	{ categorySlug: "roofing", canonicalName: "Профнастил С8 оцинкованный", slug: "corrug-sheet-c8", unit: "м2", tnved: "7210" },
	{ categorySlug: "roofing", canonicalName: "Металлочерепица", slug: "metal-tile", unit: "м2", tnved: "7210" },
	{ categorySlug: "roofing", canonicalName: "Ондулин", slug: "onduline", unit: "лист", tnved: "6807" },
	{ categorySlug: "roofing", canonicalName: "Шифер 8-волновой", slug: "slate-8wave", unit: "лист", tnved: "6811" },

	// Фасад (3214, 3925)
	{ categorySlug: "facade", canonicalName: "Штукатурка фасадная", slug: "facade-plaster", unit: "мешок", tnved: "3214" },
	{ categorySlug: "facade", canonicalName: "Декоративная штукатурка «короед»", slug: "decor-plaster-koroed", unit: "мешок", tnved: "3214" },
	{ categorySlug: "facade", canonicalName: "Сайдинг виниловый", slug: "vinyl-siding", unit: "панель", tnved: "3925" },

	// Окна и двери (3925, 7308, 4418)
	{ categorySlug: "windows-doors", canonicalName: "Окно ПВХ 1300×1400", slug: "window-pvc-1300x1400", unit: "шт", tnved: "3925" },
	{ categorySlug: "windows-doors", canonicalName: "Дверь металлическая входная", slug: "door-metal-entry", unit: "шт", tnved: "7308" },
	{ categorySlug: "windows-doors", canonicalName: "Дверь межкомнатная", slug: "door-interior", unit: "шт", tnved: "4418" },

	// Электрика (8544, 8536, 3917)
	{ categorySlug: "electrical", canonicalName: "Кабель ВВГнг 3×2.5", slug: "cable-vvg-3x2.5", unit: "м", tnved: "8544" },
	{ categorySlug: "electrical", canonicalName: "Кабель ВВГнг 3×1.5", slug: "cable-vvg-3x1.5", unit: "м", tnved: "8544" },
	{ categorySlug: "electrical", canonicalName: "Автомат 1P 16A", slug: "breaker-1p-16a", unit: "шт", tnved: "8536" },
	{ categorySlug: "electrical", canonicalName: "Розетка", slug: "socket", unit: "шт", tnved: "8536" },
	{ categorySlug: "electrical", canonicalName: "Выключатель", slug: "switch", unit: "шт", tnved: "8536" },
	{ categorySlug: "electrical", canonicalName: "Гофра ПВХ 20 мм", slug: "corrug-pipe-pvc-20", unit: "м", tnved: "3917" },

	// Сантехника (3917, 8481)
	{ categorySlug: "plumbing", canonicalName: "Труба ПП PN20 Ø20", slug: "pipe-pp-pn20-20", unit: "м", tnved: "3917" },
	{ categorySlug: "plumbing", canonicalName: "Труба ПП PN20 Ø25", slug: "pipe-pp-pn20-25", unit: "м", tnved: "3917" },
	{ categorySlug: "plumbing", canonicalName: "Труба канализационная ПВХ Ø110", slug: "pipe-sewer-pvc-110", unit: "м", tnved: "3917" },
	{ categorySlug: "plumbing", canonicalName: "Фитинг ПП муфта Ø20", slug: "fitting-pp-coupling-20", unit: "шт", tnved: "3917" },
	{ categorySlug: "plumbing", canonicalName: "Кран шаровой 1/2\"", slug: "ball-valve-half", unit: "шт", tnved: "8481" },

	// Вентиляция (7306, 3925)
	{ categorySlug: "ventilation", canonicalName: "Воздуховод оцинкованный Ø100", slug: "air-duct-100", unit: "м", tnved: "7306" },
	{ categorySlug: "ventilation", canonicalName: "Решётка вентиляционная", slug: "vent-grille", unit: "шт", tnved: "3925" },

	// Отделка (6809, 4411, 3918, 6907, 4814, 3209)
	{ categorySlug: "finishing", canonicalName: "Гипсокартон ГКЛ 12.5 мм", slug: "drywall-12.5", unit: "лист", tnved: "6809" },
	{ categorySlug: "finishing", canonicalName: "Профиль CD-60", slug: "profile-cd60", unit: "м", tnved: "7216" },
	{ categorySlug: "finishing", canonicalName: "Профиль UD-27", slug: "profile-ud27", unit: "м", tnved: "7216" },
	{ categorySlug: "finishing", canonicalName: "Ламинат 32 класс", slug: "laminate-32", unit: "м2", tnved: "4411" },
	{ categorySlug: "finishing", canonicalName: "Линолеум", slug: "linoleum", unit: "м2", tnved: "3918" },
	{ categorySlug: "finishing", canonicalName: "Плитка керамическая", slug: "ceramic-tile", unit: "м2", tnved: "6907" },
	{ categorySlug: "finishing", canonicalName: "Обои флизелиновые", slug: "wallpaper-fleece", unit: "рулон", tnved: "4814" },
	{ categorySlug: "finishing", canonicalName: "Краска водоэмульсионная", slug: "paint-water", unit: "кг", tnved: "3209" },
	{ categorySlug: "finishing", canonicalName: "Грунтовка", slug: "primer-universal", unit: "л", tnved: "3209" },

	// Крепёж (7317, 7318)
	{ categorySlug: "fasteners", canonicalName: "Саморез по дереву 3.5×35", slug: "screw-wood-35x35", unit: "шт", tnved: "7318" },
	{ categorySlug: "fasteners", canonicalName: "Саморез по металлу 4.2×16", slug: "screw-metal-42x16", unit: "шт", tnved: "7318" },
	{ categorySlug: "fasteners", canonicalName: "Дюбель-гвоздь 6×40", slug: "dowel-nail-6x40", unit: "шт", tnved: "7318" },
	{ categorySlug: "fasteners", canonicalName: "Анкер клиновой 10×100", slug: "anchor-wedge-10x100", unit: "шт", tnved: "7318" },
	{ categorySlug: "fasteners", canonicalName: "Гвозди 100 мм", slug: "nails-100", unit: "кг", tnved: "7317" },

	// Инструмент (6804, 8207, 9603)
	{ categorySlug: "tools", canonicalName: "Диск отрезной по металлу 125", slug: "cutting-disc-125", unit: "шт", tnved: "6804" },
	{ categorySlug: "tools", canonicalName: "Бур SDS-plus 8 мм", slug: "drill-sds-8", unit: "шт", tnved: "8207" },
	{ categorySlug: "tools", canonicalName: "Кисть малярная 100 мм", slug: "paint-brush-100", unit: "шт", tnved: "9603" },
];
