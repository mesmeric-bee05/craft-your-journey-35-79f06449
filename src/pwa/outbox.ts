/**
 * Offline outbox — queues user actions when offline and replays them
 * when connectivity returns. Backed by IndexedDB via idb-keyval.
 */
import { createStore, get, set, del, keys } from "idb-keyval";
import { useEffect, useState, useSyncExternalStore } from "react";

export type OutboxKind =
  | "message.send"
  | "conversation.reply"
  | "feedback.submit"
  | "note.create"
  | "generic.mutation"
  | "test.success"
  | "test.transient"
  | "test.permanent";

export interface OutboxItem<T = unknown> {
  id: string;
  kind: OutboxKind;
  payload: T;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface FlushProgress {
  running: boolean;
  processed: number;
  failed: number;
  total: number;
}

type Handler = (item: OutboxItem) => Promise<void>;

const store = createStore("smartreach-outbox", "queue");
const handlers = new Map<OutboxKind, Handler>();
const listeners = new Set<() => void>();
const progressListeners = new Set<() => void>();

let progress: FlushProgress = { running: false, processed: 0, failed: 0, total: 0 };
let simulatedOffline = false;

function notify() { listeners.forEach((l) => l()); }
function notifyProgress() { progressListeners.forEach((l) => l()); }

export function registerOutboxHandler(kind: OutboxKind, handler: Handler) {
  handlers.set(kind, handler);
}
export function unregisterOutboxHandler(kind: OutboxKind) {
  handlers.delete(kind);
}

export function setSimulatedOffline(v: boolean) {
  simulatedOffline = v;
  notify();
}
export function isSimulatedOffline() { return simulatedOffline; }

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
  if (navigator.onLine && !simulatedOffline) void flushOutbox();
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
  if (flushing || !navigator.onLine || simulatedOffline) return { processed: 0, failed: 0 };
  flushing = true;
  let processed = 0;
  let failed = 0;
  try {
    const items = await listOutbox();
    progress = { running: true, processed: 0, failed: 0, total: items.length };
    notifyProgress();
    for (const item of items) {
      const handler = handlers.get(item.kind);
      if (!handler) continue;
      try {
        await handler(item);
        await del(item.id, store);
        processed += 1;
        progress = { ...progress, processed };
        notifyProgress();
        notify();
      } catch (err) {
        failed += 1;
        const updated: OutboxItem = {
          ...item,
          attempts: item.attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        };
        await set(item.id, updated, store);
        if (updated.attempts >= 8) await del(item.id, store);
        progress = { ...progress, failed };
        notifyProgress();
        notify();
      }
    }
  } finally {
    flushing = false;
    progress = { ...progress, running: false };
    notifyProgress();
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
    return () => { mounted = false; unsub(); window.removeEventListener("online", refresh); };
  }, []);
  return count;
}

export function useOutboxItems(): OutboxItem[] {
  const [items, setItems] = useState<OutboxItem[]>([]);
  useEffect(() => {
    let mounted = true;
    const refresh = () => listOutbox().then((xs) => mounted && setItems(xs));
    refresh();
    const unsub = subscribe(refresh);
    return () => { mounted = false; unsub(); };
  }, []);
  return items;
}

export function useFlushProgress(): FlushProgress {
  return useSyncExternalStore(
    (cb) => { progressListeners.add(cb); return () => progressListeners.delete(cb); },
    () => progress,
    () => progress,
  );
}

function getOnline() {
  if (simulatedOffline) return false;
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      listeners.add(cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
        listeners.delete(cb);
      };
    },
    getOnline,
    () => true,
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { void flushOutbox(); });
}
