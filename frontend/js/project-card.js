import {projectAppearance,projectCardDetails} from './display.js';
import {esc} from './refinement/forms.js';
export function projectCard(project){
 const appearance=projectAppearance(project),details=projectCardDetails(project),progress=details.progress;
 const id=esc(project.projectId),name=esc(project.name),noBudget=project.budgetMinRub==null||project.budgetMaxRub==null;
 return `<div class="project-tile" data-tone="${appearance.tone}"><div class="card"><b>${name}</b><span class="project-badge">${appearance.label}</span><span class="project-budget${noBudget?' project-budget-empty':''}">${details.budget}</span></div>
 <div class="project-progress${progress?'':' project-progress-placeholder'}" ${progress?'':'aria-hidden="true"'}><div><span>${progress?.label??'Этапы завершены'}</span><b>${progress?.percent??0}%</b></div><progress max="100" value="${progress?.percent??0}" aria-label="${progress?.aria??'Выполнение этапов ремонта'}"></progress></div>
 <small class="project-updated">${details.updated??'&nbsp;'}</small>
 <div class="project-card-actions"><button class="primary project-open" data-project="${id}" aria-label="${project.status==='draft'?'Продолжить':'Открыть'}: ${name}">${project.status==='draft'?'Продолжить':'Открыть'}</button><button class="secondary project-more" aria-label="Действия: ${name}" aria-expanded="false" aria-controls="project-menu-${id}">⋯</button></div>
 <div class="project-menu" id="project-menu-${id}" hidden><button data-rename="${id}" aria-label="Переименовать: ${name}">Переименовать</button><button data-delete="${id}" aria-label="Удалить: ${name}">Удалить</button></div></div>`;
}
function closeMenus(except){
 document.querySelectorAll('.project-more[aria-expanded="true"]').forEach(button=>{
  if(button===except)return;
  button.setAttribute('aria-expanded','false');
  document.getElementById(button.getAttribute('aria-controls'))?.setAttribute('hidden','');
 });
}
export function bindProjectCards(root){
 root.querySelectorAll('.project-more').forEach(button=>button.onclick=()=>{
  const open=button.getAttribute('aria-expanded')!=='true';closeMenus();
  button.setAttribute('aria-expanded',String(open));
  const menu=document.getElementById(button.getAttribute('aria-controls'));menu.hidden=!open;
  if(open)menu.querySelector('button').focus();
 });
}
if(typeof document!=='undefined'&&document.addEventListener){
 document.addEventListener('click',event=>{if(!event.target.closest('.project-more,.project-menu'))closeMenus();else if(event.target.closest('.project-menu button'))closeMenus();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){const button=document.querySelector('.project-more[aria-expanded="true"]');if(button){closeMenus();button.focus();event.preventDefault();}}});
}
