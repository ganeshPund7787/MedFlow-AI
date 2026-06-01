import React, { Component, Suspense } from "react";
import type { ErrorInfo, ReactNode } from "react"
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";
import Loader from "./Loader";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SafeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SafeSuspense Component Crash] (${this.props.name || "Unknown"}):`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="p-6 border border-red-500/20 bg-red-500/5 rounded-xl flex flex-col items-center justify-center text-center space-y-4 my-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-3 bg-red-500/10 rounded-full">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-100">Component Fault Isolated</h3>
            <p className="text-xs text-zinc-500 max-w-[250px]">
              This section ({(this.props.name || "Module").toLowerCase()}) failed to render correctly.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleRetry}
            className="h-8 text-xs bg-transparent border-red-500/20 hover:bg-red-500/10 text-red-400 gap-2"
          >
            <RefreshCcw className="w-3 h-3" />
            Retry Module
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface SafeSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorName?: string;
}

/**
 * Anti-Gravity SafeSuspense
 * Combines Suspense and ErrorBoundary to prevent partial UI crashes 
 * from bringing down the entire application.
 */
const SafeSuspense = ({ children, fallback, errorName }: SafeSuspenseProps) => {
  return (
    <SafeErrorBoundary name={errorName}>
      <Suspense fallback={fallback || <Loader />}>
        {children}
      </Suspense>
    </SafeErrorBoundary>
  );
};

export default SafeSuspense;
