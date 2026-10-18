import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
export interface AuthSession {userId:string;login:string;token:string;expiresAt:string}
const key='prorab.auth.v1';
let current:AuthSession|null|undefined;
let pending:Promise<AuthSession|null>|undefined;
const listeners=new Set<()=>void>();
export function subscribeExpiry(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
export function readSession():Promise<AuthSession|null>{
 if(current!==undefined)return Promise.resolve(current);
 if(!pending)pending=(async()=>{const raw=Platform.OS==='web'?await AsyncStorage.getItem(key):await SecureStore.getItemAsync(key);try{current=raw?JSON.parse(raw):null;}catch{current=null;}return current??null;})().finally(()=>{pending=undefined;});
 return pending;
}
export async function saveSession(value:AuthSession|null){
 if(Platform.OS==='web'){if(value)await AsyncStorage.setItem(key,JSON.stringify(value));else await AsyncStorage.removeItem(key);}
 else {if(value)await SecureStore.setItemAsync(key,JSON.stringify(value));else await SecureStore.deleteItemAsync(key);}
 current=value;
}
export async function authHeaders():Promise<Record<string,string>>{const value=await readSession();return value?{Authorization:`Bearer ${value.token}`}:{ };}
export async function expireSession(){await saveSession(null);listeners.forEach(listener=>listener());}
