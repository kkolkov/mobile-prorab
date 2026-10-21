import {useCallback,useRef,useState} from 'react';
import {View,ScrollView,Text} from 'react-native';
import {router,useLocalSearchParams,useFocusEffect} from 'expo-router';
import * as Crypto from 'expo-crypto';
import {api,request} from '../../core/api';
import {rub} from '../../core/rules';
import {Screen,Body,Heading,Notice,Button,Field,Select,Grid,Metric,ErrorText,palette} from '../../components/ui';
import {EstimateDetails} from '../../components/EstimateDetails';
import type {Execution,Expense} from '../../execution/types';
const categories={rough:'Черновые материалы',finish:'Чистовые материалы и оснащение',labor:'Работы',extra:'Дополнительные расходы'};
const statuses={planned:'В планах',in_progress:'В процессе',completed:'Завершён'};
const date=(s:string|null)=>s?s.split('-').reverse().join('.'):'—';
const day=(s:string)=>Date.parse(s+'T00:00:00Z')/86400000;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
type Form={version?:number;action:string;caption:string;expenseId?:string;estimateId?:string;title?:string;amount?:string;category?:string;date?:string;taskId?:string;days?:string;reason?:string};
const drafts=new Map<string,Form>();
export default function ExecutionScreen(){
 const {id,tab:initial}=useLocalSearchParams<{id:string;tab?:string}>();
 const [s,setSnapshot]=useState<Execution|null>(null),[tab,setTab]=useState(initial??'schedule'),[form,setForm]=useState<Form|null>(drafts.get(id)??null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[diagram,setDiagram]=useState(true),[history,setHistory]=useState(false);
 const lock=useRef(false);const scroll=useRef<ScrollView>(null);
 function change(f:Form|null){if(f&&(!form||f.action!==form.action||f.expenseId!==form.expenseId))setTimeout(()=>scroll.current?.scrollTo({y:0,animated:true}),0);if(f&&f.version===undefined&&s)f={...f,version:s.version};setForm(f);if(f)drafts.set(id,f);else drafts.delete(id);}
 const load=useCallback(async()=>{try{setSnapshot(await request<Execution>(`/projects/${id}/execution`));setError('');setConflict(false);}catch(e){setError((e as Error).message);}},[id]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();setConflict(false);}catch(e){setError((e as Error).message);setConflict((e as {status?:number}).status===409);}finally{lock.current=false;setBusy(false);}}
 function expense(taskId?:string,e?:Expense){change({action:e?'edit-expense':'expense',caption:e?'Изменить расход':'Новый расход',expenseId:e?.id??Crypto.randomUUID(),title:e?.title??'',amount:e?String(e.amount):'',category:e?.category??'rough',date:e?.date??today(),taskId:e?.taskId??taskId??''});}
 async function save(){if(!s||!form)return;const f=form;await run(async()=>{const result=await request<Execution>(`/projects/${id}/execution/${f.action}`,{...f,version:f.version,title:f.title?.trim(),amount:f.amount===undefined?null:Number(f.amount.replace(',','.')),days:f.days===undefined?null:Number(f.days),taskId:f.taskId||null});setSnapshot(result);change(null);});}
 const input=(key:keyof Form,label:string,numeric=false)=><Field label={label} value={form?.[key]??''} onChange={v=>change({...form!,[key]:v})} disabled={busy} numeric={numeric} scale={key==='amount'?2:1} maxLength={key==='reason'?500:160}/>;
 const tasks=s?.data.tasks??[];const chartWidth=Math.max(500,Math.ceil((s?.totalDays??1)/7)*64);
 return <Screen scrollRef={scroll} title={tab==='schedule'?'График работ':'Финансовый трекер'} back={()=>router.replace(`/project/${id}`)}>
  <Grid><Button label="График" secondary={tab!=='schedule'} onPress={()=>setTab('schedule')} disabled={busy}/><Button label="Финансы" secondary={tab!=='finance'} onPress={()=>setTab('finance')} disabled={busy}/></Grid>
  {s?.newerEstimate&&<Notice>В проекте применена новая смета.<Button label="Обновить план из сметы" secondary disabled={busy} onPress={()=>void run(async()=>{const p=await api.get(id);change({action:'sync',caption:'Обновить план',estimateId:p.estimateDetails?.id});})}/></Notice>}
  {form&&<View style={{padding:18,borderRadius:16,backgroundColor:palette.sand,gap:12}}><Heading>{form.caption}</Heading>
   {['expense','edit-expense'].includes(form.action)&&<>{input('title','Название расхода')}{input('amount','Сумма, ₽',true)}<Select label="Категория" value={form.category??'rough'} options={categories} onChange={v=>change({...form,category:v})} disabled={busy}/>{input('date','Дата расхода (ГГГГ-ММ-ДД)')}<Select label="Этап ремонта" value={form.taskId??''} options={{'':'Без привязки',...Object.fromEntries(tasks.map(t=>[t.id,t.title]))}} onChange={v=>change({...form,taskId:v})} disabled={busy}/></>}
   {['start','reschedule'].includes(form.action)&&input('date','Дата начала ремонта (ГГГГ-ММ-ДД)')}
   {form.action==='shift'&&<>{input('days','Добавить дней',true)}{input('reason','Причина переноса — необязательно')}</>}
   {form.action==='complete'&&<>{input('date','Дата завершения этапа (ГГГГ-ММ-ДД)')}{input('reason','Комментарий — необязательно')}</>}
   {form.action==='remove-expense'&&<Body>Удалить этот расход из фактических затрат?</Body>}
   {form.action==='sync'&&<Body>Обновить план бюджета? Расходы и начатый график сохранятся. Новые сроки можно учесть переносом этапов.</Body>}
   <Button label="Сохранить" disabled={busy} onPress={()=>void save()}/><Button label="Отмена" secondary disabled={busy} onPress={()=>change(null)}/>
  </View>}
  {s&&tab==='schedule'&&<>
   {!s.data.startDate?<>{s.scheduleAvailable?<><Body>Выберите дату начала. Этапы взяты из применённой сметы.</Body><Button label="Задать начало ремонта" disabled={busy} onPress={()=>change({action:'start',caption:'Начало ремонта',date:today()})}/></>:<Notice>Для этой сметы график ещё не рассчитан. Повторите расчёт в уточнении, примените его и обновите план здесь.</Notice>}</>:<>
    <Grid><Metric label="Прогноз завершения" value={date(s.forecastEnd)}/><Metric label="Готово этапов" value={s.progressPercent+'%'} tone="lavender"/></Grid>
    <Body>Прогресс — доля завершённых этапов. Дни календарные, сроки ориентировочные. Технологическую паузу нужно сверять с материалами и условиями.</Body>
    <Button label={diagram?'Показать списком':'Показать диаграмму'} secondary onPress={()=>setDiagram(!diagram)}/>
    {diagram&&<ScrollView horizontal accessibilityLabel="График работ"><View style={{width:chartWidth+240,gap:12,paddingVertical:16}}>
     <View style={{marginLeft:240,height:24}}>{Array.from({length:Math.ceil(s.totalDays/7)},(_,i)=><Text key={i} style={{position:'absolute',left:i*7/s.totalDays*chartWidth,fontSize:10,color:palette.muted}}>{date(new Date((day(s.data.startDate!)+i*7)*86400000).toISOString().slice(0,10)).slice(0,5)}</Text>)}</View>
     {tasks.map(t=><View key={t.id} style={{flexDirection:'row',alignItems:'center'}}><Text style={{width:240,color:palette.ink}}>{t.title}</Text><View style={{width:chartWidth,height:40,backgroundColor:palette.sage}}><View style={{position:'absolute',left:(day(t.startDate)-day(s.data.startDate!))/s.totalDays*chartWidth,width:Math.max(24,t.durationDays/s.totalDays*chartWidth),height:40,borderRadius:8,backgroundColor:t.status==='completed'?'#bcd5bf':t.status==='in_progress'?'#f0dca9':'#d8d3e8',justifyContent:'center'}}><Text style={{fontSize:12,color:palette.ink}}>{t.durationDays} дн.</Text></View></View></View>)}
    </View></ScrollView>}
    {tasks.map(t=><View key={t.id} style={{padding:18,borderWidth:1,borderColor:palette.line,borderRadius:16,gap:10}}><Heading>{t.title}</Heading><Body>{statuses[t.status]} · {date(t.startDate)} — {date(t.endDate)}{'\n'}Первоначально: {date(t.baselineStart)} — {date(t.baselineEnd)}{'\n'}Потрачено на этап: {rub(s.data.expenses.filter(e=>e.taskId===t.id).reduce((n,e)=>n+e.amount,0))}</Body>
     {t.status==='in_progress'&&<Button label="Завершить этап" disabled={busy} onPress={()=>change({action:'complete',caption:'Завершение этапа',taskId:t.id,date:today(),reason:''})}/>}
     {t.status!=='completed'&&<Button label="Изменить дату начала" secondary disabled={busy} onPress={()=>change({action:'reschedule',caption:'Изменить дату начала этапа',taskId:t.id,date:t.startDate})}/>}
     {t.status!=='completed'&&<Button label="Продлить этап" secondary disabled={busy} onPress={()=>change({action:'shift',caption:'Перенос этапа',taskId:t.id,days:'3',reason:''})}/>}
     <Button label="Добавить расход" secondary disabled={busy} onPress={()=>expense(t.id)}/>
    </View>)}
   </>}
  </>}
  {s&&tab==='finance'&&<>
   <Grid><Metric label="План по смете" value={rub(s.planBudget)}/><Metric label="Потрачено" value={rub(s.spentTotal)} tone="lavender"/><Metric label={(s.remainingBudget??0)<0?'Перерасход плана':'Осталось по плану'} value={rub(s.remainingBudget===null?null:Math.abs(s.remainingBudget))}/></Grid>
   <View accessibilityLabel="Использовано бюджета" style={{height:12,backgroundColor:palette.line,borderRadius:6}}><View style={{height:12,borderRadius:6,width:`${Math.min(100,s.planBudget?s.spentTotal/s.planBudget*100:0)}%`,backgroundColor:(s.remainingBudget??0)<0?'#b3261e':palette.accent}}/></View>
   <Body>Бюджет с резервом: {rub(s.budgetWithReserve)}. Остаток с резервом: {rub(s.remainingWithReserve)}.</Body><Body>План — расчётная стоимость применённой сметы. Расходы не изменяют смету и не означают завершение работ.</Body>
   {s.categories.map(c=><Notice key={c.code}>{c.title}{'\n'}{rub(c.spent)} из {rub(c.plan)}</Notice>)}
   <Button label="Добавить расход" disabled={busy} onPress={()=>expense()}/><Heading>История расходов</Heading>
   {!s.data.expenses.length&&<Body>Пока нет расходов.</Body>}
   {s.data.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(e=><View key={e.id} style={{gap:10,paddingVertical:16,borderBottomWidth:1,borderBottomColor:palette.line}}><Heading>{e.title}</Heading><Body>{date(e.date)} · {categories[e.category as keyof typeof categories]}{'\n'}{rub(e.amount)}{e.taskId?' · '+tasks.find(t=>t.id===e.taskId)?.title:''}</Body><Grid><Button label="Изменить" secondary disabled={busy} onPress={()=>expense(undefined,e)}/><Button label="Удалить" secondary disabled={busy} onPress={()=>change({action:'remove-expense',caption:'Удаление расхода',expenseId:e.id})}/></Grid></View>)}
  </>}
  {s&&<><EstimateDetails estimate={s.data.budget}/><Button label={history?'Скрыть историю изменений':'История изменений'} secondary onPress={()=>setHistory(!history)}/>{history&&s.data.history.slice().reverse().map((e,i)=><Body key={i}>{date(e.at.slice(0,10))} · {e.message}</Body>)}</>}
  <ErrorText message={error}/>{conflict?<Button label="Обновить данные, сохранив ввод" disabled={busy} onPress={()=>void run(async()=>{const fresh=await request<Execution>(`/projects/${id}/execution`);setSnapshot(fresh);if(form)change({...form,version:fresh.version});})}/>:!!error&&!s&&<Button label="Повторить" onPress={()=>void load()}/>}
 </Screen>;
}
