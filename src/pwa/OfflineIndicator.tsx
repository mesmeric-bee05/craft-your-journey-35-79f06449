import { useEffect } from "react";
import { WifiOff, CloudUpload } from "lucide-react";
import { flushOutbox, useOnlineStatus, useOutboxCount } from "./outbox";

/**
 * Fixed offline / queued-actions indicator.
 * Renders only when offline OR when there are queued outbox items.
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();
  const queued = useOutboxCount();

  useEffect(() => {
    if (online && queued > 0) void flushOutbox();
  }, [online, queued]);

  if (online && queued === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/10 bg-background/80 px-4 py-2 text-sm shadow-lg backdrop-blur-md"
    >
      {!online ? (
        <>
          <WifiOff className="h-4 w-4 text-destructive" aria-hidden />
          <span>Offline — actions will sync when you're back</span>
        </>
      ) : (
        <>
          <CloudUpload className="h-4 w-4 text-primary animate-pulse" aria-hidden />
          <span>Syncing {queued} pending {queued === 1 ? "action" : "actions"}…</span>
        </>
      )}
    </div>
  );
}
