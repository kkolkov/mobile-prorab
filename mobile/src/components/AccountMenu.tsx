import {useEffect,useState} from 'react';
import {Modal,Platform,Pressable,Text,View} from 'react-native';
import {Button,palette} from './ui';
export function AccountMenu({login,busy,onLogout}:{login:string;busy:boolean;onLogout:()=>void}){
 const [open,setOpen]=useState(false);
 useEffect(()=>{if(Platform.OS!=='web'||!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);
 return <View style={{maxWidth:'35%'}}><Pressable accessibilityRole="button" accessibilityLabel={`Меню пользователя: ${login}`} accessibilityState={{expanded:open}} onPress={()=>setOpen(true)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}><Text numberOfLines={1} style={{fontSize:13,color:palette.ink}}>{login} ⌄</Text></Pressable>
 <Modal visible={open} transparent onRequestClose={()=>setOpen(false)}><Pressable onPress={()=>setOpen(false)} style={{flex:1,alignItems:'flex-end',paddingTop:80,paddingRight:24}}><View style={{padding:6,borderRadius:14,borderWidth:1,borderColor:palette.line,backgroundColor:palette.surface,minWidth:160}}><Button secondary label="Выйти" disabled={busy} onPress={()=>{setOpen(false);onLogout();}}/></View></Pressable></Modal></View>;
}
