import type { Numeric, Project, Room } from './types.ts';

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const amount = (value: Numeric | undefined) => Number(String(value ?? '').replace(',', '.'));
export function numberError(value: Numeric, required = false, scale = 1, min = 0, max = Infinity): string {
  const raw = String(value ?? '').trim();
  if (!raw) return required ? 'Укажите значение' : '';
  const n = amount(raw);
  return !new RegExp(`^\\d+(?:[.,]\\d{1,${scale}})?$`).test(raw) || !Number.isFinite(n) || n <= 0 || n < min || n > max
    ? 'Проверьте число и допустимый диапазон' : '';
}
export const validArea = (value: Numeric) => !numberError(value,true,1,5,9999);
export const autoName = (value: Numeric) => validArea(value) ? `Ремонт квартиры ${amount(value)} м²` : '';
export function updateNameArea(name: string, area: Numeric) {
  if (!validArea(area)) return name;
  return name.replace(/(^|\s)\d+(?:[.,]\d+)?(\s*м²\s*)$/u, (_, space, unit) => space + amount(area) + unit);
}
export function parseNumbers<T>(value: T): T {
  if (Array.isArray(value)) return value.map(parseNumbers) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) =>
    [key, ['areaM2', 'ceilingHeight', 'lengthM'].includes(key) ? (v === '' || v == null ? null : amount(v)) : parseNumbers(v)])) as T;
  return value;
}
export function resumeStep(project: Project) { return Math.min(project.completedStep + 1, 6); }
export function emptyRoom(room: Room) {
  return room.automatic && (room.areaM2 == null || room.areaM2 === '') &&
    room.floor === 'inherit' && room.walls === 'inherit' && room.ceiling === 'inherit';
}
export const rub = (n: number | null | undefined) => n == null ? 'Нет данных' : `${n.toLocaleString('ru-RU')} ₽`;
export const range = (a: number | null, b: number | null) => a == null || b == null ? 'Пока не рассчитан' : `${a.toLocaleString('ru-RU')} — ${rub(b)}`;
export function apiBase(override?: string, hostUri?: string | null) {
  if (override) return override.replace(/\/$/, '');
  if (!hostUri) return 'https://mobile-prorab.onrender.com/api';
  const url = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
  // Expo's hostUri omits its scheme. Public Expo tunnels support HTTPS on port 443.
  if (url.hostname.endsWith('.exp.direct') || url.hostname.endsWith('.trycloudflare.com')) { url.protocol='https:'; url.port=''; }
  else if (url.protocol==='exp:') url.protocol='http:';
  else if (url.protocol==='exps:') url.protocol='https:';
  return `${url.origin}/prorab-api`;
}
