import {api} from './api.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renameProject(root,project,onClose){
 let current=project,name=project.name,busy=false,error='',conflict=false;
 const valid=()=>name.trim().length>0&&name.length<=100;
 function render(){
  root.innerHTML=`<div class="shell"><a class="brand" href="/" aria-label="Мобильный прораб — Мои проекты">Мобильный прораб</a><h1>Переименовать проект</h1><form id="rename-form"><div class="field"><label for="rename-name">Название проекта</label><input id="rename-name" maxlength="100" value="${escape(name)}" ${busy?'disabled':''}></div><div class="error" role="alert">${escape(error)}</div>${conflict?'<p>Проект изменён в другом сеансе. Ваше имя сохранено в поле.</p><button type="button" class="secondary" id="rename-refresh">Загрузить актуальную версию</button>':''}<button id="rename-save" class="primary" ${busy||!valid()||conflict?'disabled':''}>${busy?'Сохранение…':'Сохранить'}</button><button id="rename-cancel" type="button" class="secondary" ${busy?'disabled':''}>Отмена</button></form></div>`;
  root.querySelector('#rename-name').oninput=e=>{name=e.target.value;root.querySelector('#rename-save').disabled=busy||!valid()||conflict;};
  root.querySelector('#rename-cancel').onclick=()=>{if(!busy)void onClose();};
  root.querySelector('#rename-form').onsubmit=e=>{e.preventDefault();if(!busy&&valid()&&!conflict)void save();};
  const refresh=root.querySelector('#rename-refresh');if(refresh){refresh.disabled=busy;refresh.onclick=()=>save(true);}
 }
 async function save(refresh=false){
  if(busy)return;busy=true;error='';render();
  try{if(refresh){current=await api.get(current.projectId);conflict=false;error='Версия обновлена. Проверьте имя и нажмите «Сохранить».';}else{await api.rename(current.projectId,name.trim(),current.version);await onClose();return;}}
  catch(e){error=e.message;if(e.status===409)conflict=true;}
  busy=false;render();
 }
 render();
}
