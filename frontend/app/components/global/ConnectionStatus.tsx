import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { Wifi, WifiOff, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Anti-Gravity ConnectionStatus
 * Transparently monitors the real-time uplink status.
 */
export default function ConnectionStatus() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">(
    socket.connected ? "connected" : "disconnected"
  );

  useEffect(() => {
    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("connecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all duration-500",
        status === "connected" 
          ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
          : status === "connecting"
          ? "bg-amber-500/5 text-amber-500 border-amber-500/20 animate-pulse"
          : "bg-red-500/5 text-red-500 border-red-500/20"
      )}
    >
      <div className="relative flex items-center justify-center">
        {status === "connected" ? (
          <Wifi size={12} className="relative z-10" />
        ) : status === "connecting" ? (
          <Activity size={12} className="relative z-10" />
        ) : (
          <WifiOff size={12} className="relative z-10" />
        )}
        {status === "connected" && (
          <span className="absolute inset-0 bg-emerald-500 rounded-full blur-sm opacity-50 animate-ping"></span>
        )}
      </div>
      <span className="hidden sm:inline">
        {status === "connected" ? "Live Uplink" : status === "connecting" ? "Syncing..." : "Offline Mode"}
      </span>
    </div>
  );
}
