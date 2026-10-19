// Durations are estimates: one display month is 30 days, not a calendar month.
export function formatDays(days: number | null | undefined) {
  if (days == null || !Number.isInteger(days) || days < 0) return 'Пока не рассчитан';
  const months = Math.floor(days / 30), rest = days % 30;
  return months ? `${months} мес.${rest ? ` ${rest} дн.` : ''}` : `${rest} дн.`;
}
export function durationRange(min: number | null | undefined, max: number | null | undefined) {
  if (min == null || max == null) return 'Пока не рассчитан';
  return `${formatDays(min)} — ${formatDays(max)}`;
}
export function projectsSubtitle(projects: readonly {status: string}[]) {
  return projects.some(p => p.status === 'draft' || p.status === 'active')
    ? 'Продолжите ремонт или создайте новый проект.' : 'Создайте новый проект.';
}
