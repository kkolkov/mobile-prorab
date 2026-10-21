import {api} from './api.js';
import {esc} from './refinement/forms.js';
export function deleteProject(project,onDeleted){
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Удалить проект');
 dialog.innerHTML=`<h2>Удалить «${esc(project.name)}»?</h2><p>Все детали по проекту будут удалены, вернуть будет невозможно. Вы уверены?</p><p class="error" role="alert"></p><div class="actions"><button class="primary" data-yes>Да</button><button class="secondary" data-no>Нет</button></div>`;
 document.body.append(dialog);dialog.showModal();let busy=false;
 const close=()=>{if(!busy){dialog.close();dialog.remove();}};
 dialog.querySelector('[data-no]').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};
 dialog.querySelector('[data-yes]').onclick=async()=>{if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await api.remove(project.projectId,project.version);busy=false;close();await onDeleted();}
  catch(e){dialog.querySelector('[role=alert]').textContent=e.status===409?'Проект изменился. Закройте окно и обновите список перед удалением.':e.message;}
  finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
 };
}
