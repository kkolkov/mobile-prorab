const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=value=>Number(value).toLocaleString('ru-RU')+' ₽';
export function estimateDetails(estimate){
 const d=estimate?.details;if(!d)return '';
 return `<details class="estimate-details"><summary>Из чего складывается оценка</summary>
 <p>Черновые материалы: ${rub(d.roughMaterials)}<br>Чистовые материалы и оснащение: ${rub(d.finishMaterials)}<br>Работы: ${rub(d.labor)}</p>
 <p>Работы и материалы — по составу строк. Для укрупнённых ставок разделение оценочное. Суммы без резерва.</p>
 <div class="table-scroll"><table><thead><tr><th>Позиция</th><th>Объём</th><th>Ставка</th><th>Коэффициент</th><th>Сумма</th></tr></thead><tbody>${d.lines.map(l=>`<tr><td>${esc(l.name)}</td><td>${esc(l.quantity)} ${esc(l.unit)}</td><td>${rub(l.unitPriceRub)}</td><td>${esc(l.coefficient)}</td><td>${rub(l.amountRub)}</td></tr>`).join('')}</tbody></table></div>
 <p>Версия цен: ${esc(estimate.pricingVersion)}. Алгоритм: ${esc(estimate.algorithmVersion)}.</p>
 ${estimate.timePlan?.workloads?.length?`<h3>Трудозатраты по нормам</h3><p>Только работы, для которых есть нормы. 2 человека по 8 часов; сушка и ненормированные работы пояснены ниже.</p><div class="table-scroll"><table><thead><tr><th>Работа</th><th>Объём, м²</th><th>Чел.-ч / 100 м²</th><th>Чел.-ч</th></tr></thead><tbody>${estimate.timePlan.workloads.map(w=>`<tr><td>${esc(w.title)}</td><td>${esc(w.quantityM2)}</td><td>${esc(w.personHoursPer100m2)}</td><td>${Number(w.personHours).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`:''}
 <h3>Источники ставок</h3><ul>${[...new Set(d.lines.map(l=>`${l.priceDate}: ${l.source}`))].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <h3>Допущения расчёта</h3><ul>${(estimate.assumptions??[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`;
}
