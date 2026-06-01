import { FileSearch, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="relative p-6 bg-primary/5 border border-primary/20 rounded-full">
          <FileSearch className="w-16 h-16 text-primary" />
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          404: Lost in Orbit
        </h1>
        <p className="text-muted-foreground text-lg">
          The medical module you're looking for doesn't exist or has been relocated to another sector.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="flex-1 h-12 gap-2 border-zinc-700 hover:bg-zinc-800 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
        <Button 
          asChild
          className="flex-1 h-12 gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          <a href="/dashboard">
            <Home className="w-4 h-4" />
            Return Home
          </a>
        </Button>
      </div>

      <div className="pt-12">
        <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
          Resilience protocol: active
        </p>
      </div>
    </div>
  );
}
