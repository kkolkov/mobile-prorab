const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=value=>Number(value).toLocaleString('ru-RU')+' ₽';
export function estimateDetails(estimate){
 const d=estimate?.details;if(!d)return '';
 return `<details class="estimate-details"><summary>Из чего складывается оценка</summary>
 <p>Черновые материалы: ${rub(d.roughMaterials)}<br>Чистовые материалы и оснащение: ${rub(d.finishMaterials)}<br>Работы: ${rub(d.labor)}</p>
 <p>Разделение по условным долям справочника. Суммы без резерва.</p>
 <div class="table-scroll"><table><thead><tr><th>Позиция</th><th>Объём</th><th>Ставка</th><th>Коэффициент</th><th>Сумма</th></tr></thead><tbody>${d.lines.map(l=>`<tr><td>${esc(l.name)}</td><td>${esc(l.quantity)} ${esc(l.unit)}</td><td>${rub(l.unitPriceRub)}</td><td>${esc(l.coefficient)}</td><td>${rub(l.amountRub)}</td></tr>`).join('')}</tbody></table></div>
 <p>Версия цен: ${esc(estimate.pricingVersion)}. Алгоритм: ${esc(estimate.algorithmVersion)}.</p>
 <h3>Источники ставок</h3><ul>${[...new Set(d.lines.map(l=>`${l.priceDate}: ${l.source}`))].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <h3>Допущения расчёта</h3><ul>${(estimate.assumptions??[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`;
}
