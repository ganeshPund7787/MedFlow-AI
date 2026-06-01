import {
  getRouteConfig,
  navConfig,
  type NavItem,
} from "@/components/navigation/nav-config";
import type { Role } from "@/types";

/** Settings tabs any authenticated staff member may open. */
const SETTINGS_STAFF_PATHS = new Set([
  "/settings/profile",
  "/settings/system",
]);

/** All sidebar sections used for RBAC route lookups. */
export function getAllNavItems(): NavItem[] {
  return [
    ...navConfig.navMain,
    ...navConfig.navAdmin,
    ...navConfig.navSecondary,
  ];
}

/** Resolve nav metadata (including allowedRoles) for the current path. */
export function getProtectedRouteConfig(path: string): NavItem | null {
  const fromNav = getRouteConfig(path, getAllNavItems());
  if (fromNav) return fromNav;

  if (path === "/my-billing") {
    return {
      title: "My Billing",
      url: path,
      allowedRoles: ["patient"],
    };
  }

  // Settings index and nested admin pages (not duplicated in navMain)
  if (path === "/settings" || path.startsWith("/settings/")) {
    if (SETTINGS_STAFF_PATHS.has(path)) {
      return {
        title: "Settings",
        url: path,
        allowedRoles: [
          "admin",
          "doctor",
          "nurse",
          "pharmacist",
          "lab_tech",
          "patient",
        ],
      };
    }
    return {
      title: "Settings",
      url: path,
      allowedRoles: ["admin"],
    };
  }

  return null;
}

export function canAccessPath(path: string, role: Role): boolean {
  const config = getProtectedRouteConfig(path);
  if (!config) return true;
  return config.allowedRoles.includes(role);
}
