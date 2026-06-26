import { useAuth } from "@/lib/auth";
import { resolvePermissions, hasPermission } from "@/lib/permissions";

/**
 * Returns a helper to check whether the current user has a given permission.
 * Uses server-provided permissions array from /auth/me (via AuthContext)
 * with fallback to client-side ROLE_PRESETS.
 *
 * Usage:
 *   const { has, permissions } = usePermissions();
 *   if (has("pricing:write")) { ... }
 */
export function usePermissions() {
  const { user } = useAuth();

  const permissions = user ? resolvePermissions(user as { role?: string | null; permissions?: string[] | null }) : [];

  return {
    permissions,
    has: (perm: string): boolean => {
      if (!user) return false;
      return hasPermission(user as { role?: string | null; permissions?: string[] | null }, perm);
    },
  };
}
