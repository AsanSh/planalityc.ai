export type BusinessModuleKey = "construction" | "finance" | "rental" | "warehouse" | "crm";

export type SettingsModuleKey =
  | "rental"
  | "sales"
  | "reports"
  | "finance"
  | "notifications"
  | "crm"
  | "maintenance"
  | "analytics"
  | "documents"
  | "construction"
  | "warehouse";

export type CanonicalModuleKey =
  | "core"
  | "construction"
  | "finance"
  | "procurement"
  | "crm"
  | "rent"
  | "investors";

export interface AvailableModule {
  key: SettingsModuleKey;
  canonicalKey: CanonicalModuleKey;
  name: string;
  description: string;
  icon: string;
  category: "core" | "analytics" | "communication" | "operations";
}

export interface ModuleIntegration {
  key: string;
  requires: CanonicalModuleKey[];
  description: string;
}

export const AVAILABLE_MODULES: AvailableModule[] = [
  {
    key: "rental",
    canonicalKey: "rent",
    name: "Управление арендой",
    description: "Договоры аренды, начисления, платежи, депозиты, отчёты собственников",
    icon: "Home",
    category: "core",
  },
  {
    key: "sales",
    canonicalKey: "construction",
    name: "Продажи объектов строительства",
    description: "Объекты на продажу, шахматка, договоры купли-продажи, рассрочка",
    icon: "Building2",
    category: "core",
  },
  {
    key: "reports",
    canonicalKey: "finance",
    name: "Финансовые отчёты",
    description: "Детальная отчётность: долги, денежный поток, сводки по периодам",
    icon: "BarChart3",
    category: "analytics",
  },
  {
    key: "finance",
    canonicalKey: "finance",
    name: "Финансовый учет",
    description: "Приходы, расходы, счета, бюджеты, ОДДС, ОПУ и платежный календарь",
    icon: "Wallet",
    category: "core",
  },
  {
    key: "notifications",
    canonicalKey: "crm",
    name: "Уведомления клиентов",
    description: "Автоматические SMS и email уведомления арендаторам о начислениях и задолженностях",
    icon: "Bell",
    category: "communication",
  },
  {
    key: "crm",
    canonicalKey: "crm",
    name: "CRM и клиентский сервис",
    description: "Воронка продаж, лиды, история взаимодействий и объявления для клиентов",
    icon: "Users",
    category: "communication",
  },
  {
    key: "maintenance",
    canonicalKey: "rent",
    name: "Заявки на обслуживание",
    description: "Приём и отслеживание заявок от арендаторов, учёт ремонтных работ",
    icon: "Wrench",
    category: "operations",
  },
  {
    key: "analytics",
    canonicalKey: "core",
    name: "Аналитика и BI",
    description: "Расширенная аналитика: доходность по объектам, прогнозы, сравнения",
    icon: "TrendingUp",
    category: "analytics",
  },
  {
    key: "documents",
    canonicalKey: "core",
    name: "Электронный документооборот",
    description: "Хранение, подписание и управление документами, шаблоны договоров",
    icon: "FileText",
    category: "operations",
  },
  {
    key: "construction",
    canonicalKey: "construction",
    name: "Контроль строительства",
    description: "Проекты, этапы, задачи, бюджет, операции, шахматка, ИИ-инструменты",
    icon: "HardHat",
    category: "core",
  },
  {
    key: "warehouse",
    canonicalKey: "procurement",
    name: "Снабжение и склад",
    description: "Материалы, поставщики, поступления, списания, инвентаризация",
    icon: "Package",
    category: "operations",
  },
];

export const SIGNUP_MODULE_TO_SETTINGS_KEYS: Record<BusinessModuleKey, SettingsModuleKey[]> = {
  construction: ["construction", "sales"],
  finance: ["finance", "reports"],
  rental: ["rental"],
  warehouse: ["warehouse"],
  crm: ["crm", "notifications"],
};

export const DEFAULT_ENABLED_MODULE_KEYS: SettingsModuleKey[] = [
  "construction",
  "sales",
  "finance",
  "rental",
  "warehouse",
  "crm",
  "reports",
];

export const MODULE_INTEGRATIONS: ModuleIntegration[] = [
  {
    key: "construction.finance",
    requires: ["construction", "finance"],
    description: "Строительные бюджеты, начисления и платежи включают финансовые отчёты.",
  },
  {
    key: "construction.procurement",
    requires: ["construction", "procurement"],
    description: "Задача строительства может создавать заявку снабжения.",
  },
  {
    key: "crm.construction",
    requires: ["crm", "construction"],
    description: "CRM использует шахматку и утверждённые цены для продажи юнитов.",
  },
  {
    key: "rent.finance",
    requires: ["rent", "finance"],
    description: "Платежи аренды попадают в финансовую аналитику.",
  },
];
