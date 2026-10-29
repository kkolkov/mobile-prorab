import {Modal} from 'react-native';
import {DeleteProject} from '../../components/DeleteProject';
import {EstimateDetails} from '../../components/EstimateDetails';
import {durationRange} from '../../core/display';
import {answersComplete} from '../../onboarding/questions';
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../core/api';
import { ApiError } from '../../core/http';
import { choices } from '../../core/choices';
import { amount, autoName, range, updateNameArea, validArea } from '../../core/rules';
import { wizard } from '../../core/session';
import { emit } from '../../core/analytics';
import { Screen, Check, Grid, Metric, Button, Card, Field, Counter, ErrorText, Body, Heading, Notice } from '../../components/ui';

const titles=['','Об объекте','Текущее состояние квартиры','Желаемый результат ремонта','Параметры квартиры','Уровень ремонта','Предварительная оценка'];
const descriptions:Record<string,string>={
  no_finish:'Только несущие стены и перекрытия. Отсутствуют перегородки, стяжка, штукатурка и все коммуникации.',white_box:'Выполнены черновые работы: стены оштукатурены, полы имеют стяжку, проведены электрика и трубы.',
  old_finish:'Вторичное жилье с устаревшим ремонтом. Требуется демонтаж.',lived_in:'Квартира пригодна для проживания, требуется обновление ремонта.',
  finish_only:'Выполнены все финишные работы: стены, полы, потолки, установлены двери. Сантехника и мебель отсутствуют.',move_in_ready:'Выполнена чистовая отделка, установлена кухня, сантехника и базовое оборудование.',fully_furnished:'Готовая квартира с основной мебелью.',
  budget:'Базовая отделка. Практичные и износостойкие материалы (эконом-сегмент, российские или бюджетные бренды).',comfort:'Средний сегмент. Качественные материалы с хорошим дизайном (популярные европейские или премиальные российские бренды).',business:'Премиум-сегмент. Эксклюзивные материалы, дизайнерская сантехника, натуральные или высокотехнологичные покрытия.',
};
export default function Wizard() {
  const params=useLocalSearchParams<{step:string}>(),step=Math.max(1,Math.min(6,Number(params.step)||1));
  const [,redraw]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const lock=useRef(false),local=wizard.local,p=wizard.project;
  function change<K extends keyof typeof local>(key:K,value:typeof local[K]) {wizard.local[key]=value;redraw(n=>n+1);}
  useEffect(()=>{setError('');setConflict(false);emit({name:'project_step_viewed',projectId:wizard.project?.projectId,step});},[step]);
  useEffect(()=>{if(step===1&&!wizard.project&&!answersComplete(wizard.answers))router.replace('/questionnaire');},[step]);
  useEffect(()=>{if(step>1&&!wizard.project)router.replace('/');},[step]);
  async function run(operation:()=>Promise<void>) {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{await operation();}catch(e){setError((e as Error).message);setConflict(e instanceof ApiError&&e.status===409);}finally{lock.current=false;setBusy(false);}
  }
  async function save() {
    await run(async()=>{
      const project=wizard.project;
      const body=step===1?{areaM2:amount(local.areaM2),name:local.nameSource==='user'?local.name:''}:
        step===2?{currentState:local.currentState}:step===3?{targetState:local.targetState}:
        step===4?{otherRoomsRepair:local.otherRoomsRepair,roomsCount:local.roomsCount,bathroomsCount:local.bathroomsCount,redevelopment:local.redevelopment}:{finishLevel:local.finishLevel};
      if(step===5)emit({name:'estimate_requested',projectId:project?.projectId});
      const saved=project?await api.step(project.projectId,step,{...body,version:project.version}):await api.create({...body,questionnaire:{...wizard.answers,questionnaireVersion:'1'}});
      wizard.project=saved;
      // Never spread the server response over unsaved answers on other steps.
      if(step===1){local.name=saved.name;local.nameSource=saved.nameSource;}
      emit({name:project?'project_step_completed':'project_draft_created',projectId:saved.projectId,step});
      if(step===5)emit({name:saved.estimateStatus==='ready'?'estimate_succeeded':'estimate_failed',projectId:saved.projectId});
      router.replace(`/wizard/${step+1}`);
    });
  }
  async function activate(refine=false) {
    if(!p)return;
    await run(async()=>{const saved=await api.activate(p);wizard.project=saved;emit({name:'project_activated',projectId:saved.projectId});router.replace(refine?`/refinement/${saved.projectId}`:`/project/${saved.projectId}`);});
  }
  const selectedKey=step===2?'currentState':step===3?'targetState':'finishLevel';
  const allowed=step===1?validArea(local.areaM2):step===4?(local.roomsCount!==0||local.bathroomsCount!==0||local.otherRoomsRepair):step<6?!!local[selectedKey]:true;
  return <Screen key={step} title={titles[step]} step={step} busy={busy} back={()=>step===1?router.replace(p?'/':'/questionnaire'):router.replace(`/wizard/${step-1}`)}
    home={()=>{emit({name:'project_creation_abandoned',projectId:p?.projectId});router.replace('/');}}>
    {step===1&&<>
      <Body>Минимальные данные для идентификации проекта и первичной оценки.</Body>
      <Field label="Площадь квартиры, м²" value={local.areaM2} numeric required min={5} max={9999} disabled={busy} placeholder="Например, 68.5" onChange={v=>{
        local.name=local.nameSource==='auto'?autoName(v):updateNameArea(local.name,v);change('areaM2',v);
      }}/>
      <Body>Площадь: от 5 до 9999 м², не более одного знака после запятой.</Body>
      <Field label="Название проекта · необязательно" value={local.name} disabled={busy} placeholder="Автоматически сформируется" onChange={v=>{local.nameSource=v?'user':'auto';change('name',v);}}/>
    </>}
    {[2,3,5].includes(step)&&<>
      <Body>{step===2?'Определите исходное состояние объекта.':step===3?'До какого состояния хотите довести объект?':'Влияет на класс материалов и итоговую смету. Перечень работ остается неизменным.'}</Body>
      <Grid>{Object.entries(choices[selectedKey]).filter(([key])=>key!=='fully_furnished').map(([key,label])=><Card key={key} title={label} description={descriptions[key]} selected={local[selectedKey]===key} disabled={busy||key==='fully_furnished'} onPress={()=>change(selectedKey,key)}/>)}</Grid>
      {step===5&&<Body>Уровень ремонта можно изменить позже.</Body>}
    </>}
    {step===4&&<>
      <Counter min={0} label="Количество комнат" value={local.roomsCount} onChange={v=>change('roomsCount',v)} disabled={busy}/>
      <Counter min={0} label="Количество санузлов" value={local.bathroomsCount} onChange={v=>change('bathroomsCount',v)} disabled={busy}/>
      {local.roomsCount===0&&local.bathroomsCount===0&&<Check label="Ремонт будет в других помещениях?" value={local.otherRoomsRepair} fallback={false} onChange={v=>change('otherRoomsRepair',v)} disabled={busy}/>}
      <Heading>Перепланировка</Heading><Body>Планируется демонтаж или возведение перегородок?</Body>
      <Card title="Да" selected={local.redevelopment} onPress={()=>change('redevelopment',true)} disabled={busy}/>
      <Card title="Нет" selected={!local.redevelopment} onPress={()=>change('redevelopment',false)} disabled={busy}/>
    </>}
    {step===6&&p&&<>
      <Heading>{p.name}</Heading>
      <Notice>Площадь {p.areaM2} м² · комнаты {p.roomsCount??'—'} · санузлы {p.bathroomsCount}</Notice>
      {p.estimateStatus==='failed'?<Notice>Проект создан. Сейчас не удалось рассчитать стоимость и срок.</Notice>:null}
      <Grid><Metric label="Бюджет" value={range(p.budgetMinRub,p.budgetMaxRub)}/><Metric label="Срок" value={durationRange(p.durationMinDays,p.durationMaxDays)} tone="lavender"/></Grid>
      <EstimateDetails estimate={p.estimateDetails} compact/>
      <Notice>
        {choices.currentState[p.currentState as keyof typeof choices.currentState]} → {choices.targetState[p.targetState as keyof typeof choices.targetState]}{'\n'}
        {choices.finishLevel[p.finishLevel as keyof typeof choices.finishLevel]}</Notice>
      {p.estimateStatus!=='ready'&&<Button secondary label="Повторить расчёт" disabled={busy} onPress={()=>run(async()=>{wizard.project=await api.estimate(p);if(wizard.project.estimateStatus==='failed')setError('Повторный расчёт не выполнен. Проверьте площадь и состав помещений через «Исправить параметры» или «Уточнить параметры проекта».');redraw(n=>n+1);})}/>}
      {p.estimateStatus==='failed'&&<Button secondary label="Исправить параметры" disabled={busy} onPress={()=>router.replace('/wizard/4')}/>}
      <Grid><Button label="Перейти в проект" disabled={busy} onPress={()=>activate()}/><Button secondary label="Уточнить параметры проекта" disabled={busy} onPress={()=>activate(true)}/></Grid>
      <Button secondary label="Удалить проект" disabled={busy} onPress={()=>setDeleting(true)}/>
      <Modal visible={deleting} animationType="slide" onRequestClose={()=>setDeleting(false)}><DeleteProject project={p} onCancel={()=>setDeleting(false)} onDeleted={()=>{setDeleting(false);wizard.project=null;router.replace('/');}}/></Modal>
    </>}
    <ErrorText message={error}/>
    {conflict&&<><Notice>Данные изменены в другом сеансе. Ваш ввод сохранён.</Notice><Button secondary label="Загрузить актуальную версию, сохранив мой ввод" disabled={busy} onPress={()=>run(async()=>{
      if(!p)return;wizard.project=await api.get(p.projectId);setConflict(false);setError('Версия обновлена. Проверьте ввод и нажмите основную кнопку, чтобы сохранить его вместо серверных значений.');
    })}/></>}
    {step<6&&<Button testID="continue" label={busy?'Сохранение…':step===5?'Получить оценку':'Продолжить'} disabled={!allowed||conflict} busy={busy} onPress={save}/>}

  </Screen>;
}
