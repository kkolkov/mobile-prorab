import type {Execution} from '../../execution/types';
import {EstimateDetails} from '../../components/EstimateDetails';
import {formatDays} from '../../core/display';
import { useCallback, useState } from 'react';
import { View, Modal } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, request } from '../../core/api';
import type { Project } from '../../core/types';
import { startWizard } from '../../core/session';
import { rub, resumeStep } from '../../core/rules';
import { Screen, Grid, Metric, Heading, Body, Button, Notice, ErrorText, styles } from '../../components/ui';
export default function Dashboard() {
  const {id}=useLocalSearchParams<{id:string}>();
  const [p,setProject]=useState<Project|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [execution,setExecution]=useState<Execution|null>(null);
  const [status,setStatus]=useState('Планирование'),[showInfo,setShowInfo]=useState(false);
  const load=useCallback(async()=>{
    setBusy(true);setError('');setShowInfo(false);setExecution(null);try{
      const value=await api.get(id);setProject(value);
      if(value.status==='draft'){startWizard(value);router.replace(`/wizard/${resumeStep(value)}`);}else{
        try{const snapshot=await request<Execution>(`/projects/${id}/execution`);
        setExecution(snapshot);
        const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        setStatus(snapshot.progressPercent===100?'Все этапы завершены':snapshot.data.startDate&&snapshot.data.startDate<=today?'В работе':'Планирование');
        }catch{setStatus('Статус недоступен');setError('Не удалось загрузить бюджет и график работ. Повторите загрузку.');}
      }
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  },[id]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  return <Screen title={p?.name??'Загружаем проект…'} home={()=>router.replace('/')}>
    {p&&<>
      {p.estimateStatus==='stale'&&<Notice>Активная смета рассчитана по прежним параметрам. Новая смета применяется отдельно.</Notice>}
      <Grid><Metric label="Бюджет" value={execution?execution.planBudget==null?'Пока не рассчитан':rub(execution.planBudget):busy?'Загружаем…':'Не удалось загрузить'} hint={execution?.data.budget?.total?.min!=null&&execution.budgetWithReserve!=null?`От ${rub(execution.data.budget.total.min)} до ${rub(execution.budgetWithReserve)} с резервом`:undefined}/><Metric label="Срок" value={execution?execution.totalDays>0?formatDays(execution.totalDays):'График пока не задан':busy?'Загружаем…':'Не удалось загрузить'} hint={execution?.data.budget?.durationMinDays!=null&&execution.data.budget.durationMaxDays!=null?`По смете: от ${formatDays(execution.data.budget.durationMinDays)} до ${formatDays(execution.data.budget.durationMaxDays)} с запасом`:undefined} tone="lavender"/></Grid>
      <View style={styles.planning}><View><Body>Статус</Body><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Heading>{status}</Heading>{status!=='В работе'&&<Button secondary label="ⓘ" onPress={()=>setShowInfo(true)}/>}</View></View>
      <View><Button label="Уточнить параметры проекта" disabled={busy} onPress={()=>router.push(`/refinement/${id}`)}/></View></View>
      <Modal visible={showInfo&&status!=='В работе'} transparent animationType="fade" onRequestClose={()=>setShowInfo(false)}><View style={styles.overlay}><View style={styles.sheet}><Heading>О статусе проекта</Heading><Body>Статус изменится на &quot;В работе&quot; автоматически, как только в графике работ наступит дата начала. Вы можете указать ее в разделе &quot;График работ&quot;</Body><Button label="Понятно" onPress={()=>setShowInfo(false)}/></View></View></Modal>
      {p.budgetMinRub==null&&<Button secondary label="Повторить расчёт" disabled={busy} onPress={()=>router.push(`/refinement/${id}`)}/>}
      <EstimateDetails estimate={p.estimateDetails} compact/><Heading>Инструменты проекта</Heading><Grid><Button label="График работ" onPress={()=>router.push(`/execution/${id}?tab=schedule`)}/><Button label="Финансовый трекер" secondary onPress={()=>router.push(`/execution/${id}?tab=finance`)}/></Grid>
    </>}<ErrorText message={error}/>{!!error&&<Button label="Повторить" disabled={busy} onPress={load}/>}
  </Screen>;
}
