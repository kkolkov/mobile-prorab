import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { api } from '../core/api';
import { ApiError } from '../core/http';
import { readSession,saveSession,subscribeExpiry,type AuthSession } from '../core/auth-storage';
import { resetSession } from '../core/session';
import { questionnaireDrafts } from '../onboarding/access';
interface AuthContextValue {user:AuthSession|null;ready:boolean;error:string;retry:()=>void;signIn:(login:string,password:string,register:boolean)=>Promise<void>;signOut:()=>Promise<void>}
const Context=createContext<AuthContextValue|null>(null);
function clearDrafts(){resetSession();questionnaireDrafts.clear();}
export function AuthProvider({children}:PropsWithChildren){
 const [user,setUser]=useState<AuthSession|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>subscribeExpiry(()=>{clearDrafts();setUser(null);setReady(true);}),[]);
 useEffect(()=>{let alive=true;
  readSession().then(async stored=>{if(stored){await api.me();if(alive)setUser(stored);}}).catch(async e=>{
   if(e instanceof ApiError&&e.status===401){await saveSession(null);if(alive)setUser(null);}else if(alive)setError((e as Error).message);
  }).finally(()=>{if(alive)setReady(true);});return ()=>{alive=false;};
 },[retry]);
 async function signIn(login:string,password:string,register:boolean){const value=await api.login(login,password,register);await saveSession(value);clearDrafts();setUser(value);}
 async function signOut(){try{await api.logout();}catch(e){if(!(e instanceof ApiError)||e.status!==401)throw e;}await saveSession(null);clearDrafts();setUser(null);}
 return <Context.Provider value={{user,ready,error,retry:()=>{setReady(false);setError('');setRetry(n=>n+1);},signIn,signOut}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider missing');return value;}
