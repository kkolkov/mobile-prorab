import { useRef, useState } from 'react';
import { View,Text,TextInput } from 'react-native';
import { Screen,Body,Button,ErrorText,styles } from '../components/ui';
import { useAuth } from './AuthProvider';
export function AuthScreen(){
 const {signIn}=useAuth();const [register,setRegister]=useState(false),[login,setLogin]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 const valid=/^[a-zA-Z0-9._-]{3,40}$/.test(login.trim())&&password.length>=8&&password.length<=128;
 async function submit(){if(lock.current||!valid)return;lock.current=true;setBusy(true);setError('');try{await signIn(login.trim(),password,register);setPassword('');}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 return <Screen title={register?'Создать аккаунт':'С возвращением'} subtitle={register?'Сохраните ваши проекты и продолжайте ремонт на любом устройстве.':'Войдите, чтобы продолжить работу над вашим ремонтом.'}>
  <View style={styles.field}><Text style={styles.label}>Логин</Text><TextInput accessibilityLabel="Логин" value={login} onChangeText={setLogin} autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" maxLength={40} editable={!busy} placeholder="Например, prorab" style={styles.input}/></View>
  <View style={styles.field}><Text style={styles.label}>Пароль</Text><TextInput accessibilityLabel="Пароль" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={register?'new-password':'current-password'} textContentType={register?'newPassword':'password'} maxLength={128} editable={!busy} placeholder="Не менее 8 символов" style={styles.input} onSubmitEditing={submit}/></View>
  {register&&<Body>Логин: 3–40 символов — латиница, цифры, точка, дефис или подчёркивание.</Body>}
  <ErrorText message={error}/><Button label={register?'Создать аккаунт':'Войти'} busy={busy} disabled={!valid} onPress={submit}/>
  <Button secondary label={register?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться'} disabled={busy} onPress={()=>{setRegister(!register);setError('');}}/>
 </Screen>;
}
