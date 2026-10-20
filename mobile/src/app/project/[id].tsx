import {durationRange} from '../../core/display';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api } from '../../core/api';
import type { Project } from '../../core/types';
import { startWizard } from '../../core/session';
import { range, resumeStep } from '../../core/rules';
import { Screen, Heading, Body, Button, Demo, Notice, ErrorText, styles } from '../../components/ui';
export default function Dashboard() {
  const {id}=useLocalSearchParams<{id:string}>();
  const [p,setProject]=useState<Project|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    setBusy(true);setError('');try{
      const value=await api.get(id);setProject(value);
      if(value.status==='draft'){startWizard(value);router.replace(`/wizard/${resumeStep(value)}`);}
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  },[id]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  return <Screen title={p?.name??'Загружаем проект…'} home={()=>router.replace('/')}>
    {p&&<>
      <Demo/>{p.estimateStatus==='stale'&&<Notice>Активная смета рассчитана по прежним параметрам. Новая смета применяется отдельно.</Notice>}
      <Heading>Бюджет</Heading><Body>{range(p.budgetMinRub,p.budgetMaxRub)}</Body><Heading>Срок</Heading><Body>{durationRange(p.durationMinDays,p.durationMaxDays)}</Body>
      <View style={styles.row}><View style={{flex:1}}><Body>Статус</Body><Heading>Планирование</Heading></View>
      <View style={{flex:1}}><Button label="Уточнить параметры проекта" disabled={busy} onPress={()=>router.push(`/refinement/${id}`)}/></View></View>
      {p.budgetMinRub==null&&<Button secondary label="Повторить расчёт" disabled={busy} onPress={()=>router.push(`/refinement/${id}`)}/>}
      <Heading>Инструменты проекта</Heading>{['План работ','Финансовый трекер','Трекер ремонта'].map(label=><Notice key={label}>{label}{'\n'}Раздел пока не реализован.</Notice>)}
    </>}<ErrorText message={error}/>{!!error&&<Button label="Повторить" disabled={busy} onPress={load}/>}
  </Screen>;
}
