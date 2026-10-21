import {useRef,useState} from 'react';
import {api} from '../core/api';
import {ApiError} from '../core/http';
import type {Project} from '../core/types';
import {Screen,Button,ErrorText,Body} from './ui';
export function DeleteProject({project,onDeleted,onCancel}:{project:Project;onDeleted:()=>void;onCancel:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function remove(){if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{await api.remove(project);onDeleted();}
  catch(e){setError(e instanceof ApiError&&e.status===409?'Проект изменился. Закройте окно и обновите данные перед удалением.':(e as Error).message);}
  finally{lock.current=false;setBusy(false);}
 }
 return <Screen title="Удалить проект?" subtitle={project.name} busy={busy} back={onCancel}>
  <Body>Все детали по проекту будут удалены, вернуть будет невозможно. Вы уверены?</Body>
  <ErrorText message={error}/><Button label="Да" busy={busy} onPress={remove}/><Button secondary label="Нет" disabled={busy} onPress={onCancel}/>
 </Screen>;
}
