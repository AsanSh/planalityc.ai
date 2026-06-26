/**
 * Client-side RBAC permissions — mirrors server-side lib/permissions.ts.
 * Used by usePermissions() hook so components can gate UI without an
 * extra round-trip; the authoritative check is always server-side.
 */

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

const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS).filter(
  (p) => p !== PERMISSIONS.ADMIN_ALL,
);

export const ROLE_PRESETS: Record<string, string[]> = {
  super_admin: [PERMISSIONS.ADMIN_ALL],
  company_admin: [PERMISSIONS.ADMIN_ALL],
  owner: [PERMISSIONS.ADMIN_ALL],
  admin: [PERMISSIONS.ADMIN_ALL],

  commercial_director: [
    PERMISSIONS.PRICING_WRITE,
    PERMISSIONS.SALES_WRITE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.CONTRACTS_WRITE,
  ],

  sales_manager: [PERMISSIONS.SALES_WRITE],
  sales: [PERMISSIONS.SALES_WRITE],
  sales_department_head: [PERMISSIONS.SALES_WRITE],

  cashier: [PERMISSIONS.CASHIER_WRITE],

  lawyer: [PERMISSIONS.CONTRACTS_WRITE],

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

  accountant: [PERMISSIONS.FINANCE_READ],
  chief_accountant: [PERMISSIONS.FINANCE_READ],

  pto: [PERMISSIONS.PROCUREMENT_WRITE, PERMISSIONS.CONSTRUCTION_WRITE],
  engineer: [PERMISSIONS.PROCUREMENT_WRITE, PERMISSIONS.CONSTRUCTION_WRITE],
  pto_engineer: [PERMISSIONS.PROCUREMENT_WRITE, PERMISSIONS.CONSTRUCTION_WRITE],

  construction_director: [PERMISSIONS.CONSTRUCTION_WRITE, PERMISSIONS.PROCUREMENT_APPROVE],

  supply_manager: [PERMISSIONS.PROCUREMENT_WRITE],
  supply_specialist: [PERMISSIONS.PROCUREMENT_WRITE],

  project_manager: [PERMISSIONS.CONSTRUCTION_WRITE],
  construction_project_manager: [PERMISSIONS.CONSTRUCTION_WRITE],

  rental_manager: [PERMISSIONS.RENTAL_WRITE],

  staff: [],
};

/**
 * Resolves permissions for a user from their role string.
 * If the server already returned a permissions array (from /auth/me),
 * prefer that over the local preset lookup.
 */
export function resolvePermissions(user: {
  role?: string | null;
  permissions?: string[] | null;
}): string[] {
  // Server-provided permissions take precedence
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  const role = user.role ?? "staff";
  const preset = ROLE_PRESETS[role];
  if (!preset) return [];
  if (preset.includes(PERMISSIONS.ADMIN_ALL)) {
    return [...ALL_PERMISSIONS, PERMISSIONS.ADMIN_ALL];
  }
  return preset;
}

export function hasPermission(
  user: { role?: string | null; permissions?: string[] | null },
  perm: string,
): boolean {
  const perms = resolvePermissions(user);
  return perms.includes(PERMISSIONS.ADMIN_ALL) || perms.includes(perm);
}
