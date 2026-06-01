import { useState } from "react";
import { useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { toast } from "sonner";

export interface UseLogoutOptions {
  /** The URL to redirect to after successful logout. Defaults to "/login". */
  redirectTo?: string;
  /** Optional callback triggered immediately after a successful logout response. */
  onSuccess?: () => void;
  /** Optional callback triggered if the logout request fails. */
  onError?: (error: Error) => void;
}

/**
 * Reusable hook to handle Better Auth logout safely and securely.
 * 
 * - Purges TanStack Query Cache to prevent clinical or private data leakage.
 * - Handles loading, success, and error states.
 * - Triggers sonner toasts for real-time user notification.
 * - Performs a clean, absolute redirect (defaults to `/login`) via a full page reload to fully clear browser JS memory.
 */
export function useLogout(options: UseLogoutOptions = {}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  const logout = async () => {
    setIsPending(true);
    setError(null);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // 1. Purge the TanStack queryClient cache to erase patient data, billing information, etc.
            queryClient.clear();

            // 2. Optional success callback
            if (options.onSuccess) {
              options.onSuccess();
            }

            toast.success("Logged out successfully");

            // 3. Absolute redirect. A full page reload is highly recommended to purge React/JS memory state.
            const target = options.redirectTo || "/login";
            if (typeof window !== "undefined") {
              window.location.href = target;
            } else {
              navigate(target);
            }
          },
          onError: (ctx) => {
            const err = ctx.error || new Error("An error occurred during logout");
            setError(err);
            toast.error(err.message || "Error occurred while logging out");
            if (options.onError) {
              options.onError(err);
            }
          },
        },
      });
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(err?.message || "Logout failed");
      setError(errorObj);
      toast.error(errorObj.message);
      if (options.onError) {
        options.onError(errorObj);
      }
    } finally {
      setIsPending(false);
    }
  };

  return {
    logout,
    isPending,
    error,
  };
}
