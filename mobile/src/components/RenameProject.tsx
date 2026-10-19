import {useRef,useState} from 'react';
import {api} from '../core/api';
import {ApiError} from '../core/http';
import type {Project} from '../core/types';
import {Screen,Field,Button,ErrorText,Body} from './ui';
export function RenameProject({project,onSaved,onCancel}:{project:Project;onSaved:(p:Project)=>void;onCancel:()=>void}){
 const [current,setCurrent]=useState(project),[name,setName]=useState(project.name),[busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false);const lock=useRef(false);
 async function run(refresh=false){
  if(lock.current||(!refresh&&(!name.trim()||conflict)))return;
  lock.current=true;setBusy(true);setError('');
  try{if(refresh){setCurrent(await api.get(current.projectId));setConflict(false);setError('Версия обновлена. Проверьте имя и нажмите «Сохранить».');}else onSaved(await api.rename(current,name.trim()));}
  catch(e){setError((e as Error).message);if(e instanceof ApiError&&e.status===409)setConflict(true);}
  finally{lock.current=false;setBusy(false);}
 }
 return <Screen title="Переименовать проект" back={onCancel} busy={busy}>
  <Field label="Название проекта" value={name} onChange={setName} maxLength={100} disabled={busy}/>
  {conflict&&<><Body>Проект изменён в другом сеансе. Ваше имя сохранено в поле.</Body><Button secondary label="Загрузить актуальную версию" disabled={busy} onPress={()=>run(true)}/></>}
  <ErrorText message={error}/><Button label="Сохранить" disabled={!name.trim()||name.length>100||conflict} busy={busy} onPress={()=>run()}/><Button secondary label="Отмена" disabled={busy} onPress={onCancel}/>
 </Screen>;
}
