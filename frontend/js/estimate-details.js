import {timeSummary,timeNumber} from './time-summary.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=value=>Number(value).toLocaleString('ru-RU')+' ₽';
export function estimateTime(estimate){
 const t=timeSummary(estimate);if(!t)return '<details class="estimate-details time-summary"><summary>Сроки выполнения работ</summary><p>Сроки пока не рассчитаны.</p></details>';
 return `<details class="estimate-details time-summary"><summary>Сроки выполнения работ</summary>${t.groups.map(g=>`<h3>${g.title}</h3><table><thead><tr><th>Вид работ</th><th>Объём</th><th>Норматив, чел.-ч</th><th>Срок, раб. дн.</th></tr></thead><tbody>${g.rows.map(r=>r.hours===null?`<tr><th scope="row">${esc(r.title)}</th><td colspan="3" class="time-unrated">Учтено в итоге этапа; отдельный норматив не задан.</td></tr>`:`<tr><th scope="row">${esc(r.title)}</th><td data-label="Объём">${timeNumber(r.quantity)} ${esc(r.unit)}</td><td data-label="Чел.-ч">${timeNumber(r.hours)}</td><td data-label="Раб. дн.">~${timeNumber(r.workDays)}</td></tr>`).join('')}${!g.rows.length?'<tr><td colspan="4">Работы по этапу не предусмотрены.</td></tr>':''}</tbody></table><p><strong>Итого по этапу: ~${g.days} календ. дн.</strong></p>`).join('')}${t.pauses.map(p=>`<p>${esc(p.title)}: ${p.days} дн.</p>`).join('')}<p><strong>ИТОГО с учётом технологических пауз: ~${t.total}${t.max>t.total?'–'+t.max:''} дн.</strong></p>${!t.consistent?'<p class="error">Сохранённый итог не совпадает с этапами. Пересчитайте оценку, чтобы обновить срок.</p>':''}<p class="muted">В строках — рабочие дни: человеко-часы ÷ 16. Итоги этапов — календарные дни с учётом выходных и работ без отдельной нормы. Верхняя граница включает запас срока.</p><small>${esc(t.explanation)}</small></details>`;
}
export function estimateSummary(estimate){
 const d=estimate?.details;if(!d)return '<p class="muted">Разбивка оценки пока недоступна.</p>';
 const cell=(label,value)=>`<td data-label="${label}">${rub(value)}</td>`;
 const rows=(d.groups??[]).map(g=>`<tr><th scope="row">${esc(g.title)}<small>${esc(g.description)}</small></th>${cell('Работы',g.laborRub)}${cell('Материалы',g.materialsRub)}${cell('Итого',g.totalRub)}</tr>`).join('');
 const materials=Number(d.roughMaterials)+Number(d.finishMaterials);
 return `<section class="estimate-summary"><h2>Состав оценки</h2>${!d.groups?.length?'<p class="muted">Для этой сохранённой оценки нет разбивки по разделам. Она появится после пересчёта. Общие суммы сохранены.</p>':''}<table><thead><tr><th>Категория работ и материалов</th><th>Стоимость работ</th><th>Стоимость материалов</th><th>Итого по разделу</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th scope="row">ИТОГО</th>${cell('Работы',d.labor)}${cell('Материалы',materials)}${cell('Итого',Number(d.labor)+materials)}</tr></tfoot></table><p class="muted">Суммы без резерва. Оценка предварительная; разделение комплексных ставок — по составу справочника.</p></section>`;
}
function estimateAdditional(){return ` <h3>Источники цен</h3><ul>
 <li>Работы: прайс-листы <a href="https://lemanapro.ru/uslugi/?utm_referrer=https%3A%2F%2Fwww.google.com%2F" target="_blank" rel="noopener noreferrer">Лемана ПРО</a> (актуальны на октябрь 2026).</li>
 <li>Материалы: средние рыночные цены по России (на основе открытых данных строительных магазинов, обновление раз в квартал).</li>
 <li>Нормативы времени: ГЭСН (государственные сметные нормы).</li>
 </ul>
 <h3>Ограничения расчета</h3><p>Расчет является предварительным и ориентировочным. Он основан на усредненных рыночных ценах и типовых нормах расхода материалов.</p><p><strong>Скрытые работы:</strong> расчет не включает стоимость вывоза строительного мусора, доставку материалов и возможные перепланировки (если они не выбраны в параметрах).</p><p><strong>Точность площади:</strong> площади стен и потолков рассчитаны по геометрическим формулам с учетом типовой высоты потолков (2.7 м) и стандартного процента проемов. Точный объем работ определяется после обмеров на объекте.</p><p><strong>Материалы:</strong> в смету заложены средние цены на материалы. Итоговая стоимость зависит от конкретных брендов и магазинов, которые вы выберете в процессе.</p><p><strong>Сроки:</strong> расчет предполагает работу бригады из 2 человек. Технологические паузы на высыхание смесей включены.</p>`;}
export function estimateDetails(estimate,{compact=false}={}){
 if(compact)return `<details class="estimate-details cost-summary"><summary>Состав оценки</summary>${estimateSummary(estimate).replace('<h2>Состав оценки</h2>','')}</details>${estimateTime(estimate)}<details class="estimate-details estimate-additional"><summary>Дополнительно</summary>${estimateAdditional()}</details>`;
 const d=estimate?.details;if(!d)return '';
 return `<details class="estimate-details"><summary>Из чего складывается оценка</summary>
 <p>Черновые материалы: ${rub(d.roughMaterials)}<br>Чистовые материалы и оснащение: ${rub(d.finishMaterials)}<br>Работы: ${rub(d.labor)}</p>
 <p>Работы и материалы — по составу строк. Для укрупнённых ставок разделение оценочное. Суммы без резерва.</p>
 <div class="table-scroll"><table><thead><tr><th>Позиция</th><th>Объём</th><th>Ставка</th><th>Коэффициент</th><th>Сумма</th></tr></thead><tbody>${d.lines.map(l=>`<tr><td>${esc(l.name)}</td><td>${esc(l.quantity)} ${esc(l.unit)}</td><td>${rub(l.unitPriceRub)}</td><td>${esc(l.coefficient)}</td><td>${rub(l.amountRub)}</td></tr>`).join('')}</tbody></table></div>
 <p>Версия цен: ${esc(estimate.pricingVersion)}. Алгоритм: ${esc(estimate.algorithmVersion)}.</p>
 ${estimate.timePlan?.workloads?.length?`<h3>Трудозатраты по нормам</h3><p>Только работы, для которых есть нормы. 2 человека по 8 часов; сушка и ненормированные работы пояснены ниже.</p><div class="table-scroll"><table><thead><tr><th>Работа</th><th>Объём, м²</th><th>Чел.-ч / 100 м²</th><th>Чел.-ч</th></tr></thead><tbody>${estimate.timePlan.workloads.map(w=>`<tr><td>${esc(w.title)}</td><td>${esc(w.quantityM2)}</td><td>${esc(w.personHoursPer100m2)}</td><td>${Number(w.personHours).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`:''}
 ${estimateAdditional()}</details>`;
}
