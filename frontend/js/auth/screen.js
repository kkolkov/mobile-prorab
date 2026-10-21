import {api} from '../api.js';
import {saveSession} from './storage.js';
export function showAuth(root,onSuccess){
 let register=false,busy=false,login='',password='',error='',consent=false;
 const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){
  root.innerHTML=`<div class="shell auth-shell"><div class="brand">Мобильный прораб</div><h1>${register?'Создать аккаунт':'Вход'}</h1><p>${register?'Сохраните ваши проекты и продолжайте ремонт на любом устройстве.':'Войдите, чтобы продолжить работу над вашим ремонтом.'}</p>
   <form id="auth-form"><div class="field"><label for="login">Логин</label><input id="login" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="40" value="${esc(login)}" placeholder="Например, prorab" ${busy?'disabled':''}></div>
   <div class="field"><label for="password">Пароль</label><input id="password" name="password" type="password" autocomplete="${register?'new-password':'current-password'}" maxlength="128" value="${esc(password)}" placeholder="Не менее 8 символов" ${busy?'disabled':''}></div>
   ${register?'<p class="muted">Логин: 3–40 символов — латиница, цифры, точка, дефис или подчёркивание.</p>':''}
   ${register?`<div class="field"><label style="display:flex;align-items:center;gap:12px"><input id="privacy-consent" type="checkbox" style="width:22px;height:22px" ${consent?'checked':''} ${busy?'disabled':''}>Я согласен на обработку персональных данных</label><a href="#privacy" id="privacy-link">Политика обработки персональных данных</a></div>`:''}
   <div class="error" role="alert">${esc(error)}</div><button class="primary" id="auth-submit" type="submit" ${busy||!valid()?'disabled':''}>${busy?'Подождите…':register?'Создать аккаунт':'Войти'}</button></form>
   <button class="secondary" id="auth-toggle" ${busy?'disabled':''}>${register?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться'}</button></div>`;
  root.querySelector('#login').oninput=e=>{login=e.target.value;validate();};root.querySelector('#password').oninput=e=>{password=e.target.value;validate();};
  root.querySelector('#auth-toggle').onclick=()=>{register=!register;consent=false;error='';render();};
  if(register){root.querySelector('#privacy-consent').onchange=e=>{consent=e.target.checked;validate();};root.querySelector('#privacy-link').onclick=e=>{e.preventDefault();if(!busy)showPolicy();};}
  root.querySelector('#auth-form').onsubmit=async e=>{e.preventDefault();if(busy||!valid())return;busy=true;error='';render();
   try{const result=await api.login({login:login.trim(),password,...(register?{privacyAccepted:consent}:{})},register);saveSession(result);password='';await onSuccess();}
   catch(e){error=e.message;busy=false;render();}
  };
 }
 function showPolicy(){
  root.innerHTML='<div class="shell auth-shell"><div class="brand">Мобильный прораб</div><h1>Политика обработки персональных данных</h1><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p><button class="secondary" id="privacy-back">Назад</button></div>';
  root.querySelector('#privacy-back').onclick=render;
 }
 function valid(){return (!register||consent)&&/^[a-zA-Z0-9._-]{3,40}$/.test(login.trim())&&password.length>=8&&password.length<=128;}
 function validate(){root.querySelector('#auth-submit').disabled=busy||!valid();}
 render();
}
