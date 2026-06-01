import type { Role } from "@/types";

/** Default landing route after login or when RBAC denies the current page. */
export function getPostLoginPath(
  role: string | undefined,
  userId?: string,
): string {
  if (role === "patient" && userId) {
    return "/my-billing";
  }
  return "/dashboard";
}

export function getRoleFallbackPath(role: Role, userId?: string): string {
  return getPostLoginPath(role, userId);
}
