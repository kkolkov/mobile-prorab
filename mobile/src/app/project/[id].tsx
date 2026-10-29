import {EstimateDetails} from '../../components/EstimateDetails';
import {durationRange} from '../../core/display';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api } from '../../core/api';
import type { Project } from '../../core/types';
import { startWizard } from '../../core/session';
import { range, resumeStep } from '../../core/rules';
import { Screen, Grid, Metric, Heading, Body, Button, Notice, ErrorText, styles } from '../../components/ui';
export default function Dashboard() {
  const {id}=useLocalSearchParams<{id:string}>();
  const [showStatusHelp,setShowStatusHelp]=useState(false);
  const [p,setProject]=useState<Project|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    setBusy(true);setError('');try{
      const value=await api.get(id);setProject(value);
      if(value.status==='draft'){startWizard(value);router.replace(`/wizard/${resumeStep(value)}`);}
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  },[id]);
  useFocusEffect(useCallback(()=>{void load();const timer=setInterval(()=>{void api.get(id).then(setProject).catch(()=>{});},60000);return ()=>clearInterval(timer);},[load,id]));
  return <Screen title={p?.name??'Загружаем проект…'} home={()=>router.replace('/')}>
    {p&&<>
      {p.estimateStatus==='stale'&&<Notice>Активная смета рассчитана по прежним параметрам. Новая смета применяется отдельно.</Notice>}
      <Grid><Metric label="Бюджет" value={range(p.budgetMinRub,p.budgetMaxRub)}/><Metric label="Срок" value={durationRange(p.durationMinDays,p.durationMaxDays)} tone="lavender"/></Grid>
      <View style={styles.planning}><View><Body>Статус</Body><View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}><Heading>{p.repairStatus==='completed'?'Все этапы завершены':p.repairStatus==='in_progress'?'В работе':'Планирование'}</Heading><Button secondary label={showStatusHelp?'Скрыть пояснение статуса':'Как меняется статус проекта'} displayLabel="ⓘ" onPress={()=>setShowStatusHelp(!showStatusHelp)}/></View>{showStatusHelp&&<Body>Статус изменится на “В работе” автоматически, как только в графике работ наступит дата начала. Вы можете указать её в разделе “График работ”</Body>}</View>
      <View><Button label="Уточнить параметры проекта" disabled={busy} onPress={()=>router.push(`/refinement/${id}`)}/></View></View>
      {p.budgetMinRub==null&&<Button secondary label="Повторить расчёт" disabled={busy} onPress={()=>router.push(`/refinement/${id}`)}/>}
      <EstimateDetails estimate={p.estimateDetails}/><Heading>Инструменты проекта</Heading><Grid><Button label="График работ" onPress={()=>router.push(`/execution/${id}?tab=schedule`)}/><Button label="Финансовый трекер" secondary onPress={()=>router.push(`/execution/${id}?tab=finance`)}/></Grid>
    </>}<ErrorText message={error}/>{!!error&&<Button label="Повторить" disabled={busy} onPress={load}/>}
  </Screen>;
}
