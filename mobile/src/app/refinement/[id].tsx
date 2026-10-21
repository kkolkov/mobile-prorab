import {roomName} from '../../refinement/room-name';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { api } from '../../core/api';
import { ApiError } from '../../core/http';
import { choices } from '../../core/choices';
import { draftsFor } from '../../core/session';
import { amount, clone, emptyRoom, parseNumbers } from '../../core/rules';
import { emit } from '../../core/analytics';
import type { Draft, Room, Section, SectionData, Snapshot } from '../../core/types';
import { Screen, Button, Card, Select, Body, Demo, ErrorText, Notice, Confirm } from '../../components/ui';
import { ApartmentForm, ExteriorsForm, KitchenForm, RoomForm, roomError, sectionError } from '../../refinement/forms';
import { Comparison } from '../../refinement/Comparison';

const sections:Record<Section,[string,string]>={
  apartment:['Параметры квартиры','Состояния, уровень ремонта, площадь, высота, отделка и работы'],
  rooms:['Помещения','Количество комнат, площади и индивидуальная отделка'],
  kitchen:['Кухня и техника','Гарнитур, материалы и техника к покупке'],
  exteriors:['Балкон и лоджия','Площадь, остекление, утепление, отделка и электрика'],
};
export default function Refinement() {
  const {id,view:routeView}=useLocalSearchParams<{id:string;view?:string}>();
  const view=routeView&&(['menu','compare',...Object.keys(sections)].includes(routeView))?routeView:'menu';
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false);
  const [room,setRoom]=useState<Room|null>(null),[kitchenId,setKitchenId]=useState(''),[,redraw]=useState(0);
  const [confirmation,setConfirmation]=useState<{message:string;action:()=>void}|null>(null);
  const lock=useRef(false),drafts=draftsFor(id);
  const setView=(next:string)=>{setError('');setConflict(false);router.setParams({view:next});};
  const load=useCallback(async()=>{
    setError('');try{setSnapshot(await api.refinement(id));emit({name:'refinement_opened',projectId:id});}catch(e){setError((e as Error).message);}
  },[id]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(view!=='menu'||snapshot?.calculationStatus!=='pending')return;
    let cancelled=false;
    const timer=setTimeout(async()=>{
      try{const fresh=await api.refinement(id);if(cancelled)return;
        setSnapshot(old=>!old||(fresh.project.version>=old.project.version&&fresh.revision>=old.revision)?fresh:old);
        if(fresh.calculationStatus==='ready')emit({name:'refinement_estimate_received',projectId:id});
      }catch(e){if(!cancelled)setError((e as Error).message);}
    },1000);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[id,view,snapshot]);
  async function run(fn:()=>Promise<void>) {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{await fn();}catch(e){setError((e as Error).message);setConflict(e instanceof ApiError&&e.status===409);emit({name:'refinement_request_failed',projectId:id,section:view});}
    finally{lock.current=false;setBusy(false);}
  }
  function open<K extends Section>(key:K) {
    if(!snapshot)return;
    if(!drafts[key]) {
      const sectionsData:SectionData={apartment:{...snapshot.data.apartment,redevelopment:snapshot.data.apartment.redevelopment??snapshot.project.redevelopment},rooms:{rooms:snapshot.data.rooms,roomCountManual:snapshot.data.roomCountManual},kitchen:snapshot.data.kitchens,exteriors:snapshot.data.exteriors};
      const draft:Draft<K>={data:clone(sectionsData[key]),version:snapshot.project.version,confirmedRemovals:[]};
      // Key and value are paired here; retain their association in the session map.
      Object.assign(drafts,{[key]:draft});
    }
    if(key==='kitchen')setKitchenId(Object.keys(drafts.kitchen!.data)[0]??'');
    setRoom(null);setView(key);emit({name:'refinement_section_opened',projectId:id,section:key});
  }
  function change<K extends Section>(key:K,data:SectionData[K]) {const d=drafts[key];if(d)d.data=data;redraw(n=>n+1);}
  function exit(){if(!busy)router.replace(`/project/${id}`);}
  function back(){if(room)setRoom(null);else if(view==='menu')exit();else setView('menu');setError('');}
  function newRoom():Room {return {id:Crypto.randomUUID(),name:'',type:'living',areaM2:null,floor:'inherit',walls:'inherit',ceiling:'inherit',automatic:false};}
  function removeRoom(r:Room) {
    const d=drafts.rooms!;
    const remove=()=>{d.confirmedRemovals.push(r.id);change('rooms',{rooms:d.data.rooms.filter(x=>x.id!==r.id),roomCountManual:r.type==='living'?true:d.data.roomCountManual});};
    if(!emptyRoom(r)||r.type==='kitchen')setConfirmation({message:`Удалить «${r.name}»${r.type==='kitchen'?' вместе с оснащением кухни':''}?`,action:remove});else remove();
  }
  function doneRoom() {
    if(!room)return;const invalid=roomError(room);if(invalid){setError(invalid);return;}
    const d=drafts.rooms!,before=d.data.rooms.find(r=>r.id===room.id),edited=parseNumbers(room);
    edited.name=roomName(edited,d.data.rooms,choices.type);
    const done=()=>{
      if(!before||JSON.stringify({...before,automatic:false})!==JSON.stringify({...edited,automatic:false}))edited.automatic=false;
      const rooms=before?d.data.rooms.map(r=>r.id===edited.id?edited:r):[...d.data.rooms,edited];
      const changedLiving=before?.type!==edited.type&&(before?.type==='living'||edited.type==='living');
      change('rooms',{rooms,roomCountManual:d.data.roomCountManual||changedLiving});setRoom(null);setError('');
    };
    if(before?.type==='kitchen'&&edited.type!=='kitchen')setConfirmation({message:'Смена типа удалит оснащение кухни. Продолжить?',action:()=>{d.confirmedRemovals.push(before.id);done();}});else done();
  }
  async function save() {
    const key=view as Section,d=drafts[key];if(!d||!snapshot)return;
    const invalid=sectionError(key,d.data);if(invalid){setError(invalid);return;}
    await run(async()=>{
      const result=await api.save(id,key,{...d,data:parseNumbers(d.data)});
      if(JSON.stringify(result.data)!==JSON.stringify(snapshot.data))emit({name:'refinement_section_saved',projectId:id,section:key});
      if(!snapshot.data.completedSections.includes(key)&&result.data.completedSections.includes(key))emit({name:'refinement_section_first_saved',projectId:id,section:key});
      setSnapshot(result);delete drafts[key];setView('menu');
    });
  }
  async function refreshConflict() {
    await run(async()=>{
      const fresh=await api.refinement(id);setSnapshot(fresh);
      const d=drafts[view as Section];if(d)d.version=fresh.project.version;
      setConflict(false);setError(d?'Версия обновлена. Ваш ввод остался в форме. Нажмите «Продолжить», если хотите сохранить его вместо серверных значений.':'Версия обновлена. Проверьте новый расчёт перед применением.');
      if(view==='compare'&&fresh.calculationStatus!=='ready')router.setParams({view:'menu'});
    });
  }
  const section=Object.hasOwn(sections,view)?view as Section:null;
  const d=section?drafts[section]:undefined;
  const title=room?'Карточка помещения':view==='compare'?'Сравнение сметы':section?sections[section][0]:'Уточнение параметров проекта';
  return <Screen key={`${view}-${room?.id??''}`} title={title} subtitle={snapshot?.project.name} back={back} busy={busy}>
    <Demo/>
    {!snapshot&&<><Body>Загружаем параметры проекта…</Body>{!!error&&<Button label="Повторить загрузку" onPress={load}/>}</>}
    {snapshot&&view==='menu'&&<>
      <Body>Выберите, какие данные хотите уточнить</Body>
      {(Object.entries(sections) as [Section,[string,string]][]).map(([key,[label,description]])=><Card key={key} title={label} description={`${description}\n${snapshot.data.updatedSections?.includes(key)?'Данные указаны и обновлены':snapshot.data.completedSections.includes(key)?'Данные указаны':'Не уточнено'}${drafts[key]?' · Есть несохранённый ввод':''}`} onPress={()=>open(key)} disabled={busy}/>)}
      <Notice>{snapshot.calculationMessage}</Notice>
      {snapshot.activeEstimateOutdated&&<Notice>Активная смета рассчитана по прежним параметрам. Она изменится только после применения нового расчёта.</Notice>}
      {snapshot.calculationStatus==='ready'&&<Button label="Посмотреть расчёт" onPress={()=>setView('compare')} disabled={busy}/>}
      {['failed','stale','not_requested'].includes(snapshot.calculationStatus)&&<Button label="Повторить расчёт" disabled={busy} onPress={()=>run(async()=>{setSnapshot(await api.calculate(snapshot));emit({name:'refinement_estimate_requested',projectId:id});})}/>}
    </>}
    {section&&!d&&snapshot&&<Button label="Открыть раздел" onPress={()=>open(section)}/>}
    {d&&snapshot&&view==='apartment'&&<ApartmentForm value={drafts.apartment!.data} onChange={v=>change('apartment',v)} disabled={busy}/>}
    {d&&snapshot&&view==='rooms'&&(room?<RoomForm value={room} onChange={setRoom} disabled={busy}/>:<>
      <Notice>Распределено: {drafts.rooms!.data.rooms.reduce((sum,r)=>sum+(amount(r.areaM2)||0),0).toLocaleString('ru-RU')} из {snapshot.data.apartment.areaM2} м²{'\n'}
        Не распределено: {(Math.round((amount(snapshot.data.apartment.areaM2)-drafts.rooms!.data.rooms.reduce((sum,r)=>sum+(amount(r.areaM2)||0),0))*100)/100).toLocaleString('ru-RU')} м²</Notice>
      {drafts.rooms!.data.rooms.map(r=><View key={r.id} style={{gap:8}}><Card title={r.name} description={r.areaM2==null||r.areaM2===''?'Указать площадь →':`${r.areaM2} м² →`} onPress={()=>{setRoom(clone(r));setError('');}} disabled={busy}/>
        <Button label={`Удалить ${r.name}`} secondary disabled={busy} onPress={()=>removeRoom(r)}/></View>)}
      <Button label="+ Добавить" secondary disabled={busy} onPress={()=>setRoom(newRoom())}/>
    </>)}
    {d&&snapshot&&view==='kitchen'&&<>
      <Select label="Кухня" value={kitchenId} options={Object.fromEntries(snapshot.data.rooms.filter(r=>r.type==='kitchen').map(r=>[r.id,r.name]))} onChange={setKitchenId} disabled={busy}/>
      <Body>Площадь: {snapshot.data.rooms.find(r=>r.id===kitchenId)?.areaM2??'не указана'} м² · {choices.finishLevel[snapshot.project.finishLevel as keyof typeof choices.finishLevel]}</Body>
      {drafts.kitchen!.data[kitchenId]?<KitchenForm value={drafts.kitchen!.data[kitchenId]} equipped={snapshot.project.targetState!=='finish_only'} disabled={busy} onChange={v=>change('kitchen',{...drafts.kitchen!.data,[kitchenId]:v})}/>:<Body>Нет кухонь. Добавьте кухню в разделе «Помещения».</Body>}
    </>}
    {d&&view==='exteriors'&&<ExteriorsForm value={drafts.exteriors!.data} onChange={v=>change('exteriors',v)} disabled={busy}/>}
    {snapshot&&view==='compare'&&(snapshot.candidateEstimate&&snapshot.calculationStatus==='ready'?<>
      <Comparison old={snapshot.activeEstimate} next={snapshot.candidateEstimate}/>
      <Button label="Применить расчёт" disabled={busy||conflict} onPress={()=>run(async()=>{const result=await api.apply(snapshot);setSnapshot(result);emit({name:'refinement_estimate_applied',projectId:id});router.replace(`/project/${id}`);})}/>
      <Button secondary label="Уточнить ещё" onPress={()=>setView('menu')} disabled={busy}/>
    </>:<><Body>Актуальный расчёт пока не готов.</Body><Button label="К разделам" onPress={()=>setView('menu')}/></>)}
    <ErrorText message={error}/>
    {conflict&&<><Notice>Данные изменены в другом сеансе. Ваш ввод сохранён в форме.</Notice><Button secondary label="Загрузить актуальную версию, сохранив мой ввод" onPress={refreshConflict} disabled={busy}/></>}
    {section&&d&&<Button label={room?'Готово':busy?'Сохранение…':'Продолжить'} onPress={room?doneRoom:save} busy={busy} disabled={conflict}/>}
    {!!error&&!conflict&&view==='menu'&&<Button secondary label="Обновить состояние расчёта" onPress={load} disabled={busy}/>}
    <Button secondary label="Вернуться в проект" onPress={exit} disabled={busy}/>
    {confirmation&&<Confirm message={confirmation.message} onCancel={()=>setConfirmation(null)} onConfirm={()=>{confirmation.action();setConfirmation(null);}}/>}
  </Screen>;
}
