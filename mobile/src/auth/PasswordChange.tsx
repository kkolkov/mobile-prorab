import {useRef,useState} from 'react';
import {Modal,Text,TextInput,View} from 'react-native';
import {Screen,Body,Button,ErrorText,styles} from '../components/ui';
import {api} from '../core/api';
export function PasswordChange({onClose}:{onClose:()=>void}){
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 const valid=password.trim().length>0&&password.length>=8&&password.length<=128;
 const close=()=>{if(!lock.current){setPassword('');onClose();}};
 async function save(){if(lock.current||!valid||done)return;lock.current=true;setBusy(true);setError('');try{await api.changePassword(password);setPassword('');setDone(true);}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 return <Modal visible animationType="slide" onRequestClose={close}><Screen title="Изменить пароль" back={close}>
 {done?<Body>Пароль изменён. На других устройствах потребуется войти заново.</Body>:<><View style={styles.field}><Text style={styles.label}>Новый пароль</Text><TextInput accessibilityLabel="Новый пароль" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" maxLength={128} style={styles.input} onSubmitEditing={save}/><Body>От 8 до 128 символов.</Body></View><ErrorText message={error}/><Button label="Сохранить" busy={busy} disabled={!valid} onPress={save}/></>}
 <Button secondary label={done?'Закрыть':'Отмена'} disabled={busy} onPress={close}/>
 </Screen></Modal>;
}
