export function formatDays(days) {
  if (days == null || !Number.isInteger(days) || days < 0) return 'Пока не рассчитан';
  const months = Math.floor(days / 30), rest = days % 30;
  return months ? `${months} мес.${rest ? ` ${rest} дн.` : ''}` : `${rest} дн.`;
}
export function durationRange(min, max) {
  if (min == null || max == null) return 'Пока не рассчитан';
  return `${formatDays(min)} — ${formatDays(max)}`;
}
export function projectsSubtitle(projects) {
  return projects.some(p => p.status === 'draft' || p.status === 'active')
    ? 'Продолжите ремонт или создайте новый проект.' : 'Создайте новый проект.';
}

export function projectAppearance(project) {
  if (project.status === 'draft') return {tone:'neutral',label:'Черновик'};
  if (project.status === 'completed' || project.executionProgressPercent === 100) return {tone:'sage',label:'Все этапы завершены'};
  if (project.executionProgressPercent != null) return {tone:'sand',label:'Ремонт идёт'};
  return {tone:'lavender',label:'Планирование'};
}

export function projectCardDetails(project) {
 const hasBudget=project.budgetMinRub!=null&&project.budgetMaxRub!=null;
 const money=value=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(value??0);
 const budget=hasBudget?`${money(project.budgetMinRub)} — ${money(project.budgetMaxRub)} ₽`:'Смета ещё не рассчитана';
 const completed=Math.max(0,Math.min(5,project.completedStep??0));
 const progress=project.status==='draft'
  ? {label:`Заполнено ${completed} из 5`,percent:completed*20,aria:'Заполнение проекта'}
  : project.executionProgressPercent!=null?{label:'Выполнено этапов',percent:project.executionProgressPercent,aria:'Выполнение этапов ремонта'}:null;
 const date=project.updatedAt?new Date(project.updatedAt):null;
 const updated=date&&!Number.isNaN(date.getTime())?`Изменён ${new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date)}`:null;
 return {budget,progress,updated};
}
