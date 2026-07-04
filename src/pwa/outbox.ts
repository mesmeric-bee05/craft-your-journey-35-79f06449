/**
 * Offline outbox — queues user actions when offline and replays them
 * when connectivity returns. Backed by IndexedDB via idb-keyval.
 *
 * Usage:
 *   import { enqueue, flushOutbox, useOutboxStatus } from "@/pwa/outbox";
 *   await enqueue({ kind: "message.send", payload: { conversationId, content } });
 */
import { createStore, get, set, del, keys } from "idb-keyval";
import { useEffect, useState, useSyncExternalStore } from "react";

export type OutboxKind =
  | "message.send"
  | "conversation.reply"
  | "feedback.submit"
  | "note.create"
  | "generic.mutation";

export interface OutboxItem<T = unknown> {
  id: string;
  kind: OutboxKind;
  payload: T;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

type Handler = (item: OutboxItem) => Promise<void>;

const store = createStore("smartreach-outbox", "queue");
const handlers = new Map<OutboxKind, Handler>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function registerOutboxHandler(kind: OutboxKind, handler: Handler) {
  handlers.set(kind, handler);
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueue<T>(input: { kind: OutboxKind; payload: T }): Promise<OutboxItem<T>> {
  const item: OutboxItem<T> = {
    id: genId(),
    kind: input.kind,
    payload: input.payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await set(item.id, item, store);
  notify();
  // Try to flush immediately if online
  if (navigator.onLine) void flushOutbox();
  return item;
}

export async function outboxSize(): Promise<number> {
  const ks = await keys(store);
  return ks.length;
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const ks = await keys(store);
  const items: OutboxItem[] = [];
  for (const k of ks) {
    const item = await get<OutboxItem>(k as IDBValidKey, store);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

let flushing = false;
export async function flushOutbox(): Promise<{ processed: number; failed: number }> {
  if (flushing || !navigator.onLine) return { processed: 0, failed: 0 };
  flushing = true;
  let processed = 0;
  let failed = 0;
  try {
    const items = await listOutbox();
    for (const item of items) {
      const handler = handlers.get(item.kind);
      if (!handler) continue; // leave unknown items in place
      try {
        await handler(item);
        await del(item.id, store);
        processed += 1;
        notify();
      } catch (err) {
        failed += 1;
        const updated: OutboxItem = {
          ...item,
          attempts: item.attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        };
        await set(item.id, updated, store);
        if (updated.attempts >= 8) {
          // Give up eventually to avoid poison-pill loops
          await del(item.id, store);
        }
        notify();
      }
    }
  } finally {
    flushing = false;
  }
  return { processed, failed };
}

export async function clearOutbox() {
  const ks = await keys(store);
  await Promise.all(ks.map((k) => del(k as IDBValidKey, store)));
  notify();
}

// -------- React helpers --------

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useOutboxCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let mounted = true;
    const refresh = () => outboxSize().then((n) => mounted && setCount(n));
    refresh();
    const unsub = subscribe(refresh);
    window.addEventListener("online", refresh);
    return () => {
      mounted = false;
      unsub();
      window.removeEventListener("online", refresh);
    };
  }, []);
  return count;
}

function getOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    getOnline,
    () => true,
  );
}

// Auto-flush when connectivity returns
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void flushOutbox();
  });
}
