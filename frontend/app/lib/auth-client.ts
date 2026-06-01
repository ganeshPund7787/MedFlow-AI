import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
  fetchOptions: {
    credentials: "include",
    onError(context) {
      if (context.response.status === 401) {
        // Anti-Gravity: Handle session expiration gracefully
        console.warn("🔐 Session Expired. Redirecting to recovery...");
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
           window.location.href = "/login?reason=expired";
        }
      }
    }
  },
  plugins: [adminClient(), polarClient()],
});
