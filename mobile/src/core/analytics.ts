type Event = { name: string; projectId?: string; section?: string; step?: number };
const subscribers = new Set<(event: Event) => void>();
export const emit = (event: Event) => subscribers.forEach(listener => listener(event));
export function subscribe(listener: (event: Event) => void) { subscribers.add(listener); return () => subscribers.delete(listener); }
