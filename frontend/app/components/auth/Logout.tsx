import React, { useState } from "react";
import { LogOut, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout, type UseLogoutOptions } from "@/hooks/useLogout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BaseLogoutProps extends UseLogoutOptions {
  className?: string;
}

export interface LogoutButtonProps extends BaseLogoutProps {
  /** Visual variant of the button using existing button variants. Defaults to "destructive". */
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  /** Size variant of the button. Defaults to "default". */
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  /** Text to show inside the button. Defaults to "Log out". */
  label?: string;
  /** Whether to show the logout icon. Defaults to true. */
  showIcon?: boolean;
  /** Custom icon elements if a different one is preferred. */
  customIcon?: React.ReactNode;
  /** Children overrides if custom button content is preferred. */
  children?: React.ReactNode;
  /** If true, prompts the user with a premium confirmation modal before logging out. Defaults to false. */
  confirmRequired?: boolean;
}

/**
 * Reusable premium Logout Button component with built-in Better Auth integration.
 * Offers optional click confirmation, custom loading states, and customizable visual variants.
 */
export function LogoutButton({
  variant = "destructive",
  size = "default",
  label = "Log out",
  showIcon = true,
  customIcon,
  children,
  confirmRequired = false,
  className,
  redirectTo,
  onSuccess,
  onError,
}: LogoutButtonProps) {
  const { logout, isPending } = useLogout({ redirectTo, onSuccess, onError });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleLogout = async () => {
    setIsDialogOpen(false);
    await logout();
  };

  const renderContent = () => {
    if (children) return children;
    return (
      <>
        {isPending ? (
          <Loader2 className="animate-spin" />
        ) : customIcon ? (
          customIcon
        ) : showIcon ? (
          <LogOut />
        ) : null}
        <span>{isPending ? "Signing out..." : label}</span>
      </>
    );
  };

  if (confirmRequired) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn("transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]", className)}
            disabled={isPending}
          >
            {renderContent()}
          </Button>
        </DialogTrigger>
        <DialogContent className="border border-zinc-800 bg-zinc-950/95 text-zinc-100 backdrop-blur-xl md:max-w-md animate-in fade-in duration-300">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="relative p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-bounce">
              <AlertTriangle className="size-6" />
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-md opacity-50"></div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-100">
                Terminate Secure Session?
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-400 mt-2">
                You are about to log out of MedFlow AI. Any unsaved diagnostic telemetry, patient records, or system changes will be lost.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3 border-t border-zinc-900 bg-zinc-950/40 p-4 -mx-4 -mb-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-zinc-900"
              disabled={isPending}
            >
              Cancel Operation
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogout}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center justify-center gap-2 relative overflow-hidden group"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="animate-spin size-4" />
              ) : (
                <LogOut className="size-4 group-hover:translate-x-0.5 transition-transform" />
              )}
              {isPending ? "Terminating..." : "Confirm Sign Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={logout}
      className={cn("transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]", className)}
      disabled={isPending}
    >
      {renderContent()}
    </Button>
  );
}

export interface LogoutCardProps extends BaseLogoutProps {
  title?: string;
  description?: string;
}

/**
 * Standing Card logout module. Renders a stunning glassmorphic UI card
 * with confirmation trigger. Great for custom '/logout' specific viewports or panels.
 */
export function LogoutCard({
  title = "Secure Session Termination",
  description = "Please confirm that you want to disconnect from MedFlow AI systems.",
  className,
  redirectTo,
  onSuccess,
  onError,
}: LogoutCardProps) {
  const { logout, isPending } = useLogout({ redirectTo, onSuccess, onError });

  return (
    <Card className={cn("relative overflow-hidden border border-zinc-800 bg-zinc-950/80 text-zinc-100 backdrop-blur-xl shadow-2xl max-w-md w-full", className)}>
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
      <CardHeader className="flex flex-col items-center text-center space-y-4 pb-4">
        <div className="p-3.5 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-400">
          <LogOut className="size-6" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-100">{title}</CardTitle>
          <CardDescription className="text-sm text-zinc-400">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="text-center text-xs text-zinc-500 px-6 py-2">
        Logging out will safely release session authorization tokens, flush browser memory registers, and direct you back to the gatekeeper portal.
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6 pb-6 px-6">
        <Button
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.history.back();
            }
          }}
          className="w-full sm:flex-1 border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100"
          disabled={isPending}
        >
          Return to Console
        </Button>
        <Button
          variant="destructive"
          onClick={logout}
          className="w-full sm:flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold flex items-center justify-center gap-2"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="animate-spin size-4" /> : <LogOut className="size-4" />}
          {isPending ? "Terminating..." : "Terminate Session"}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Reusable custom item suitable to drop straight into dropdown menus (like shadcn DropdownMenuContent)
 * with robust state handling and customizable label.
 */
export const LogoutMenuItem = React.forwardRef<
  HTMLDivElement,
  BaseLogoutProps & {
    label?: string;
    onSelect?: (e: Event) => void;
  }
>(({ className, label = "Log out", redirectTo, onSuccess, onError, onSelect, ...props }, ref) => {
  const { logout, isPending } = useLogout({ redirectTo, onSuccess, onError });

  const handleSelect = async (e: any) => {
    if (onSelect) {
      onSelect(e);
    }
    e.preventDefault(); // Prevent closing dropdown prematurely
    await logout();
  };

  return (
    <div
      ref={ref}
      onClick={handleSelect}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        isPending && "opacity-50 pointer-events-none",
        className
      )}
      role="menuitem"
      {...props}
    >
      {isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
      <span>{isPending ? "Signing out..." : label}</span>
    </div>
  );
});

LogoutMenuItem.displayName = "LogoutMenuItem";
