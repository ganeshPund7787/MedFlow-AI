import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Hardened Socket Client
 * - Exponential backoff starting at 1s up to 5s
 * - Max reconnection attempts: Infinity (Perseverance mode)
 * - Automatic connection timeout: 10s
 */
export const socket: Socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  transports: ["websocket", "polling"], // Fallback to polling if WS is blocked
});

// Helpful debug listeners for Anti-Gravity logs
if (import.meta.env.DEV) {
  socket.on("connect", () => console.log("📡 [Socket] Uplink Established"));
  socket.on("disconnect", (reason) => console.warn("📡 [Socket] Uplink Severed:", reason));
  socket.on("connect_error", (error) => console.error("📡 [Socket] Connection Fault:", error.message));
}
