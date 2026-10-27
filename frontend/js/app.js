import {estimateDetails} from './estimate-details.js';
import {durationRange,projectsSubtitle} from './display.js';
import {deleteProject} from './delete-project.js';
import {renameProject} from './rename-project.js';
import {questionnaireHtml,bindQuestionnaire} from './onboarding/form.js';
import {emptyAnswers,questionnaireVersion} from './onboarding/questions.js';
let newProjectAnswers=emptyAnswers();
import {updateNameArea} from './project-name.js';
import {api} from './api.js';import {state,setProject,localName} from './state.js';import {validArea} from './validation.js';
import {renderScreen} from './router.js';
const app=document.querySelector('#app');
const current={no_finish:['Без отделки','Бетонные стены и пол, чистовая отделка отсутствует.'],white_box:['Предчистовая / White box','Основные черновые работы выполнены, чистовой отделки нет.'],old_finish:['Старая отделка','Отделку потребуется полностью или частично демонтировать.'],lived_in:['Жилая квартира с ремонтом','Квартира пригодна для проживания, требуется обновление ремонта.']};
const target={finish_only:['Чистовая отделка','Отделка, двери, электрика и сантехнические выводы готовы.'],move_in_ready:['Готовая к проживанию','Чистовая отделка, готовая кухня и оборудованные санузлы.'],fully_furnished:['Полностью обустроенная','Готовая квартира с основной мебелью.']};
const finish={budget:['Бюджетный','Практичные материалы и оборудование базового сегмента.'],comfort:['Комфорт','Материалы и оборудование среднего сегмента.'],business:['Бизнес','Материалы и решения повышенного ценового сегмента.']};
function layout(step,title,body,primary='Продолжить',disabled=false,back=false){return `<div class="top"><span class="brand">Мобильный прораб</span><span class="step">${step<=5?`Шаг ${step} из 5`:''}</span></div>${step<=5?`<div class="progress"><i style="width:${step*20}%"></i></div>`:''}<h1>${title}</h1>${body}<div class="actions">${back?'<button class="secondary" id="back">Назад</button>':''}<button class="primary" id="primary" ${disabled||state.loading?'disabled':''}>${state.loading?'Сохранение…':primary}</button></div>`}
function cards(items,key){return `<div class="grid">${Object.entries(items).filter(([v])=>key!=='targetState'||v!=='fully_furnished').map(([v,x])=>`<button class="card ${String(state.local[key])===v?'selected':''}" aria-pressed="${String(state.local[key])===v}"${key==='targetState'&&v==='fully_furnished'?' disabled':''} data-key="${key}" data-value="${v}"><b>${x[0]}</b><span>${x[1]}</span></button>`).join('')}</div>`}
function bindCards(){document.querySelectorAll('.card').forEach(b=>b.onclick=()=>{state.local[b.dataset.key]=b.dataset.key==='redevelopment'?b.dataset.value==='true':b.dataset.value;render()})}
async function saveStep(n,body){if(state.loading)return;state.loading=true;state.error='';render();try{const p=await api.step(state.projectId,n,{...body,version:state.project.version});setProject(p);state.loading=false;state.step=n<5?n+1:6;state.local={...state.local,...p};render()}catch(e){state.error=e.message;state.loading=false;render()}}
export function render(){if(window.history&&state.projectId)window.history.replaceState(null,'',`#project=${state.projectId}`);if(state.step===1)return cp1();if(state.step===2)return cp2();if(state.step===3)return cp3();if(state.step===4)return cp4();if(state.step===5)return cp5();if(state.step===6)return cp6();db01()}
function cp1(){const p=state.local;renderScreen(app,layout(1,'Об объекте',`<p>Минимальные данные для идентификации проекта и первичной оценки.</p><div class="field"><label for="area">Площадь квартиры, м²</label><input id="area" inputmode="decimal" value="${p.areaM2??''}" placeholder="Например, 68.5"><small>От 5 до 9999 м², не более одного знака после запятой.</small><div id="areaError" class="error">${state.error}</div></div><div class="field"><label for="name">Название проекта <span class="muted">необязательно</span></label><input id="name" maxlength="100" value="${escapeText(p.nameSource==='user'?p.name:'')}" placeholder="Автоматически сформируется"></div><div class="field"><label for="address">Адрес <span class="muted">необязательно</span></label><input id="address" maxlength="250" value="${escapeText(p.address??'')}"></div>`,`Продолжить`,!validArea(p.areaM2||''),!state.projectId));if(!state.projectId)document.querySelector('#back').onclick=showNewQuestionnaire;const area=document.querySelector('#area'),name=document.querySelector('#name');area.oninput=()=>{state.local.areaM2=area.value;if(state.local.nameSource!=='user'||!name.value){name.value=localName(area.value);state.local.name='';state.local.nameSource='auto'}else{name.value=updateNameArea(name.value,area.value);state.local.name=name.value}document.querySelector('#primary').disabled=!validArea(area.value)};name.oninput=()=>{state.local.name=name.value;state.local.nameSource=name.value?'user':'auto'};document.querySelector('#address').oninput=e=>{state.local.address=e.target.value;};document.querySelector('#primary').onclick=()=>saveDraft();}
async function saveDraft(){if(state.loading)return;state.error='';const area=String(state.local.areaM2).replace(',','.');state.loading=true;render();try{const body={areaM2:Number(area),name:state.local.nameSource==='user'?state.local.name:'',address:state.local.address||''};const p=state.projectId?await api.step(state.projectId,1,{...body,version:state.project.version}):await api.createDraft({...body,questionnaire:{...newProjectAnswers,questionnaireVersion}});setProject(p);if(window.history)window.history.replaceState(null,'',`#project=${p.projectId}`);state.loading=false;state.step=2;state.local={...state.local,...p};render()}catch(e){state.error=e.message;state.loading=false;render()}}
function cp2(){renderScreen(app,layout(2,'Текущее состояние квартиры',`<p>Определите исходное состояние объекта.</p>${cards(current,'currentState')}<div class="error">${state.error}</div>`,'Продолжить',!state.local.currentState,true));bindCards();document.querySelector('#back').onclick=()=>{state.step=1;render()};document.querySelector('#primary').onclick=()=>saveStep(2,{currentState:state.local.currentState})}
function cp3(){renderScreen(app,layout(3,'Желаемый результат ремонта',`<p>До какого состояния хотите довести объект?</p>${cards(target,'targetState')}`,'Продолжить',!state.local.targetState,true));bindCards();document.querySelector('#back').onclick=()=>{state.step=2;render()};document.querySelector('#primary').onclick=()=>saveStep(3,{targetState:state.local.targetState})}
function cp4(){state.local.redevelopment??=false;const bothZero=state.local.roomsCount===0&&state.local.bathroomsCount===0;renderScreen(app,layout(4,'Параметры квартиры',`<div class="field"><label>Количество комнат</label><div class="stepper"><button data-minus="k">−</button><strong id="k">${state.local.roomsCount??1}</strong><button data-plus="k">+</button></div></div><div class="field"><label>Количество санузлов</label><div class="stepper"><button data-minus="b">−</button><strong id="b">${state.local.bathroomsCount??1}</strong><button data-plus="b">+</button></div></div>${bothZero?`<label class="check"><input id="other-rooms" type="checkbox" ${state.local.otherRoomsRepair?'checked':''}> Ремонт будет в других помещениях?</label>`:''}<div class="error">${escapeText(state.error)}</div><div class="field"><label>Перепланировка</label>${cards({true:['Да','Демонтаж или возведение перегородок.'],false:['Нет','Без планируемой перепланировки.']},'redevelopment')}</div>`,'Продолжить',bothZero&&!state.local.otherRoomsRepair,true));if(bothZero)document.querySelector('#other-rooms').onchange=e=>{state.local.otherRoomsRepair=e.target.checked;render();};document.querySelectorAll('[data-minus],[data-plus]').forEach(b=>b.onclick=()=>{const k=b.dataset.minus||b.dataset.plus;const prop=k==='k'?'roomsCount':'bathroomsCount';state.local[prop]=Math.min(20,Math.max(0,(state.local[prop]??1)+(b.dataset.plus?1:-1)));render()});bindCards();document.querySelector('#back').onclick=()=>{state.step=3;render()};document.querySelector('#primary').onclick=()=>saveStep(4,{roomsCount:state.local.roomsCount??1,bathroomsCount:state.local.bathroomsCount??1,otherRoomsRepair:!!state.local.otherRoomsRepair,redevelopment:state.local.redevelopment==='true'||state.local.redevelopment===true})}
function cp5(){renderScreen(app,layout(5,'Уровень ремонта',`<p>Уровень влияет на стоимость, но не определяет перечень работ сам по себе.</p>${cards(finish,'finishLevel')}<p class="muted">Уровень ремонта можно изменить позже.</p><div class="error">${state.error}</div>`,'Получить оценку',!state.local.finishLevel,true));bindCards();document.querySelector('#back').onclick=()=>{state.step=4;render()};document.querySelector('#primary').onclick=async()=>{state.loading=true;state.error='';render();try{const e=await api.saveStepAndEstimate(state.projectId,{finishLevel:state.local.finishLevel,version:state.project.version});setProject(e);state.step=6;state.local={...state.local,...e};state.loading=false;render()}catch(e){state.error=e.message;state.loading=false;render()}} }
async function cp6(){
 const p=state.project,failed=p.estimateStatus==='failed';
 const budget=p.budgetMinRub==null||p.budgetMaxRub==null?'Пока не рассчитан':`${money(p.budgetMinRub)} — ${money(p.budgetMaxRub)} ₽`;
 renderScreen(app,layout(6,'Предварительная оценка',`
 ${failed?'<div class="notice">Проект создан. Сейчас не удалось рассчитать стоимость и срок. Проверьте площади и состав помещений в уточнении или повторите расчёт. Если ранее была оценка, ниже сохранены её значения.</div>':''}
 <div class="summary"><div><span class="muted">Проект</span><div class="big">${escapeText(p.name)}</div></div>
 <div><span class="muted">Бюджет</span><div class="big">${budget}</div></div>
 <div><span class="muted">Срок</span><div class="big">${durationRange(p.durationMinDays,p.durationMaxDays)}</div></div></div>
 <p>Ориентировочная оценка. Цены и допущения — в составе оценки. Срок ориентировочный.</p>${estimateDetails(p.estimateDetails)}
 ${failed?`<button class="secondary" id="fix-parameters">Исправить параметры</button><button class="secondary" id="retry-estimate" ${state.loading?'disabled':''}>Повторить расчёт</button>`:''}
 <button class="secondary" id="refine">Уточнить расчёт</button>
 <div class="notice">Площадь ${p.areaM2} м² · комнаты ${p.roomsCount??'—'} · санузлы ${p.bathroomsCount}</div>
 <div class="error" role="alert">${escapeText(state.error)}</div>`,'Перейти в проект',false,false));
 const deleteButton=document.createElement('button');deleteButton.className='secondary';deleteButton.textContent='Удалить проект';document.querySelector('#primary').parentElement.after(deleteButton);deleteButton.onclick=()=>deleteProject(p,async()=>{state.project=null;state.projectId=null;state.local={};history.replaceState(null,'',location.pathname);await home();});
 document.querySelector('#refine').onclick=goRefinement;
 if(failed)document.querySelector('#fix-parameters').onclick=()=>{state.step=4;state.local={...state.project};state.error='';render();};
 if(failed)document.querySelector('#retry-estimate').onclick=async()=>{
  if(state.loading)return;state.loading=true;state.error='';render();
  try{setProject(await api.estimate(state.projectId,state.project.version));if(state.project.estimateStatus==='failed')state.error='Повторный расчёт не выполнен. Проверьте площадь и количество помещений: выбранный состав может не помещаться в указанную площадь. Нажмите «Исправить параметры» или «Уточнить расчёт».';}catch(e){state.error=e.message;}
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
 renderScreen(app,`<div class="top"><span class="brand">Мобильный прораб</span><span class="step">Проект</span></div><h1>${escapeText(p.name)}</h1>
 <div class="notice">Ориентировочная оценка. Цены и допущения — в составе оценки. Срок ориентировочный.</div>
 ${p.estimateStatus==='stale'?'<div class="notice">Активная смета рассчитана по прежним параметрам. Уточнённая смета применяется отдельно.</div>':''}
 <div class="summary"><div><span class="muted">Бюджет</span><div class="big">${p.budgetMinRub?money(p.budgetMinRub)+' — '+money(p.budgetMaxRub)+' ₽':'Пока не рассчитан'}</div></div>
 <div><span class="muted">Срок</span><div class="big">${durationRange(p.durationMinDays,p.durationMaxDays)}</div></div></div>
 <div class="project-planning"><div><span class="muted">Статус</span><h2>Планирование</h2></div><button class="primary" id="refine">Уточнить параметры проекта</button></div>
 ${estimateDetails(state.project.estimateDetails)}<h2>Инструменты проекта</h2><div class="grid"><button class="card" id="schedule"><b>График работ</b><span>Этапы, даты и прогресс ремонта</span></button><button class="card" id="finance"><b>Финансовый трекер</b><span>План, расходы и остаток бюджета</span></button></div><div class="error" role="alert">${escapeText(state.error)}</div>`);
 document.querySelector('#refine').onclick=goRefinement;
 document.querySelector('#schedule').onclick=()=>goExecution('schedule');
 document.querySelector('#finance').onclick=()=>goExecution('finance');
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
 renderScreen(app,`<div class="top"><span class="brand">Мобильный прораб</span></div><h1>Мои проекты</h1><p>${projectsSubtitle(projects)}</p><button class="primary" id="create-project">Создать проект</button><div class="grid project-grid">${projects.map(p=>`<div class="project-tile"><button class="card" data-project="${p.projectId}"><b>${escapeText(p.name)}</b><span>${p.status==='draft'?'Черновик':'Проект'}</span></button><button class="secondary" data-rename="${p.projectId}" aria-label="Переименовать: ${escapeText(p.name)}">Переименовать</button><button class="secondary" data-delete="${p.projectId}" aria-label="Удалить: ${escapeText(p.name)}">Удалить</button></div>`).join('')}</div>${!projects.length?'<div class="empty-state"><p>Здесь появятся ваши проекты.</p></div>':''}`);
 app.querySelector('#create-project').onclick=()=>{state.project=null;state.projectId=null;state.local={};state.step=1;state.loading=false;state.error='';newProjectAnswers=emptyAnswers();showNewQuestionnaire();};
 app.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>deleteProject(projects.find(p=>p.projectId===button.dataset.delete),home));
 app.querySelectorAll('[data-rename]').forEach(button=>button.onclick=()=>renameProject(app,projects.find(p=>p.projectId===button.dataset.rename),home));
 app.querySelectorAll('[data-project]').forEach(button=>button.onclick=()=>{window.location.hash=`project=${button.dataset.project}`;void start();});
}

function showNewQuestionnaire(){
 renderScreen(app,questionnaireHtml(newProjectAnswers));
 bindQuestionnaire(app,{answers:newProjectAnswers,onChange:value=>{newProjectAnswers=value;showNewQuestionnaire();},onContinue:()=>{state.step=1;render();},onBack:()=>void home()});
}
