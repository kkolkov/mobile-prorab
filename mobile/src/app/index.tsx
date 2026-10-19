import {projectsSubtitle} from '../core/display';
import {Modal,View} from 'react-native';
import {RenameProject} from '../components/RenameProject';
import {useAuth} from '../auth/AuthProvider';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../core/api';
import { startWizard } from '../core/session';
import { resumeStep } from '../core/rules';
import type { Project } from '../core/types';
import { Screen, Button, Card, Field, ErrorText, Body } from '../components/ui';

export default function Home() {
  const {user,signOut}=useAuth();
  const [projects,setProjects]=useState<Project[]>([]),[id,setId]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [renaming,setRenaming]=useState<Project|null>(null);
  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try { setProjects(await api.list());
    }catch{setError('Не удалось загрузить список проектов на этом устройстве.');}finally{setBusy(false);}
  },[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const open=(p:Project)=>{
    if(p.status==='active')router.push(`/project/${p.projectId}`);
    else {startWizard(p);router.push(`/wizard/${resumeStep(p)}`);}
  };
  async function openExisting() {
    const match=id.trim().match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if(!match){setError('Вставьте ссылку на проект или его идентификатор.');return;}
    setBusy(true);setError('');
    try{const p=await api.get(match[0]);open(p);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <Screen title="Мои проекты" subtitle={projectsSubtitle(projects)}>
    <Body>{user?.login}</Body><Button label="Выйти" secondary disabled={busy} onPress={async()=>{setBusy(true);try{await signOut();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}/>
    <Button label="Создать проект" disabled={busy} onPress={()=>{startWizard();router.push('/questionnaire');}}/>
    {projects.map(p=><View key={p.projectId} style={{gap:8}}><Card title={p.name} description={p.status==='draft'?`Черновик · продолжить с шага ${resumeStep(p)}`:'Проект · Планирование'} onPress={()=>open(p)} disabled={busy}/><Button secondary label={`Переименовать: ${p.name}`} displayLabel="Переименовать" disabled={busy} onPress={()=>setRenaming(p)}/></View>)}
    <Modal visible={!!renaming} animationType="slide" onRequestClose={()=>setRenaming(null)}>{renaming&&<RenameProject project={renaming} onCancel={()=>setRenaming(null)} onSaved={saved=>{setProjects(items=>items.map(item=>item.projectId===saved.projectId?saved:item));setRenaming(null);}}/>}</Modal>
    {!projects.length&&<Body>Здесь появятся ваши проекты, созданные на любом устройстве.</Body>}
    <Field label="Ссылка или ID существующего проекта" value={id} onChange={setId} maxLength={400} placeholder="Можно скопировать из веб-версии" disabled={busy}/>
    <Button label="Открыть проект" secondary disabled={busy||!id.trim()} onPress={openExisting}/>
    <ErrorText message={error}/>{!!error&&<Button label="Повторить загрузку" secondary onPress={load} disabled={busy}/>}
  </Screen>;
}
