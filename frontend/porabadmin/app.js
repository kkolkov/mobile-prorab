import {esc} from '/js/refinement/forms.js';
const base=['localhost','127.0.0.1'].includes(location.hostname)&&location.port==='5500'?'http://localhost:8080/api':'/api';
const rows=document.querySelector('#rows'),editor=document.querySelector('#editor'),status=document.querySelector('#status'),error=document.querySelector('#error');
let catalog={rows:[],missing:[]},draft=null,busy=false,conflict=false;
async function request(path='',body,method='PUT'){
 const r=await fetch(base+'/porabadmin/prices'+path,{method:body===undefined?'GET':method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const raw=await r.text();let data;try{data=raw?JSON.parse(raw):null;}catch{throw new Error('Сервер вернул некорректный ответ');}
 if(!r.ok){const e=new Error(data?.message||'Не удалось выполнить запрос');e.status=r.status;throw e;}return data;
}
function renderList(){
 const query=document.querySelector('#search').value.toLowerCase().trim(),group=document.querySelector('#catalog-group').value;
 const visible=catalog.rows.filter(r=>(group==='legacy'?!r.code.includes('.'):r.code.startsWith(group))&&(`${r.title} ${r.code}`.toLowerCase().includes(query)));

 rows.innerHTML=`<div class="table-scroll"><table><thead><tr><th>Позиция</th><th>Цена, ₽</th><th>Источник и дата</th><th>Статус</th><th>Действия</th></tr></thead><tbody>${visible.map(r=>`<tr><td><b>${esc(r.title)}</b><small>${esc(r.code)} · за ${esc(r.unit)}</small><small>Черновые: ${+(r.roughShare*100).toFixed(2)}% · работа: ${+(r.laborShare*100).toFixed(2)}% · чистовые: ${+((1-r.roughShare-r.laborShare)*100).toFixed(2)}%</small></td><td>${r.unitPriceRub.toLocaleString('ru-RU')}</td><td class="source"><details><summary>Источник и состав</summary>${esc(r.sourceNote)}</details><small>${esc(r.priceDate)}</small></td><td>${r.verified?'Проверена администратором':'Не проверена'}</td><td><button class="secondary" data-edit="${esc(r.code)}">Изменить</button><button class="secondary" data-delete="${esc(r.code)}">Удалить</button></td></tr>`).join('')}</tbody></table></div>`;
 document.querySelector('#missing').innerHTML=catalog.missing.length?`<div class="notice"><b>В справочнике удалены позиции.</b><p>Расчёт, которому нужна удалённая позиция, остановится. Верните её и задайте цену для восстановления.</p>${catalog.missing.map(d=>`<button class="secondary" data-restore="${esc(d.code)}">Вернуть: ${esc(d.title)}</button>`).join('')}</div>`:'';
 document.querySelectorAll('[data-edit],[data-restore],[data-delete]').forEach(b=>{b.disabled=busy;b.onclick=()=>{
  if(busy)return;if(draft&&!confirm('Закрыть текущую форму без сохранения?'))return;
  error.textContent='';conflict=false;
  const code=b.dataset.edit||b.dataset.restore||b.dataset.delete,r=catalog.rows.find(r=>r.code===code);
  draft=b.dataset.restore?{...catalog.missing.find(d=>d.code===code),version:null,unitPriceRub:'',roughPercent:'',laborPercent:'',sourceNote:'',priceDate:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),verified:false}: {...r,roughPercent:+(r.roughShare*100).toFixed(2),laborPercent:+(r.laborShare*100).toFixed(2)};
  draft.remove=!!b.dataset.delete;renderEditor();editor.scrollIntoView({behavior:'smooth',block:'start'});
 };});
}
function field(key,label,type='text',extra=''){return `<div class="field"><label for="${key}">${label}</label><input id="${key}" name="${key}" type="${type}" value="${esc(draft[key])}" ${extra} required></div>`;}
function renderEditor(){
 if(!draft){editor.innerHTML='';return;}
 editor.innerHTML=`<form class="notice" id="price-form"><h2>${draft.remove?'Удалить':'Изменить'}: ${esc(draft.title)}</h2><p>${esc(draft.code)} · стоимость за ${esc(draft.unit)}</p>${draft.remove?'<p>Удалить строку из базы? Расчёты с этой позицией станут недоступны до восстановления ставки. Сохранённые сметы останутся.</p>':`<div class="field-grid">${field('unitPriceRub','Цена за указанную единицу, ₽','number','min="0.01" max="99999999.99" step="0.01"')}${field('roughPercent','Доля черновых материалов, %','number','min="0" max="100" step="0.01"')}${field('laborPercent','Доля работы, %','number','min="0" max="100" step="0.01"')}${field('priceDate','Дата проверки цены','date')}</div><p>Остаток до 100% — чистовые материалы и оснащение.</p><div class="field"><label for="sourceNote">Источник: ссылка / прайс, город и состав цены</label><textarea id="sourceNote" name="sourceNote" maxlength="4000" required>${esc(draft.sourceNote)}</textarea></div><label class="check"><input name="verified" type="checkbox" ${draft.verified?'checked':''}> Цена проверена по указанному источнику</label>`}<p id="form-error" role="alert" class="error"></p><div class="actions"><button class="primary" id="save" ${busy||conflict?'disabled':''}>${busy?'Сохранение…':draft.remove?'Да, удалить':'Сохранить'}</button><button type="button" id="cancel" class="secondary" ${busy?'disabled':''}>${draft.remove?'Нет':'Отмена'}</button>${conflict?'<button type="button" id="refresh-version" class="secondary">Загрузить актуальную версию, сохранив ввод</button>':''}</div></form>`;
 editor.querySelectorAll('input,textarea').forEach(input=>{input.disabled=busy;input.oninput=()=>{draft[input.name]=input.type==='checkbox'?input.checked:input.value;if(input.name!=='verified'){draft.verified=false;editor.querySelector('[name=verified]').checked=false;}};});
 editor.querySelector('#cancel').onclick=()=>{draft=null;conflict=false;renderEditor();};
 const refresh=editor.querySelector('#refresh-version');if(refresh)refresh.onclick=async()=>{
  await run(async()=>{catalog=await request();const fresh=catalog.rows.find(r=>r.code===draft.code);if(!fresh)throw new Error('Строка удалена. Отмените форму и верните позицию из списка отсутствующих.');draft.version=fresh.version;conflict=false;status.textContent='Версия обновлена. Ваш ввод сохранён. Проверьте значения перед сохранением.';});
 };
 editor.querySelector('form').onsubmit=e=>{e.preventDefault();if(busy||conflict)return;void run(async()=>{
  if(draft.remove)await request('/'+draft.code+'/delete?version='+draft.version,{},'POST');
  else {const rough=Number(draft.roughPercent),labor=Number(draft.laborPercent);if(rough+labor>100)throw new Error('Сумма долей не может превышать 100%');
   await request('/'+draft.code,{version:draft.version,unitPriceRub:Number(draft.unitPriceRub),roughShare:Number((rough/100).toFixed(4)),laborShare:Number((labor/100).toFixed(4)),sourceNote:draft.sourceNote,priceDate:draft.priceDate,verified:draft.verified});}
  status.textContent=draft.remove?'Строка удалена.':'Изменения сохранены. Для существующего проекта повторите расчёт в уточнении и примените новую смету.';draft=null;catalog=await request();
 });};
}
async function run(fn){if(busy)return;busy=true;error.textContent='';document.querySelector('#reload').disabled=true;renderList();renderEditor();let message='';
 try{await fn();}catch(e){conflict=e.status===409;message=conflict?'Строка изменена в другом сеансе. Ваш ввод сохранён. Загрузите актуальную версию перед повтором.':e.message||'Не удалось связаться с сервером. Ввод сохранён.';}
 finally{busy=false;document.querySelector('#reload').disabled=false;renderList();renderEditor();(editor.querySelector('#form-error')||error).textContent=message;}
}
document.querySelector('#reload').onclick=()=>run(async()=>{catalog=await request();status.textContent=draft?'Список обновлён. Несохранённый ввод оставлен в форме.':'Список обновлён.';});
document.querySelector('#search').oninput=renderList;
document.querySelector('#catalog-group').onchange=renderList;
void run(async()=>{catalog=await request();});
