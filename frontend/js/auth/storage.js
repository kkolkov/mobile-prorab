const key='prorab.auth.v1';
export function session(){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
export function saveSession(value){localStorage.setItem(key,JSON.stringify(value));}
export function clearSession(){localStorage.removeItem(key);}
export function authHeaders(){const token=session()?.token;return token?{Authorization:`Bearer ${token}`}:{ };}
