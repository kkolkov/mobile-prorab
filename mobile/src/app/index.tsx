import {AccountMenu} from '../components/AccountMenu';
import {ProjectCard} from '../components/ProjectCard';
import {projectsSubtitle} from '../core/display';
import {Modal} from 'react-native';
import {DeleteProject} from '../components/DeleteProject';
import {RenameProject} from '../components/RenameProject';
import {useAuth} from '../auth/AuthProvider';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../core/api';
import { startWizard } from '../core/session';
import { resumeStep } from '../core/rules';
import type { Project } from '../core/types';
import { Screen, Grid, Button, Field, ErrorText, Body } from '../components/ui';

export default function Home() {
  const {user,signOut}=useAuth();
  const [projects,setProjects]=useState<Project[]>([]),[id,setId]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [deleting,setDeleting]=useState<Project|null>(null);
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
  return <Screen title="Мои проекты" subtitle={projectsSubtitle(projects)} headerRight={<AccountMenu login={user?.login??''} busy={busy} onLogout={async()=>{setBusy(true);try{await signOut();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}/>}>
    <Button label="Создать проект" disabled={busy} onPress={()=>{startWizard();router.push('/questionnaire');}}/>
    <Grid>{projects.map(p=><ProjectCard key={p.projectId} project={p} onPress={()=>open(p)} onRename={()=>setRenaming(p)} onDelete={()=>setDeleting(p)} disabled={busy}/>)}</Grid>
    <Modal visible={!!deleting} animationType="slide" onRequestClose={()=>setDeleting(null)}>{deleting&&<DeleteProject project={deleting} onCancel={()=>setDeleting(null)} onDeleted={()=>{setProjects(items=>items.filter(p=>p.projectId!==deleting.projectId));setDeleting(null);}}/>}</Modal>
    <Modal visible={!!renaming} animationType="slide" onRequestClose={()=>setRenaming(null)}>{renaming&&<RenameProject project={renaming} onCancel={()=>setRenaming(null)} onSaved={saved=>{setProjects(items=>items.map(item=>item.projectId===saved.projectId?{...item,...saved}:item));setRenaming(null);}}/>}</Modal>
    {!projects.length&&<Body>Здесь появятся ваши проекты, созданные на любом устройстве.</Body>}
    <Field label="Ссылка или ID существующего проекта" value={id} onChange={setId} maxLength={400} placeholder="Можно скопировать из веб-версии" disabled={busy}/>
    <Button label="Открыть проект" secondary disabled={busy||!id.trim()} onPress={openExisting}/>
    <ErrorText message={error}/>{!!error&&<Button label="Повторить загрузку" secondary onPress={load} disabled={busy}/>}
  </Screen>;
}
