// client/src/lib/bus.ts
type Handler<T = any> = (payload: T) => void;

const listeners = new Map<string, Set<Handler>>();

export function on<T = any>(event: string, fn: Handler<T>) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(fn as Handler);
  return () => off(event, fn);
}

export function off<T = any>(event: string, fn: Handler<T>) {
  listeners.get(event)?.delete(fn as Handler);
}

export function emit<T = any>(event: string, payload: T) {
  listeners.get(event)?.forEach(fn => {
    try { fn(payload); } catch {}
  });
}
