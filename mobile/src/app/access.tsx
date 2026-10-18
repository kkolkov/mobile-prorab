import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ApiError } from '../core/http';
import { api } from '../core/api';
import { Screen, Body, Button, Notice, ErrorText } from '../components/ui';
import { Questionnaire } from '../onboarding/Questionnaire';
import { emptyAnswers, questionnaireVersion, questionnaireTitle, questionnaireSubtitle, type Answers } from '../onboarding/questions';
import { questionnaireDrafts, type Access } from '../onboarding/access';
export default function AccessScreen(){
 const {next}=useLocalSearchParams<{next?:string}>();
 const [access,setAccess]=useState<Access|null>(null),[answers,setAnswers]=useState<Answers>(emptyAnswers),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const lock=useRef(false);
 const [retry,setRetry]=useState(0);
 const leave=useCallback(()=>{if(next&&/^[2-6]$/.test(next))router.replace(`/wizard/${Number(next)}`);else router.replace('/');},[next]);
 useEffect(()=>{
  let alive=true;
  api.access().then(async a=>{
   if(!alive)return;
   if(next&&!a.questionnaireRequired&&a.offerShown){leave();return;}
   if(a.questionnaireRequired)a=await api.accessAction('view');else void api.accessAction('offer').catch(()=>{});
   if(alive){setAccess(a);setAnswers(questionnaireDrafts.get(a.firstProjectId)??emptyAnswers());}
  }).catch(e=>{
   if(!alive)return;
   if(e instanceof ApiError&&e.status===404&&next){leave();return;}
   setError((e as Error).message);
  }).finally(()=>{if(alive)setBusy(false);});
  return ()=>{alive=false;};
 },[next,leave,retry]);
 async function run(action:string,body:unknown={}){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{setAccess(await api.accessAction(action,body));if(action==='answers')void api.accessAction('offer').catch(()=>{});}
  catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 if(!access)return <Screen title="Доступ к приложению" busy={busy} back={leave}><ErrorText message={error}/>{busy?<Body>Загрузка…</Body>:<Button label="Повторить" onPress={()=>{setBusy(true);setError('');setRetry(n=>n+1);}}/>}</Screen>;
 if(access.questionnaireRequired)return <Screen title={questionnaireTitle} subtitle={questionnaireSubtitle} busy={busy} back={()=>next?router.replace('/wizard/1'):router.replace('/')}>
  <Questionnaire answers={answers} busy={busy} error={error} onChange={value=>{questionnaireDrafts.set(access.firstProjectId,value);setAnswers(value);}}
   onContinue={()=>run('answers',{...answers,questionnaireVersion})}/>
 </Screen>;
 const active=access.fullAccess,trial=access.trialEligible;
 return <Screen title={active?'Полная версия активна':trial?'Попробуйте полную версию бесплатно':'Полная версия приложения'} busy={busy}>
  <Body>{active?(access.freemiumEndsAt?`Пробный доступ до ${new Date(access.freemiumEndsAt).toLocaleString('ru-RU')}.`:'Подписка подключена.'):
   trial?'Откройте все возможности приложения на 7 дней. Отсчёт начнётся после нажатия кнопки.':
   access.freemiumStartedAt?'Пробный период завершён. Калькулятор и оценка ремонта остаются доступны.':'Калькулятор и оценка ремонта доступны бесплатно. Полная версия открывает дополнительные инструменты проекта.'}</Body>
  {!active&&(trial?<Notice>Бесплатно на 7 дней. Автоматического списания денег нет.</Notice>:<Notice>Оформление подписки пока недоступно. Цена и условия появятся здесь перед оплатой.</Notice>)}
  <ErrorText message={error}/>
  {!active&&<Button label={trial?'Начать 7 дней бесплатно':'Оформить подписку'} disabled={!trial} busy={busy} onPress={()=>run('trial')}/>}
  <Button secondary label={active?'Продолжить':trial?'Позже':'Продолжить с калькулятором'} disabled={busy} onPress={leave}/>
 </Screen>;
}
