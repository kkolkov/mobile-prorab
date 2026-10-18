import {api} from './api.js';
import {session,clearSession} from './auth/storage.js';
import {showAuth} from './auth/screen.js';
const app=document.querySelector('#app'),bar=document.querySelector('#account-bar');
async function open(){
 if(!session()){bar.hidden=true;showAuth(app,open);return;}
 try{
  const me=await api.me();bar.hidden=false;bar.querySelector('#account-login').textContent=me.login;
  bar.querySelector('#account-home').onclick=()=>{location.hash='';location.reload();};
  bar.querySelector('#logout').onclick=async()=>{try{await api.logout();}catch(e){if(e.status!==401){bar.querySelector('#account-error').textContent=e.message;return;}}clearSession();location.hash='';location.reload();};
  const {start}=await import('./app.js');await start();
 }catch(e){
  if(e.status===401){clearSession();bar.hidden=true;showAuth(app,open);}
  else {app.innerHTML='<div class="shell"><h1>Не удалось подключиться</h1><p id="auth-network-error"></p><button id="auth-retry" class="primary">Повторить</button></div>';app.querySelector('#auth-network-error').textContent=e.message;app.querySelector('#auth-retry').onclick=open;}
 }
}
window.addEventListener('prorab:unauthorized',()=>location.reload());
void open();
