import {api} from '../api.js';
export function showPasswordChange(){
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','password-title');
 dialog.innerHTML='<h2 id="password-title">Изменить пароль</h2><form><div class="field"><label for="new-password">Новый пароль</label><input id="new-password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required aria-describedby="new-password-help"><small id="new-password-help">От 8 до 128 символов.</small></div><p class="error" role="alert"></p><p role="status"></p><div class="actions"><button class="primary" type="submit" disabled>Сохранить</button><button class="secondary" type="button">Отмена</button></div></form>';
 const field=dialog.querySelector('input'),save=dialog.querySelector('[type=submit]'),cancel=dialog.querySelector('[type=button]'),error=dialog.querySelector('[role=alert]'),status=dialog.querySelector('[role=status]');let busy=false,done=false;
 const valid=()=>field.value.trim().length>0&&field.value.length>=8&&field.value.length<=128;
 const close=()=>{if(!busy)dialog.close();};cancel.onclick=close;
 dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>{field.value='';dialog.remove();document.querySelector('#account-toggle')?.focus();};
 field.oninput=()=>{save.disabled=busy||!valid();};
 dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy||done||!valid())return;busy=true;save.disabled=true;cancel.disabled=true;field.disabled=true;error.textContent='';
  try{await api.changePassword(field.value);field.value='';done=true;status.textContent='Пароль изменён. На других устройствах потребуется войти заново.';save.hidden=true;field.closest('.field').hidden=true;cancel.textContent='Закрыть';}
  catch(e){error.textContent=e.status===401?'Сеанс завершён. Войдите в аккаунт заново.':e.message||'Не удалось сохранить пароль. Повторите попытку.';}
  finally{busy=false;cancel.disabled=false;field.disabled=false;save.disabled=!valid();}
 };
 document.body.append(dialog);dialog.showModal();field.focus();
}
