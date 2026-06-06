import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import type { Route } from "./+types/root";
import { queryClient } from "./lib/query-client";
import "./app.css";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/provider/theme";
import ToastProvider from "./components/provider/toast";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storageKey = "medflow-theme";
                  var defaultTheme = "system";
                  var theme = localStorage.getItem(storageKey) || defaultTheme;
                  var supportDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  
                  var root = document.documentElement;
                  root.classList.remove("light", "dark");
                  
                  if (theme === "dark" || (theme === "system" && supportDarkMode)) {
                    root.classList.add("dark");
                  } else {
                    root.classList.add("light");
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="medflow-theme">
          <TooltipProvider>{children}</TooltipProvider>
          <ToastProvider />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { Button } from "./components/ui/button";

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "System Failure";
  let details = "An unexpected error occurred in this module.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Route Not Found" : "Navigation Error";
    details =
      error.status === 404
        ? "The requested medical module could not be located."
        : error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 font-sans">
      <div className="max-w-2xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative group">
          <div className="absolute -inset-1 bg-linear-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
                  {message}
                </h1>
                <p className="text-zinc-400 font-medium">
                  Critical Fault Detected
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 font-mono text-sm text-red-400 break-words">
                {details}
              </div>

              {stack && import.meta.env.DEV && (
                <div className="mt-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800/50 overflow-hidden">
                  <p className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                    Technical Telemetry
                  </p>
                  <pre className="text-[10px] text-zinc-600 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 scrollbar-hide">
                    {stack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all font-semibold gap-2 border-none h-12"
              >
                <RefreshCcw className="w-4 h-4" />
                Initialize Recovery (Reload)
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1 border-zinc-800 hover:bg-zinc-800 transition-all font-semibold gap-2 text-zinc-300 h-12"
              >
                <a href="/dashboard">
                  <Home className="w-4 h-4" />
                  Return to Dashboard
                </a>
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 font-medium flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          Anti-Gravity Protocol Active
        </p>
      </div>
    </div>
  );
}
