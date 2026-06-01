import { Ghost, RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
}

/**
 * Anti-Gravity Empty State
 * Assumes data might be null and provides a professional fallback
 */
export default function EmptyState({
  title = "No Data Found",
  description = "the requested systems are currently empty or unavailable.",
  onRetry,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20 text-center space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="p-4 bg-zinc-800/50 rounded-full text-zinc-500">
        {icon || <Ghost className="w-12 h-12" />}
      </div>
      
      <div className="max-w-xs space-y-1">
        <h3 className="text-xl font-bold text-zinc-200">{title}</h3>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>

      {onRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          className="gap-2 border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry Subsystem
        </Button>
      )}
    </div>
  );
}
