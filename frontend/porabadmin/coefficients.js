import {esc} from '/js/refinement/forms.js';
const base=['localhost','127.0.0.1'].includes(location.hostname)&&location.port==='5500'?'http://localhost:8080/api':'/api';
const root=base+'/porabadmin/coefficients',rows=document.querySelector('#rows'),editor=document.querySelector('#editor'),error=document.querySelector('#error'),status=document.querySelector('#status'),reload=document.querySelector('#reload');
let items=[],draft=null,busy=false,conflict=false,loaded=false;
async function request(path='',body){
 const r=await fetch(root+path,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok){const e=new Error(data.message||'Не удалось сохранить коэффициент');e.status=r.status;throw e;}return data;
}
function render(){
 reload.disabled=busy;
 rows.innerHTML=items.length?`<div class="table-scroll"><table><thead><tr><th>Коэффициент</th><th>Значение</th><th></th></tr></thead><tbody>${items.map(n=>`<tr><td>${esc(n.title)}<p>${esc(n.description)}</p></td><td>${esc(n.value)}</td><td><button class="secondary" data-code="${esc(n.code)}" ${busy?'disabled':''}>Изменить</button></td></tr>`).join('')}</tbody></table></div>`:(busy?'Загрузка…':loaded?'Коэффициенты не найдены. Проверьте применение миграций базы данных.':'Не удалось загрузить список. Нажмите «Обновить список».');
 rows.querySelectorAll('[data-code]').forEach(b=>b.onclick=()=>{if(draft&&!confirm('Закрыть несохранённую форму?'))return;draft={...items.find(n=>n.code===b.dataset.code)};conflict=false;error.textContent='';status.textContent='';render();editor.scrollIntoView({block:'start',behavior:'smooth'});editor.querySelector('input').focus();});
 if(!draft){editor.innerHTML='';return;}
 editor.innerHTML=`<form class="notice"><h2>${esc(draft.title)}</h2><p>${esc(draft.description)}</p><div class="field"><label for="value">Значение (от ${esc(draft.minimum)} до ${esc(draft.maximum)})</label><input id="value" inputmode="decimal" type="text" value="${esc(draft.value)}" required ${busy?'disabled':''}></div><div class="actions"><button class="primary" ${busy||conflict?'disabled':''}>${busy?'Сохранение…':'Сохранить'}</button><button class="secondary" id="cancel" type="button" ${busy?'disabled':''}>Отмена</button>${conflict?'<button class="secondary" type="button" id="refresh">Сверить с текущей версией</button>':''}</div></form>`;
 editor.querySelector('input').oninput=e=>draft.value=e.target.value;
 editor.querySelector('#cancel').onclick=()=>{draft=null;conflict=false;error.textContent='';render();};
 const refresh=editor.querySelector('#refresh');if(refresh)refresh.onclick=()=>run(async()=>{items=await request();const n=items.find(n=>n.code===draft.code);if(!n)throw new Error('Коэффициент не найден');status.textContent=`Сейчас в базе: ${n.value}. Ваш ввод сохранён. Проверьте его перед сохранением.`;draft.version=n.version;conflict=false;});
 editor.querySelector('form').onsubmit=e=>{e.preventDefault();if(busy||conflict)return;const raw=String(draft.value).trim().replace(',','.');const value=Number(raw);if(!/^\d+(?:\.\d{1,4})?$/.test(raw)||!Number.isFinite(value)||value<draft.minimum||value>draft.maximum){error.textContent=`Введите число от ${draft.minimum} до ${draft.maximum}, не более четырёх знаков после запятой.`;return;}void run(async()=>{const saved=await request('/'+draft.code,{version:draft.version,value});items=items.map(n=>n.code===saved.code?saved:n);draft=null;status.textContent='Коэффициент сохранён. Для существующего проекта пересчитайте смету.';});};
}
async function run(action){if(busy)return;busy=true;error.textContent='';render();try{await action();}catch(e){conflict=e.status===409;error.textContent=conflict?'Коэффициент изменён в другом сеансе. Ваш ввод сохранён. Сверьте его с текущей версией.':e.message||'Ошибка сети. Ввод сохранён.';}finally{busy=false;render();}}
reload.onclick=()=>{if(draft&&!confirm('Закрыть несохранённую форму?'))return;draft=null;conflict=false;void run(async()=>{items=await request();loaded=true;});};
void run(async()=>{items=await request();loaded=true;});
