import {esc} from '/js/refinement/forms.js';
const base=['localhost','127.0.0.1'].includes(location.hostname)&&location.port==='5500'?'http://localhost:8080/api':'/api';
const root=base+'/porabadmin/time-norms',rows=document.querySelector('#time-rows'),editor=document.querySelector('#time-editor'),error=document.querySelector('#time-error'),status=document.querySelector('#time-status');
let norms=[],draft=null,busy=false,conflict=false;
async function request(path='',body){
 const r=await fetch(root+path,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok){const e=new Error(data.message||'Не удалось сохранить норму');e.status=r.status;throw e;}return data;
}
function render(){
 rows.innerHTML=`<div class="table-scroll"><table><thead><tr><th>Работа</th><th>Чел.-ч / 100 м²</th><th>Раб. дней / 100 м², 2 чел.</th><th></th></tr></thead><tbody>${norms.map(n=>`<tr><td>${esc(n.title)}</td><td>${esc(n.personHoursPer100m2)}</td><td>${(n.personHoursPer100m2/16).toFixed(2)}</td><td><button class="secondary" data-norm="${esc(n.code)}" ${busy?'disabled':''}>Изменить</button></td></tr>`).join('')}</tbody></table></div>`;
 rows.querySelectorAll('[data-norm]').forEach(b=>b.onclick=()=>{if(draft&&!confirm('Закрыть несохранённую форму?'))return;draft={...norms.find(n=>n.code===b.dataset.norm)};conflict=false;error.textContent='';render();editor.scrollIntoView({block:'start',behavior:'smooth'});});
 if(!draft){editor.innerHTML='';return;}
 editor.innerHTML=`<form class="notice"><h2>${esc(draft.title)}</h2><div class="field"><label for="hours">Человеко-часы на 100 м²</label><input id="hours" name="personHoursPer100m2" type="number" min="0.0001" max="99999999" step="0.0001" value="${esc(draft.personHoursPer100m2)}" required></div><div class="field"><label for="norm-source">Источник и состав работы</label><textarea id="norm-source" name="sourceNote" maxlength="4000" required>${esc(draft.sourceNote)}</textarea></div><div class="field"><label for="norm-date">Дата записи / проверки</label><input id="norm-date" name="sourceDate" type="date" value="${esc(draft.sourceDate)}" required></div><div class="actions"><button class="primary" id="norm-save" ${busy||conflict?'disabled':''}>${busy?'Сохранение…':'Сохранить'}</button><button class="secondary" id="norm-cancel" type="button" ${busy?'disabled':''}>Отмена</button>${conflict?'<button class="secondary" type="button" id="norm-refresh">Загрузить версию, сохранив ввод</button>':''}</div></form>`;
 editor.querySelectorAll('input,textarea').forEach(e=>{e.disabled=busy;e.oninput=()=>draft[e.name]=e.value;});
 editor.querySelector('#norm-cancel').onclick=()=>{draft=null;conflict=false;render();};
 const refresh=editor.querySelector('#norm-refresh');if(refresh)refresh.onclick=()=>run(async()=>{norms=await request();const n=norms.find(n=>n.code===draft.code);if(!n)throw new Error('Норма удалена');draft.version=n.version;conflict=false;status.textContent='Версия обновлена; проверьте сохранённый ввод и нажмите «Сохранить».';});
 editor.querySelector('form').onsubmit=e=>{e.preventDefault();if(busy||conflict)return;void run(async()=>{await request('/'+draft.code,{version:draft.version,personHoursPer100m2:Number(draft.personHoursPer100m2),sourceNote:draft.sourceNote,sourceDate:draft.sourceDate});draft=null;norms=await request();status.textContent='Норма сохранена. Для проекта пересчитайте и примените смету. Начатый график сохранится.';});};
}
async function run(action){if(busy)return;busy=true;error.textContent='';render();try{await action();}catch(e){conflict=e.status===409;error.textContent=conflict?'Норма изменена в другом сеансе. Ваш ввод сохранён.':e.message||'Ошибка сети. Ввод сохранён.';}finally{busy=false;render();}}
void run(async()=>{norms=await request();});
