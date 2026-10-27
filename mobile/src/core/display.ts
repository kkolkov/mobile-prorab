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

// Presentation only: completing the schedule does not change the persisted project status.
export function projectAppearance(project: {status:string;executionProgressPercent?:number|null}) {
  if (project.status === 'draft') return {tone:'neutral',label:'Черновик'};
  if (project.status === 'completed' || project.executionProgressPercent === 100) return {tone:'sage',label:'Все этапы завершены'};
  if (project.executionProgressPercent != null) return {tone:'sand',label:'Ремонт идёт'};
  return {tone:'lavender',label:'Планирование'};
}

export function projectCardDetails(project: {status:string;completedStep?:number;executionProgressPercent?:number|null;budgetMinRub?:number|null;budgetMaxRub?:number|null;updatedAt?:string|null}) {
 const hasBudget=project.budgetMinRub!=null&&project.budgetMaxRub!=null;
 const money=(value:number|null|undefined)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(value??0);
 const budget=hasBudget?`${money(project.budgetMinRub)} — ${money(project.budgetMaxRub)} ₽`:'Смета ещё не рассчитана';
 const completed=Math.max(0,Math.min(5,project.completedStep??0));
 const progress=project.status==='draft'
  ? {label:completed===5?'Все 5 шагов заполнены':`Шаг ${completed+1} из 5`,percent:completed*20,aria:'Заполнение проекта'}
  : project.executionProgressPercent!=null?{label:'Этапы завершены',percent:project.executionProgressPercent,aria:'Выполнение этапов ремонта'}:null;
 const date=project.updatedAt?new Date(project.updatedAt):null;
 const updated=date&&!Number.isNaN(date.getTime())?`Изменён ${new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date)}`:null;
 return {budget,progress,updated};
}
