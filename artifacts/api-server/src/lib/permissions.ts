/**
 * RBAC permissions catalog and role presets.
 * Used by requirePermission middleware and /auth/me endpoint.
 */

// ─── Permission constants ──────────────────────────────────────────────────────

export const PERMISSIONS = {
  PRICING_WRITE: "pricing:write",
  SALES_WRITE: "sales:write",
  CASHIER_WRITE: "cashier:write",
  FINANCE_READ: "finance:read",
  FINANCE_WRITE: "finance:write",
  CONTRACTS_WRITE: "contracts:write",
  PROCUREMENT_WRITE: "procurement:write",
  PROCUREMENT_APPROVE: "procurement:approve",
  RENTAL_WRITE: "rental:write",
  CONSTRUCTION_WRITE: "construction:write",
  ANALYTICS_VIEW: "analytics:view",
  ADMIN_ALL: "admin:all",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role presets ──────────────────────────────────────────────────────────────

/**
 * Maps role keys (as stored in users.role) to arrays of permissions.
 * admin:all is a wildcard that grants everything.
 */
export const ROLE_PRESETS: Record<string, string[]> = {
  // Admins: full access
  super_admin: [PERMISSIONS.ADMIN_ALL],
  company_admin: [PERMISSIONS.ADMIN_ALL],
  owner: [PERMISSIONS.ADMIN_ALL],
  admin: [PERMISSIONS.ADMIN_ALL],

  // Commercial director: can approve prices, manage deals, analytics, contracts
  commercial_director: [
    PERMISSIONS.PRICING_WRITE,
    PERMISSIONS.SALES_WRITE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.CONTRACTS_WRITE,
  ],

  // Sales: can create deals/bookings but NOT approve prices
  sales_manager: [PERMISSIONS.SALES_WRITE],
  sales: [PERMISSIONS.SALES_WRITE],
  sales_department_head: [PERMISSIONS.SALES_WRITE],

  // Cashier: record payments only
  cashier: [PERMISSIONS.CASHIER_WRITE],

  // Lawyer: manage contracts
  lawyer: [PERMISSIONS.CONTRACTS_WRITE],

  // Finance director / finance: full finance access
  finance_director: [
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  financial_director: [
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  finance: [PERMISSIONS.FINANCE_READ, PERMISSIONS.FINANCE_WRITE, PERMISSIONS.ANALYTICS_VIEW],

  // Accountant: view only
  accountant: [PERMISSIONS.FINANCE_READ],
  chief_accountant: [PERMISSIONS.FINANCE_READ],

  // PTO / engineer: procurement + construction work
  pto: [PERMISSIONS.PROCUREMENT_WRITE, PERMISSIONS.CONSTRUCTION_WRITE],
  engineer: [PERMISSIONS.PROCUREMENT_WRITE, PERMISSIONS.CONSTRUCTION_WRITE],
  pto_engineer: [PERMISSIONS.PROCUREMENT_WRITE, PERMISSIONS.CONSTRUCTION_WRITE],

  // Construction director: can approve procurement
  construction_director: [PERMISSIONS.CONSTRUCTION_WRITE, PERMISSIONS.PROCUREMENT_APPROVE],

  // Supply manager: submit supply requests
  supply_manager: [PERMISSIONS.PROCUREMENT_WRITE],
  supply_specialist: [PERMISSIONS.PROCUREMENT_WRITE],

  // Project manager: construction work management
  project_manager: [PERMISSIONS.CONSTRUCTION_WRITE],
  construction_project_manager: [PERMISSIONS.CONSTRUCTION_WRITE],

  // Rental manager
  rental_manager: [PERMISSIONS.RENTAL_WRITE],

  // Staff: no special permissions (read-only access governed by modules)
  staff: [],
};

// All known permissions as a flat list (used for admin:all expansion)
const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS).filter(
  (p) => p !== PERMISSIONS.ADMIN_ALL,
);

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves the effective permissions for a user based on their role string.
 * admin:all expands to all known permissions.
 */
export function resolvePermissions(user: { role?: string | null }): string[] {
  const role = user.role ?? "staff";
  const preset = ROLE_PRESETS[role];
  if (!preset) return [];
  if (preset.includes(PERMISSIONS.ADMIN_ALL)) {
    return [...ALL_PERMISSIONS, PERMISSIONS.ADMIN_ALL];
  }
  return preset;
}

/**
 * Returns true if the user has the given permission.
 * admin:all always grants access to every permission.
 */
export function hasPermission(
  user: { role?: string | null },
  perm: string,
): boolean {
  const perms = resolvePermissions(user);
  return perms.includes(PERMISSIONS.ADMIN_ALL) || perms.includes(perm);
}
