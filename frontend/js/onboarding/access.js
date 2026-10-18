import {api} from '../api.js';
import {questionnaireHtml,bindQuestionnaire} from './form.js';
import {emptyAnswers,questionnaireVersion} from './questions.js';
const drafts=new Map();
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function offerHtml(access,busy=false,error='') {
  const trial=access.trialEligible,active=access.fullAccess;
  const title=active?'Полная версия активна':trial?'Попробуйте полную версию бесплатно':'Полная версия приложения';
  const text=active?(access.freemiumEndsAt?`Пробный доступ до ${new Date(access.freemiumEndsAt).toLocaleString('ru-RU')}.`:'Подписка подключена.'):
    trial?'Откройте все возможности приложения на 7 дней. Отсчёт начнётся после нажатия кнопки.':
    access.freemiumStartedAt?'Пробный период завершён. Вы можете продолжить работу с калькулятором или вернуться к полной версии после подключения подписки.':
    'Калькулятор и оценка ремонта доступны бесплатно. Полная версия открывает дополнительные инструменты проекта.';
  return `<h1>${title}</h1><p>${text}</p>${active?'':trial?'<div class="notice">Бесплатно на 7 дней. Автоматического списания денег нет.</div>':'<div class="notice">Оформление подписки пока недоступно. Цена и условия появятся здесь перед оплатой.</div>'}
    <div class="error" role="alert">${escape(error)}</div><div class="actions">
    ${!active?`<button id="access-primary" class="primary" ${busy||!trial?'disabled':''}>${busy?'Сохранение…':trial?'Начать 7 дней бесплатно':'Оформить подписку'}</button>`:''}
    <button id="access-leave" class="secondary" ${busy?'disabled':''}>${active?'Продолжить':trial?'Позже':'Продолжить с калькулятором'}</button></div>`;
}
export async function openAccess(app,{onContinue,onBack,questionnaire=true,allowLegacy=false}) {
  let access,busy=false,error='';
  const render=()=>{
    if(!access){app.innerHTML=`<div class="shell"><h1>Доступ к приложению</h1><p>${escape(error||'Загрузка…')}</p><button id="retry" class="primary">Повторить</button><button id="exit" class="secondary">Назад</button></div>`;app.querySelector('#retry').onclick=load;app.querySelector('#exit').onclick=onBack;return;}
    if(questionnaire&&access.questionnaireRequired){
      const answers=drafts.get(access.firstProjectId)??emptyAnswers();
      app.innerHTML=`<div class="shell">${questionnaireHtml(answers,busy)}</div>`;
      bindQuestionnaire(app,{answers,busy,error,onBack,onChange:value=>{drafts.set(access.firstProjectId,value);render();},
        onContinue:()=>run(()=>api.accessAction('answers',{...answers,questionnaireVersion}))});
    }else{
      app.innerHTML=`<div class="shell">${offerHtml(access,busy,error)}</div>`;
      const primary=app.querySelector('#access-primary');if(primary)primary.onclick=()=>run(()=>api.accessAction('trial'));
      app.querySelector('#access-leave').onclick=()=>{if(!busy)onContinue();};
    }
  };
  async function run(operation){if(busy)return;busy=true;error='';render();try{const wasRequired=access.questionnaireRequired;access=await operation();if(wasRequired&&!access.questionnaireRequired)void api.accessAction('offer').catch(()=>{});}catch(e){error=e.message;}finally{busy=false;render();}}
  async function load(){error='';render();try{access=await api.access();if(allowLegacy&&!access.questionnaireRequired&&access.offerShown){onContinue();return;}if(questionnaire&&access.questionnaireRequired)access=await api.accessAction('view');else void api.accessAction('offer').catch(()=>{});}catch(e){if(e.status===404&&allowLegacy){onContinue();return;}error=e.message;}render();}
  await load();
}
