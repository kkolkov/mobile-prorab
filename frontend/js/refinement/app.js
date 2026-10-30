import {hasPendingKitchens} from './kitchen-progress.js';
import {estimateDetails} from '../estimate-details.js';
import {authHeaders} from '../auth/storage.js';
import {roomName} from './room-name.js';
import {esc,choices,select,apartmentForm,roomForm,kitchenForm,exteriorForm,parseDraft,fieldValid} from './forms.js?v=20261008-1';

const sections={apartment:['Параметры квартиры','Состояния, уровень ремонта, площадь, высота, отделка и работы'],rooms:['Помещения','Количество комнат, площади и индивидуальная отделка'],kitchen:['Кухня и техника','Гарнитур, материалы и техника к покупке'],exteriors:['Балкон и лоджия','Площадь, остекление, утепление, отделка и электрика']};
const copy=x=>structuredClone(x);
const rub=n=>n==null?'Нет данных':Number(n).toLocaleString('ru-RU')+' ₽';
const amount=x=>Number(String(x??0).replace(',','.'))||0;
const uuid=()=>crypto.randomUUID();
const sessionDrafts=new Map();
export async function openRefinement(app,project,onExit){
 let snapshot,view='menu',busy=false,error='',conflict=false,roomEditor=null,kitchenId=null,timer=null,closed=false;
 if(!sessionDrafts.has(project.projectId))sessionDrafts.set(project.projectId,new Map());
 const drafts=sessionDrafts.get(project.projectId);const base=(window.PRORAB_API_BASE||'http://localhost:8080/api')+'/projects/'+project.projectId+'/refinement';
 history.replaceState(null,'',`#project=${project.projectId}&refinement=1`);
 async function request(path='',body,method='POST'){
  let response;
  try{response=await fetch(base+path,body===undefined?{headers:authHeaders()}:{method,headers:{'Content-Type':'application/json',...authHeaders()},body:JSON.stringify(body)});}
  catch{throw new Error('Не удалось связаться с сервером. Введённые данные сохранены в этой форме.');}
  const data=await response.json();if(!response.ok){const e=new Error(data.message||'Не удалось выполнить запрос');e.status=response.status;throw e;}return data;
 }
 const emit=(name,section)=>window.dispatchEvent(new CustomEvent('prorab:analytics',{detail:{name,project_id:project.projectId,section}}));
 const draft=()=>drafts.get(view);
 function open(key){if(busy)return;view=key;error='';conflict=false;if(!drafts.has(key)){
  let data=key==='rooms'?{rooms:copy(snapshot.data.rooms),roomCountManual:snapshot.data.roomCountManual}:copy(snapshot.data[key==='kitchen'?'kitchens':key]);
  if(key==='apartment')data.redevelopment??=snapshot.project.redevelopment??false;
  drafts.set(key,{data,version:snapshot.project.version,confirmedRemovals:[]});
 }if(key==='kitchen')kitchenId=Object.keys(draft().data)[0]??null;emit('refinement_section_opened',key);render();}
 function shell(body){app.innerHTML=`<div class="shell refinement"><div class="top"><a class="brand" href="/" aria-label="Мобильный прораб — Мои проекты">Мобильный прораб</a><button class="secondary" data-action="exit">В проект</button></div><p>${esc(snapshot?.project.name||project.name)}</p>${body}<div role="alert" class="error">${esc(error)}</div>${conflict?'<div class="notice">Данные изменены в другом сеансе. Ваш ввод сохранён в форме.<button data-action="refresh-conflict">Загрузить актуальные данные, сохранив мой ввод</button></div>':''}</div>`;bind();}
 function render(){
  clearTimeout(timer);if(closed)return;
  if(!snapshot){shell('<p>Загружаем проект…</p>');return;}
  if(view==='menu'){
   shell(`<h1>Уточнение параметров проекта</h1><div class="grid">${Object.entries(sections).map(([key,[title,text]])=>`<button class="card" data-open="${key}"><b>${title}</b><span>${text}</span><strong>${snapshot.data.updatedSections?.includes(key)?'Данные указаны и обновлены':snapshot.data.completedSections.includes(key)?'Данные указаны':'Не уточнено'}</strong>${(drafts.has(key)||(key==='kitchen'&&hasPendingKitchens(snapshot.data)))?'<small>Есть несохранённый ввод</small>':''}</button>`).join('')}</div><section class="notice"><p>Чтобы увидеть новую стоимость, запустите пересчет. Текущая смета в проекте останется прежней, пока вы не примените новый результат.</p><p role="status">${esc(snapshot.calculationMessage)}</p>${snapshot.activeEstimateOutdated?'<p>Активная смета рассчитана по прежним параметрам. Она изменится только после применения нового расчёта.</p>':''}${snapshot.calculationStatus==='pending'?'<button class="primary" disabled>Расчёт выполняется…</button>':(snapshot.calculationStatus==='ready'||(snapshot.calculationStatus==='not_requested'&&snapshot.activeEstimate))?'<button data-action="compare" class="primary">Посмотреть расчет</button>':'<button data-action="retry" class="primary">Пересчитать расчет</button>'}</section>`);
   if(snapshot.calculationStatus==='pending')timer=setTimeout(poll,800);return;
  }
  if(view==='compare'){comparison();return;}
  const d=draft();let body='';
  if(view==='apartment')body=apartmentForm(d.data);
  if(view==='rooms')body=roomsForm(d.data);
  if(view==='kitchen'){
   const kitchens=snapshot.data.rooms.filter(r=>r.type==='kitchen');
   body=kitchens.length?select('selectedKitchen','Кухня',kitchenId,Object.fromEntries(kitchens.map(k=>[k.id,k.name])))+`<p>Площадь: ${esc(kitchens.find(k=>k.id===kitchenId)?.areaM2??'не указана')} м² · ${choices.finishLevel[snapshot.project.finishLevel]}</p>`+kitchenForm(d.data[kitchenId],snapshot.project.targetState!=='finish_only'):'<p>Нет кухонь. Добавьте кухню в разделе «Помещения».</p>';
  }
  if(view==='exteriors'){const e=d.data;body=select('repairNeeded','Нужен ремонт?',e.presence==='none'?'no':'yes',{yes:'Да',no:'Нет'});if(e.presence!=='none')body+=select('presence','Что нужно отремонтировать?',e.presence,{balcony:'Балкон',loggia:'Лоджия',both:'Оба'});if(['balcony','both'].includes(e.presence))body+=exteriorForm(e.balcony,'balcony','Балкон');if(['loggia','both'].includes(e.presence))body+=exteriorForm(e.loggia,'loggia','Лоджия');}
  shell(`<h1>${roomEditor?'Карточка помещения':sections[view][0]}</h1><form id="refinement-form">${body}<div class="actions"><button type="button" class="secondary" data-action="back" ${busy?'disabled':''}>Назад</button><button type="submit" class="primary" ${busy?'disabled':''}>${busy?'Сохранение…':roomEditor?'Готово':'Продолжить'}</button></div></form>`);
 }
 function roomsForm(d){
  if(roomEditor)return roomForm(roomEditor);
  const known=d.rooms.reduce((n,r)=>n+amount(r.areaM2),0),total=amount(snapshot.data.apartment.areaM2),remaining=Math.round((total-known)*100)/100;
  return `<div class="notice"><p>Распределено: ${known.toLocaleString('ru-RU')} из ${total} м²</p><p>Не распределено: ${remaining.toLocaleString('ru-RU')} м²</p>${remaining<0?'<p class="error">Сумма площадей превышает площадь квартиры</p>':''}</div><div class="grid">${d.rooms.map(r=>`<div class="room-row"><button type="button" class="card" data-room="${r.id}"><b>${esc(r.name)}</b><span>${r.areaM2==null||r.areaM2===''?'Указать площадь':esc(r.areaM2)+' м²'} →</span></button><button type="button" class="secondary" data-remove="${r.id}" aria-label="Удалить ${esc(r.name)}">Удалить</button></div>`).join('')}</div><button type="button" data-action="add-room" class="secondary">+ Добавить</button>`;
 }
 function empty(r){return r.automatic&&r.areaM2==null&&r.floor==='inherit'&&r.walls==='inherit'&&r.ceiling==='inherit';}
 function removeRoom(id){
  const d=draft(),r=d.data.rooms.find(x=>x.id===id);if(!r)return;
  if((!empty(r)||r.type==='kitchen')&&!confirm(`Удалить «${r.name}»${r.type==='kitchen'?' вместе с оснащением кухни':''}?`))return;
  d.confirmedRemovals.push(id);d.data.rooms=d.data.rooms.filter(x=>x.id!==id);if(r.type==='living')d.data.roomCountManual=true;render();
 }
 function setField(target,path,value){const parts=path.split('.');let node=target;for(const key of parts.slice(0,-1))node=node[key];node[parts.at(-1)]=value;}
 function bind(){
  app.querySelectorAll('[data-info-open]').forEach(button=>button.onclick=()=>app.querySelector('#'+button.dataset.infoOpen).showModal());
  app.querySelectorAll('[data-info-close]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
  app.querySelectorAll('dialog').forEach(dialog=>dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});

  app.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>open(b.dataset.open));
  app.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>{roomEditor=copy(draft().data.rooms.find(r=>r.id===b.dataset.room));render();});
  app.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeRoom(b.dataset.remove));
  app.querySelectorAll('[data-field]').forEach(field=>field.addEventListener(field.tagName==='SELECT'||field.type==='checkbox'?'change':'input',()=>{
   if(busy)return;const key=field.dataset.field;
   if(key==='selectedKitchen'){kitchenId=field.value;render();return;}
   let target=roomEditor??(view==='kitchen'?draft().data[kitchenId]:draft().data);
   if(key==='redevelopment'){target.redevelopment=field.value==='true';return;}
   if(key==='repairNeeded'){target.presence=field.value==='no'?'none':'balcony';render();return;}
   if(key==='stoveEnabled')target.stove=field.checked?'hob':'none';else setField(target,key,field.type==='checkbox'?field.checked:field.value);
   if(field.dataset.number!==undefined)fieldValid(field);
   if(['presence','cabinets','stove','stoveEnabled','type'].includes(key))render();
  }));
  app.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
  const form=app.querySelector('#refinement-form');if(form&&busy)form.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);if(form)form.onsubmit=async event=>{event.preventDefault();if(busy)return;let valid=true;form.querySelectorAll('[data-number]').forEach(el=>{valid=fieldValid(el)&&valid});if(!valid||!form.reportValidity())return;
   if(roomEditor){const d=draft();const before=d.data.rooms.find(r=>r.id===roomEditor.id);if(before?.type==='kitchen'&&roomEditor.type!=='kitchen'){if(!confirm('Смена типа удалит оснащение кухни. Продолжить?'))return;d.confirmedRemovals.push(before.id);}
    if(before?.type!==roomEditor.type&&(before?.type==='living'||roomEditor.type==='living'))d.data.roomCountManual=true;
    const i=d.data.rooms.findIndex(r=>r.id===roomEditor.id);const edited=parseDraft(roomEditor);edited.name=roomName(edited,d.data.rooms,choices.type);if(!before||JSON.stringify({...before,automatic:false})!==JSON.stringify({...edited,automatic:false}))edited.automatic=false;if(i<0){d.data.rooms.push(edited);if(edited.type==='living')d.data.roomCountManual=true;}else d.data.rooms[i]=edited;roomEditor=null;render();return;}
   if(view==='rooms'&&!draft().data.rooms.length){
    const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','empty-rooms-title');
    dialog.innerHTML='<h2 id="empty-rooms-title">Вы не указали ни одного помещения</h2><p>Если вы продолжите, калькулятор автоматически рассчитает базовую планировку (жилые комнаты, кухню, санузел и коридор) по вашей площади. Параметры можно будет добавить позднее.</p><div class="actions"><button type="button" class="secondary" data-cancel>Отмена</button><button type="button" class="primary" data-confirm>Подтвердить и продолжить</button></div>';
    app.append(dialog);dialog.addEventListener('close',()=>dialog.remove());
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('[data-confirm]').onclick=()=>{if(busy)return;dialog.close();void save(true);};dialog.showModal();return;
   }
   await save();
  };
 }
 async function action(name){
  if(busy)return;
  if(name==='exit'){if(busy)return;closed=true;clearTimeout(timer);history.replaceState(null,'',`#project=${project.projectId}`);onExit(snapshot?.project??project);return;}
  if(name==='back'){if(busy)return;error='';conflict=false;if(roomEditor)roomEditor=null;else view='menu';render();return;}
  if(name==='compare'){view='compare';render();return;}
  if(name==='menu'){view='menu';render();return;}
  if(name==='add-room'){roomEditor={id:uuid(),type:'living',name:'',areaM2:null,floor:'inherit',walls:'inherit',ceiling:'inherit',automatic:false};render();return;}
  if(name==='reset-appliances'){for(const key of ['stove','oven','refrigerator','hood','dishwasher'])draft().data[kitchenId][key]=null;render();return;}
  if(name==='refresh-conflict'){
   try{snapshot=await request();draft().version=snapshot.project.version;conflict=false;error='Актуальные данные загружены. В форме оставлен ваш ввод. Нажмите «Продолжить», только если хотите сохранить его вместо серверных значений.';}catch(e){error=e.message;}render();return;
  }
  if(name==='discard'){
   const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','discard-title');
   dialog.innerHTML='<h2 id="discard-title">Отклонить расчет?</h2><p>Все уточненные данные после последнего применения расчета будут удалены. Если они понадобятся, их нужно будет вводить заново. Вы уверены?</p><div class="actions"><button type="button" class="secondary" data-no>Нет</button><button type="button" class="primary" data-yes>Да</button></div>';
   app.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('[data-no]').onclick=()=>dialog.close();
   dialog.querySelector('[data-yes]').onclick=()=>{if(busy)return;dialog.close();void action('discard-confirm');};dialog.showModal();return;
  }
  if(name==='discard-confirm'){
   busy=true;error='';render();
   try{snapshot=await request('/discard',{version:snapshot.project.version});drafts.clear();closed=true;clearTimeout(timer);onExit(snapshot.project);}
   catch(e){error=e.message;conflict=e.status===409;}finally{busy=false;}if(!closed)render();return;
  }
  if(name==='retry'||name==='apply'){
   if(busy)return;busy=true;error='';render();
   try{snapshot=await request(name==='retry'?'/calculate':'/apply',name==='retry'?{version:snapshot.project.version}:{version:snapshot.project.version,estimateId:snapshot.candidateEstimate.id});
    if(name==='apply'){drafts.clear();emit('refinement_estimate_applied');closed=true;onExit(snapshot.project);return;}
    emit('refinement_estimate_requested');
   }catch(e){error=e.message;emit('refinement_'+name+'_failed');if(e.status===409){snapshot=await request();error+=' Актуальная версия загружена. Проверьте расчёт перед повтором.';}}finally{busy=false;}render();
  }
 }
 async function save(generateBaseLayout=false){
  if(busy)return;
  const key=view,d=draft();
  if(key==='kitchen'&&kitchenId&&d.data[kitchenId])d.data[kitchenId].parametersConfirmed=true;
  busy=true;error='';conflict=false;render();
  try{const previousData=JSON.stringify(snapshot.data),previousSections=snapshot.data.completedSections;const result=await request('/'+key,{version:d.version,data:parseDraft(generateBaseLayout?{...d.data,generateBaseLayout:true}:d.data),confirmedRemovals:d.confirmedRemovals},'PUT');snapshot=result;drafts.delete(key);if(JSON.stringify(result.data)!==previousData)emit('refinement_section_saved',key);if(!previousSections.includes(key)&&result.data.completedSections.includes(key))emit('refinement_section_first_saved',key);view='menu';}
  catch(e){error=e.message;conflict=e.status===409;emit('refinement_save_failed',key);}finally{busy=false;}render();
 }
 async function poll(){try{const fresh=await request();if(fresh.project.version>=snapshot.project.version&&fresh.revision>=snapshot.revision)snapshot=fresh;if(snapshot.calculationStatus==='ready')emit('refinement_estimate_received');}catch(e){error=e.message;}if(view==='menu'&&!closed)render();}
 function comparison(){
  const old=snapshot.activeEstimate,next=snapshot.candidateEstimate;
  if(!next){
   if(old&&snapshot.calculationStatus==='not_requested'){shell(`<h1>Текущая смета проекта</h1>${estimateDetails(old,{compact:true})}<button class="secondary" data-action="menu">К разделам</button>`);return;}
   view='menu';render();return;
  }
  function row(label,a,b){const diff=a==null||b==null?null:b-a;return `<tr><th scope="row">${label}</th><td data-label="Было">${rub(a)}</td><td data-label="Стало">${rub(b)}</td><td data-label="Разница">${diff==null?'Нет данных':(diff>0?'+':'')+rub(diff)}</td></tr>`;}
  shell(`<h1>Сравнение сметы</h1><p>Параметры изменились. Ниже указана новая стоимость. Текущая смета останется прежней, пока вы не подтвердите изменения.</p><section class="estimate-summary"><table><thead><tr><th>Показатель</th><th>Было</th><th>Стало</th><th>Разница</th></tr></thead><tbody>${row('Расчетная стоимость',old?.total?.expected,next.total?.expected)}${row('Бюджет с резервом',old?.total?.withReserve,next.total?.withReserve)}</tbody></table></section>${estimateDetails(next,{compact:true})}<div class="actions"><button class="primary" data-action="apply" ${busy?'disabled':''}>Применить расчет</button><button class="secondary" data-action="discard" ${busy?'disabled':''}>Отклонить расчет</button><button class="secondary" data-action="menu" ${busy?'disabled':''}>Уточнить еще</button></div>`);

 }
 try{render();snapshot=await request();emit('refinement_opened');render();}catch(e){error=e.message;shell('<h1>Не удалось открыть уточнение</h1><button data-action="exit">Вернуться в проект</button>');}
}
