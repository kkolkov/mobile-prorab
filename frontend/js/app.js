import {projectCard,bindProjectCards} from './project-card.js';
import {estimateDetails} from './estimate-details.js';
import {formatDays,durationRange,projectsSubtitle} from './display.js';
import {deleteProject} from './delete-project.js';
import {renameProject} from './rename-project.js';
import {questionnaireHtml,bindQuestionnaire} from './onboarding/form.js';
import {emptyAnswers,questionnaireVersion} from './onboarding/questions.js';
let newProjectAnswers=emptyAnswers();
import {updateNameArea} from './project-name.js';
import {api,request} from './api.js';import {state,setProject,localName} from './state.js';import {validArea} from './validation.js';
import {renderScreen} from './router.js';
const app=document.querySelector('#app');
const current={no_finish:['Без отделки','Только несущие стены и перекрытия. Отсутствуют перегородки, стяжка, штукатурка и все коммуникации.'],white_box:['Предчистовая / White box','Выполнены черновые работы: стены оштукатурены, полы имеют стяжку, проведены электрика и трубы.'],old_finish:['Старая отделка','Вторичное жилье с устаревшим ремонтом. Требуется демонтаж.'],lived_in:['Жилая квартира с ремонтом','Квартира пригодна для проживания, требуется обновление ремонта.']};
const target={finish_only:['Чистовая отделка','Выполнены все финишные работы: стены, полы, потолки, установлены двери. Сантехника и мебель отсутствуют.'],move_in_ready:['Готовая к проживанию','Выполнена чистовая отделка, установлена кухня, сантехника и базовое оборудование.'],fully_furnished:['Полностью обустроенная','Готовая квартира с основной мебелью.']};
const finish={budget:['Бюджетный','Базовая отделка. Практичные и износостойкие материалы (эконом-сегмент, российские или бюджетные бренды).'],comfort:['Комфорт','Средний сегмент. Качественные материалы с хорошим дизайном (популярные европейские или премиальные российские бренды).'],business:['Бизнес','Премиум-сегмент. Эксклюзивные материалы, дизайнерская сантехника, натуральные или высокотехнологичные покрытия.']};
function layout(step,title,body,primary='Продолжить',disabled=false,back=false){return `<div class="top"><a class="brand" href="/" aria-label="Мобильный прораб — Мои проекты">Мобильный прораб</a><span class="step">${step<=5?`Шаг ${step} из 5`:''}</span></div>${step<=5?`<div class="progress"><i style="width:${step*20}%"></i></div>`:''}<h1>${title}</h1>${body}<div class="actions">${back?'<button class="secondary" id="back">Назад</button>':''}<button class="primary" id="primary" ${disabled||state.loading?'disabled':''}>${state.loading?'Сохранение…':primary}</button></div>`}
function cards(items,key){return `<div class="grid">${Object.entries(items).filter(([v])=>key!=='targetState'||v!=='fully_furnished').map(([v,x])=>`<button class="card ${String(state.local[key])===v?'selected':''}" aria-pressed="${String(state.local[key])===v}"${key==='targetState'&&v==='fully_furnished'?' disabled':''} data-key="${key}" data-value="${v}"><b>${x[0]}</b><span>${x[1]}</span></button>`).join('')}</div>`}
function bindCards(){document.querySelectorAll('.card').forEach(b=>b.onclick=()=>{state.local[b.dataset.key]=b.dataset.key==='redevelopment'?b.dataset.value==='true':b.dataset.value;render()})}
async function saveStep(n,body){if(state.loading)return;state.loading=true;state.error='';render();try{const p=await api.step(state.projectId,n,{...body,version:state.project.version});setProject(p);state.loading=false;state.step=n<5?n+1:6;state.local={...state.local,...p};render()}catch(e){state.error=e.message;state.loading=false;render()}}
export function render(){if(window.history&&state.projectId)window.history.replaceState(null,'',`#project=${state.projectId}`);if(state.step===1)return cp1();if(state.step===2)return cp2();if(state.step===3)return cp3();if(state.step===4)return cp4();if(state.step===5)return cp5();if(state.step===6)return cp6();db01()}
function cp1(){const p=state.local;renderScreen(app,layout(1,'Об объекте',`<p>Минимальные данные для идентификации проекта и первичной оценки.</p><div class="field"><label for="area">Площадь квартиры, м²</label><input id="area" inputmode="decimal" value="${p.areaM2??''}" placeholder="Например, 68.5"><small>От 5 до 9999 м², не более одного знака после запятой.</small><div id="areaError" class="error">${state.error}</div></div><div class="field"><label for="name">Название проекта <span class="muted">необязательно</span></label><input id="name" maxlength="100" value="${escapeText(p.nameSource==='user'?p.name:'')}" placeholder="Автоматически сформируется"></div>`,`Продолжить`,!validArea(p.areaM2||''),!state.projectId));if(!state.projectId)document.querySelector('#back').onclick=showNewQuestionnaire;const area=document.querySelector('#area'),name=document.querySelector('#name');area.oninput=()=>{state.local.areaM2=area.value;if(state.local.nameSource!=='user'||!name.value){name.value=localName(area.value);state.local.name='';state.local.nameSource='auto'}else{name.value=updateNameArea(name.value,area.value);state.local.name=name.value}document.querySelector('#primary').disabled=!validArea(area.value)};name.oninput=()=>{state.local.name=name.value;state.local.nameSource=name.value?'user':'auto'};document.querySelector('#primary').onclick=()=>saveDraft();}
async function saveDraft(){if(state.loading)return;state.error='';const area=String(state.local.areaM2).replace(',','.');state.loading=true;render();try{const body={areaM2:Number(area),name:state.local.nameSource==='user'?state.local.name:''};const p=state.projectId?await api.step(state.projectId,1,{...body,version:state.project.version}):await api.createDraft({...body,questionnaire:{...newProjectAnswers,questionnaireVersion}});setProject(p);if(window.history)window.history.replaceState(null,'',`#project=${p.projectId}`);state.loading=false;state.step=2;state.local={...state.local,...p};render()}catch(e){state.error=e.message;state.loading=false;render()}}
function cp2(){renderScreen(app,layout(2,'Текущее состояние квартиры',`<p>Определите исходное состояние объекта.</p>${cards(current,'currentState')}<div class="error">${state.error}</div>`,'Продолжить',!state.local.currentState,true));bindCards();document.querySelector('#back').onclick=()=>{state.step=1;render()};document.querySelector('#primary').onclick=()=>saveStep(2,{currentState:state.local.currentState})}
function cp3(){renderScreen(app,layout(3,'Желаемый результат ремонта',`<p>До какого состояния хотите довести объект?</p>${cards(target,'targetState')}`,'Продолжить',!state.local.targetState,true));bindCards();document.querySelector('#back').onclick=()=>{state.step=2;render()};document.querySelector('#primary').onclick=()=>saveStep(3,{targetState:state.local.targetState})}
function cp4(){state.local.redevelopment??=false;const bothZero=state.local.roomsCount===0&&state.local.bathroomsCount===0;renderScreen(app,layout(4,'Параметры квартиры',`<div class="field"><label>Количество комнат</label><div class="stepper"><button data-minus="k">−</button><strong id="k">${state.local.roomsCount??1}</strong><button data-plus="k">+</button></div></div><div class="field"><label>Количество санузлов</label><div class="stepper"><button data-minus="b">−</button><strong id="b">${state.local.bathroomsCount??1}</strong><button data-plus="b">+</button></div></div>${bothZero?`<label class="check"><input id="other-rooms" type="checkbox" ${state.local.otherRoomsRepair?'checked':''}> Ремонт будет в других помещениях?</label>`:''}<div class="error">${escapeText(state.error)}</div><div class="field"><label>Перепланировка</label>${cards({true:['Да','Демонтаж или возведение перегородок.'],false:['Нет','Без планируемой перепланировки.']},'redevelopment')}</div>`,'Продолжить',bothZero&&!state.local.otherRoomsRepair,true));if(bothZero)document.querySelector('#other-rooms').onchange=e=>{state.local.otherRoomsRepair=e.target.checked;render();};document.querySelectorAll('[data-minus],[data-plus]').forEach(b=>b.onclick=()=>{const k=b.dataset.minus||b.dataset.plus;const prop=k==='k'?'roomsCount':'bathroomsCount';state.local[prop]=Math.min(20,Math.max(0,(state.local[prop]??1)+(b.dataset.plus?1:-1)));render()});bindCards();document.querySelector('#back').onclick=()=>{state.step=3;render()};document.querySelector('#primary').onclick=()=>saveStep(4,{roomsCount:state.local.roomsCount??1,bathroomsCount:state.local.bathroomsCount??1,otherRoomsRepair:!!state.local.otherRoomsRepair,redevelopment:state.local.redevelopment==='true'||state.local.redevelopment===true})}
function cp5(){renderScreen(app,layout(5,'Уровень ремонта',`<p>Влияет на класс материалов и итоговую смету. Перечень работ остается неизменным.</p>${cards(finish,'finishLevel')}<p class="muted">Уровень ремонта можно изменить позже.</p><div class="error">${state.error}</div>`,'Получить оценку',!state.local.finishLevel,true));bindCards();document.querySelector('#back').onclick=()=>{state.step=4;render()};document.querySelector('#primary').onclick=async()=>{state.loading=true;state.error='';render();try{const e=await api.saveStepAndEstimate(state.projectId,{finishLevel:state.local.finishLevel,version:state.project.version});setProject(e);state.step=6;state.local={...state.local,...e};state.loading=false;render()}catch(e){state.error=e.message;state.loading=false;render()}} }
async function cp6(){
 const p=state.project,failed=p.estimateStatus==='failed';
 const budget=p.budgetMinRub==null||p.budgetMaxRub==null?'Пока не рассчитан':`${money(p.budgetMinRub)} — ${money(p.budgetMaxRub)} ₽`;
 renderScreen(app,layout(6,'Предварительная оценка',`
 ${failed?'<div class="notice">Проект создан. Сейчас не удалось рассчитать стоимость и срок. Проверьте площади и состав помещений в уточнении или повторите расчёт. Если ранее была оценка, ниже сохранены её значения.</div>':''}
 <div class="summary estimate-overview"><div><span class="muted">Проект</span><div class="big">${escapeText(p.name)}</div></div>
 <p class="notice estimate-parameters">Площадь ${p.areaM2} м² · комнаты ${p.roomsCount??'—'} · санузлы ${p.bathroomsCount}</p>
 <div><span class="muted">Бюджет</span><div class="big">${budget}</div></div>
 <div><span class="muted">Срок</span><div class="big">${durationRange(p.durationMinDays,p.durationMaxDays)}</div></div></div>
 ${estimateDetails(p.estimateDetails,{compact:true})}
 ${failed?`<button class="secondary" id="fix-parameters">Исправить параметры</button><button class="secondary" id="retry-estimate" ${state.loading?'disabled':''}>Повторить расчёт</button>`:''}
 <button class="secondary" id="refine">Уточнить параметры проекта</button>
 <div class="error" role="alert">${escapeText(state.error)}</div>`,'Перейти в проект',false,false));
 const actions=document.querySelector('#primary').parentElement;actions.classList.add('estimate-actions');actions.append(document.querySelector('#refine'));
 const deleteButton=document.createElement('button');deleteButton.className='secondary';deleteButton.textContent='Удалить проект';document.querySelector('#primary').parentElement.after(deleteButton);deleteButton.onclick=()=>deleteProject(p,async()=>{state.project=null;state.projectId=null;state.local={};history.replaceState(null,'',location.pathname);await home();});
 document.querySelector('#refine').onclick=goRefinement;
 if(failed)document.querySelector('#fix-parameters').onclick=()=>{state.step=4;state.local={...state.project};state.error='';render();};
 if(failed)document.querySelector('#retry-estimate').onclick=async()=>{
  if(state.loading)return;state.loading=true;state.error='';render();
  try{setProject(await api.estimate(state.projectId,state.project.version));if(state.project.estimateStatus==='failed')state.error='Повторный расчёт не выполнен. Проверьте площадь и количество помещений: выбранный состав может не помещаться в указанную площадь. Нажмите «Исправить параметры» или «Уточнить параметры проекта».';}catch(e){state.error=e.message;}
  finally{state.loading=false;render();}
 };
 document.querySelector('#primary').onclick=async()=>{try{setProject(await api.activate(state.projectId,state.project.version));state.loading=false;state.step=7;render();}catch(e){state.error=e.message;render();}};
}
function money(n){return Number(n||0).toLocaleString('ru-RU')}
function escapeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function goRefinement(){
  try {if(state.project.status==='draft'){setProject(await api.activate(state.projectId,state.project.version));}const {openRefinement}=await import('./refinement/app.js?v=20261008-2');await openRefinement(app,state.project,p=>{setProject(p);state.step=7;render();});}
  catch(e){state.error='Не удалось открыть уточнение: '+e.message;db01();}
}
function db01(){
 const p=state.project;
 renderScreen(app,`<div class="top"><a class="brand" href="/" aria-label="Мобильный прораб — Мои проекты">Мобильный прораб</a><span class="step">Проект</span></div><h1>${escapeText(p.name)}</h1>
 ${p.estimateStatus==='stale'?'<div class="notice">Активная смета рассчитана по прежним параметрам. Уточнённая смета применяется отдельно.</div>':''}
 <div class="summary"><div><span class="muted">Бюджет</span><div class="big" id="project-budget">Загружаем…</div><small class="muted" id="project-budget-range"></small></div>
 <div><span class="muted">Срок</span><div class="big" id="project-duration">Загружаем…</div><small class="muted" id="project-duration-range"></small></div></div>
 <div class="project-planning"><div><span class="muted">Статус</span><div class="project-status-row"><h2 id="project-status">Планирование</h2><button type="button" id="status-info" class="status-info" aria-label="О статусе проекта" aria-haspopup="dialog">ⓘ</button></div><dialog id="status-popup" aria-labelledby="status-popup-title"><h2 id="status-popup-title">О статусе проекта</h2><p>Статус изменится на "В работе" автоматически, как только в графике работ наступит дата начала. Вы можете указать ее в разделе "График работ"</p><button class="primary" id="status-popup-close">Понятно</button></dialog></div><button class="primary" id="refine">Уточнить параметры проекта</button></div>
 ${estimateDetails(state.project.estimateDetails,{compact:true})}<h2>Инструменты проекта</h2><div class="grid"><button class="card" id="schedule"><b>График работ</b><span>Этапы, даты и прогресс ремонта</span></button><button class="card" id="finance"><b>Финансовый трекер</b><span>План, расходы и остаток бюджета</span></button></div><div class="error" role="alert">${escapeText(state.error)}</div>`);
 document.querySelector('#refine').onclick=goRefinement;
 document.querySelector('#schedule').onclick=()=>goExecution('schedule');
 document.querySelector('#finance').onclick=()=>goExecution('finance');
 const statusNode=document.querySelector('#project-status'),info=document.querySelector('#status-info');
 const popup=document.querySelector('#status-popup');
 info.onclick=()=>popup.showModal();
 document.querySelector('#status-popup-close').onclick=()=>popup.close();
 popup.onclick=e=>{if(e.target===popup){const r=popup.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)popup.close();}};
 request('/projects/'+p.projectId+'/execution').then(snapshot=>{
  if(!statusNode.isConnected)return;
  const budget=snapshot.data.budget;
  document.querySelector('#project-budget').textContent=snapshot.planBudget==null?'Пока не рассчитан':money(snapshot.planBudget)+' ₽';
  document.querySelector('#project-budget-range').textContent=budget?.total?.min!=null&&snapshot.budgetWithReserve!=null?`От ${money(budget.total.min)} до ${money(snapshot.budgetWithReserve)} ₽ с резервом`:'';
  document.querySelector('#project-duration').textContent=snapshot.totalDays>0?formatDays(snapshot.totalDays):'График пока не задан';
  document.querySelector('#project-duration-range').textContent=budget?.durationMinDays!=null&&budget?.durationMaxDays!=null?`По смете: от ${formatDays(budget.durationMinDays)} до ${formatDays(budget.durationMaxDays)} с запасом`:'';
  const start=snapshot.data.startDate,now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const inWork=!!start&&start<=today&&snapshot.progressPercent<100;
  statusNode.textContent=snapshot.progressPercent===100?'Все этапы завершены':inWork?'В работе':'Планирование';info.hidden=inWork;
 }).catch(()=>{if(statusNode.isConnected){statusNode.textContent='Статус недоступен';document.querySelector('#project-budget').textContent='Не удалось загрузить';document.querySelector('#project-duration').textContent='Не удалось загрузить';}});
}
async function goExecution(tab){const {openExecution}=await import('./execution/app.js');await openExecution(app,state.project,()=>void start(),tab);}
export async function start(){
 const route=new URLSearchParams(window.location?.hash?.slice(1)||'');
 const id=route.get('project');
 if(!id){await home();return;}
 try {const p=await api.get(id);setProject(p);state.step=p.status==='active'?7:Math.min(p.completedStep+1,6);render();if(route.has('refinement'))await goRefinement();else if(route.has('tool'))await goExecution(route.get('tool')); }
 catch(e){state.error='Не удалось открыть проект. '+e.message;render();}
}

async function home(){
 const projects=await api.list();
 renderScreen(app,`<div class="top"><a class="brand" href="/" aria-label="Мобильный прораб — Мои проекты">Мобильный прораб</a></div><div class="projects-heading"><h1>Мои проекты</h1><p>${projectsSubtitle(projects)}</p><button class="primary" id="create-project">Создать проект</button></div><div class="grid project-grid">${projects.map(projectCard).join('')}</div>${!projects.length?'<div class="empty-state"><p>Здесь появятся ваши проекты.</p></div>':''}`);
 bindProjectCards(app);
 app.querySelector('#create-project').onclick=()=>{state.project=null;state.projectId=null;state.local={};state.step=1;state.loading=false;state.error='';newProjectAnswers=emptyAnswers();showNewQuestionnaire();};
 app.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>deleteProject(projects.find(p=>p.projectId===button.dataset.delete),home));
 app.querySelectorAll('[data-rename]').forEach(button=>button.onclick=()=>renameProject(app,projects.find(p=>p.projectId===button.dataset.rename),home));
 app.querySelectorAll('[data-project]').forEach(button=>button.onclick=()=>{window.location.hash=`project=${button.dataset.project}`;void start();});
}

function showNewQuestionnaire(){
 renderScreen(app,questionnaireHtml(newProjectAnswers));
 bindQuestionnaire(app,{answers:newProjectAnswers,onChange:value=>{newProjectAnswers=value;showNewQuestionnaire();},onContinue:()=>{state.step=1;render();},onBack:()=>void home()});
}
