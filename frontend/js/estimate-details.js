import {timeSummary,timeNumber,timeExplanation} from './time-summary.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=value=>Number(value).toLocaleString('ru-RU')+' ₽';
export function estimateDetails(estimate){
 const d=estimate?.details;if(!d)return '';
 return `<details class="estimate-details"><summary>Из чего складывается оценка</summary>
 <p>Черновые материалы: ${rub(d.roughMaterials)}<br>Чистовые материалы и оснащение: ${rub(d.finishMaterials)}<br>Работы: ${rub(d.labor)}</p>
 <p>Работы и материалы — по составу строк. Для укрупнённых ставок разделение оценочное. Суммы без резерва.</p>
 ${timeDetails(estimate)}
 <h3>Источники цен</h3>
 <p>Работы: загруженные прайсы и нормативные ориентиры. <a href="https://lemanapro.ru/" target="_blank" rel="noopener noreferrer">Прайс-листы Лемана ПРО</a> — для сравнения; источник каждой ставки указан в подробностях.</p>
 <p>Материалы: усреднённые цены по городам России, открытые прайсы магазинов и нормативные ориентиры. Плановое обновление — раз в квартал, вручную; автоматическая актуализация не настроена.</p>
 <p>Нормативы времени: ГЭСН для работ, обеспеченных нормами.</p>
 <h3>Ограничения расчёта</h3>
 <p>Смета предварительная. Площади рассчитаны по геометрическим допущениям; точные объёмы подтверждаются после обмеров. Средние цены зависят от выбранных брендов и магазинов. Сроки рассчитаны для бригады из двух человек и включают рассчитанные технологические паузы.</p>
 <p><strong>Не входят в расчёт:</strong> вывоз строительного мусора, доставка материалов и перепланировка. Сейчас эти расходы учитываются отдельно; выбор перепланировки в параметрах не добавляет её стоимость.</p>
 <details class="calculation-technical"><summary>Подробности расчёта</summary>
 <div class="table-scroll"><table><thead><tr><th>Позиция</th><th>Объём</th><th>Ставка</th><th>Коэффициент</th><th>Сумма</th></tr></thead><tbody>${d.lines.map(l=>`<tr><td>${esc(l.name)}</td><td>${esc(l.quantity)} ${esc(l.unit)}</td><td>${rub(l.unitPriceRub)}</td><td>${esc(l.coefficient)}</td><td>${rub(l.amountRub)}</td></tr>`).join('')}</tbody></table></div>
 <p>Версия цен: ${esc(estimate.pricingVersion)}. Алгоритм: ${esc(estimate.algorithmVersion)}.</p>
 <h3>Источники ставок</h3><ul>${[...new Set(d.lines.map(l=>`${l.priceDate}: ${l.source}`))].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <h3>Допущения расчёта</h3><ul>${(estimate.assumptions??[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>Пояснения к срокам</h3><ul>${(estimate.timePlan?.assumptions??[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details></details>`;
}

function timeDetails(estimate){
 const plan=timeSummary(estimate);
 if(!plan)return '<h3>Сроки по этапам</h3><p>Для этой оценки разбивка сроков не сохранена. Пересчитайте оценку, чтобы получить сроки по этапам.</p>';
 return `<section class="time-summary"><h3>Сроки по этапам</h3><p>${timeExplanation}</p>
 ${plan.groups.map(g=>`<section class="time-stage"><h4>${g.title}</h4>
 ${g.rows.length?`<ul class="time-work-list">${g.rows.map(r=>`<li><strong>${esc(r.title)}</strong><div>Объём: ${timeNumber(r.quantity)} ${esc(r.unit)}</div>${r.norm==null?'<div class="muted">Отдельная норма и срок не рассчитаны; учтено в сроке этапа.</div>':`<div>Норма: ${timeNumber(r.norm)} чел.-ч / 100 м² · Трудозатраты: ${timeNumber(r.hours)} чел.-ч</div><div>Срок работы: ${timeNumber(r.workDays)} рабочих дн.</div>`}</li>`).join('')}</ul>`:`<p>${g.days?'Подробные трудозатраты не рассчитаны. Срок включает монтаж и уборку по сохранённому плану.':'Работы этого этапа не предусмотрены.'}</p>`}
 <p><strong>Итого по этапу: ${g.days} календарных дн.</strong></p></section>`).join('')}
 ${plan.pauses.map(p=>`<p>${esc(p.title)}: <strong>${p.days} календарных дн.</strong></p>`).join('')}
 <p><strong>${plan.consistent?`Общий срок с паузами: ${plan.total} календарных дн.`:'Для общего срока пересчитайте оценку: сохранённый итог не совпадает с этапами.'}</strong></p>
 <p class="muted">Дни отдельных работ — рабочие, по 16 человеко-часов в день. Итоги этапов — календарные: учитывают выходные, округление и работы без отдельных норм. Финишный монтаж и уборка включены в чистовой этап. Общий срок — сумма этапов и пауз; верхняя граница оценки содержит дополнительный запас.</p></section>`;
}
