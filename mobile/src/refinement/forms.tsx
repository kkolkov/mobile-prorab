import { choices } from '../core/choices';
import { Body, Grid, Check, Field, Heading, Select, Button } from '../components/ui';
import type { Apartment, Exterior, Kitchen, Room, SectionData } from '../core/types';
import { numberError } from '../core/rules';

type Props<T>={value:T;onChange:(next:T)=>void;disabled:boolean};
const labels={floor:'Пол',walls:'Стены',ceiling:'Потолок',doors:'Межкомнатные двери',demolition:'Демонтаж отделки',wallPreparation:'Подготовка стен',floorPreparation:'Подготовка пола',electrical:'Электрика'};
export function ApartmentForm({value:a,onChange,disabled}:Props<Apartment>) {
  return <>
    <Grid>{(['currentState','targetState','finishLevel'] as const).map((key,i)=><Select key={key} label={['Исходное состояние','Целевое состояние','Уровень ремонта'][i]} value={a[key]} options={choices[key]} onChange={v=>onChange({...a,[key]:v})} disabled={disabled}/>)}</Grid>
    <Field label="Площадь квартиры, м² — без балкона и лоджии" value={a.areaM2} onChange={v=>onChange({...a,areaM2:v})} numeric required disabled={disabled}/>
    <Field label="Высота потолков, м" value={a.ceilingHeight} onChange={v=>onChange({...a,ceilingHeight:v})} numeric scale={2} min={2} max={5} disabled={disabled} placeholder="Пусто — норматив калькулятора"/>
    <Heading>Общая отделка</Heading><Body>Для комнат, кухни и коридора. Индивидуальная отделка имеет приоритет. Санузлы используют отдельные нормативы.</Body>
    <Grid>{(['floor','walls','ceiling','doors'] as const).map(key=><Select key={key} label={labels[key]} value={a[key]} options={choices[key]} onChange={v=>onChange({...a,[key]:v})} disabled={disabled}/>)}</Grid>
    <Heading>Работы</Heading>
    <Grid>{(['demolition','wallPreparation','floorPreparation','electrical'] as const).map(key=><Select key={key} label={labels[key]} value={a[key]} options={choices[key]} onChange={v=>onChange({...a,[key]:v})} disabled={disabled}/>)}</Grid>
  </>;
}
export function RoomForm({value:r,onChange,disabled}:Props<Room>) {
  const inherit=['combined_bathroom','bathroom','toilet'].includes(r.type)?'Норматив санузла':['living','kitchen','corridor'].includes(r.type)?'Наследовать общую отделку':'Норматив помещения';
  return <><Select label="Тип помещения" value={r.type} options={choices.type} onChange={v=>onChange({...r,type:v})} disabled={disabled}/>
    <Field label="Название помещения" value={r.name} onChange={v=>onChange({...r,name:v})} disabled={disabled}/>
    <Field label="Площадь помещения, м²" value={r.areaM2} onChange={v=>onChange({...r,areaM2:v})} numeric disabled={disabled}/>
    {(['floor','walls','ceiling'] as const).map(key=><Select key={key} label={labels[key]} value={r[key]} options={{inherit,...choices[key]}} onChange={v=>onChange({...r,[key]:v})} disabled={disabled}/>)}
  </>;
}
export function KitchenForm({value:k,onChange,disabled,equipped}:Props<Kitchen>&{equipped:boolean}) {
  const stoveSelected=k.stove===null?equipped:k.stove!=='none';
  return <><Select label="Гарнитур" value={k.cabinets} options={choices.cabinets} onChange={v=>onChange({...k,cabinets:v})} disabled={disabled}/>
    {k.cabinets==='new'&&<><Field label="Длина вдоль стен, м · необязательно" value={k.lengthM} numeric disabled={disabled} onChange={v=>onChange({...k,lengthM:v})}/>
      <Select label="Фасады" value={k.facade} options={choices.facade} onChange={v=>onChange({...k,facade:v})} disabled={disabled}/>
      <Select label="Столешница" value={k.countertop} options={choices.countertop} onChange={v=>onChange({...k,countertop:v})} disabled={disabled}/></>}
    <Heading>Техника к покупке</Heading><Body>Снятый флажок — отказ от покупки. До ручного выбора действует норматив целевого состояния.</Body>
    <Check label="Плита / варочная панель" value={k.stove===null?null:stoveSelected} fallback={equipped} onChange={v=>onChange({...k,stove:v?'hob':'none'})} disabled={disabled}/>
    {stoveSelected&&<Select label="Вид плиты" value={k.stove??'hob'} options={{hob:'Варочная панель',cooker:'Плита со встроенной духовкой'}} onChange={v=>onChange({...k,stove:v})} disabled={disabled}/>}
    {k.stove==='cooker'?<Body>Встроенная духовка включена в плиту. Повторно не начисляется.</Body>:<Check label="Отдельный духовой шкаф" value={k.oven} fallback={equipped} onChange={v=>onChange({...k,oven:v})} disabled={disabled}/>}
    {(['refrigerator','hood','dishwasher'] as const).map((key,i)=><Check key={key} label={['Холодильник','Вытяжка','Посудомоечная машина'][i]} value={k[key]} fallback={equipped} onChange={v=>onChange({...k,[key]:v})} disabled={disabled}/>)}
    <Button secondary label="Вернуть нормативный комплект техники" disabled={disabled} onPress={()=>onChange({...k,stove:null,oven:null,refrigerator:null,hood:null,dishwasher:null})}/>
  </>;
}
function ExteriorForm({value:e,onChange,disabled,kind}:Props<Exterior>&{kind:'balcony'|'loggia'}) {
  return <><Heading>{kind==='balcony'?'Балкон':'Лоджия'}</Heading><Field label={`Площадь ${kind==='balcony'?'балкона':'лоджии'}, м²`} value={e.areaM2} numeric onChange={v=>onChange({...e,areaM2:v})} disabled={disabled}/>
    <Body>Не входит в площадь квартиры. Если поле пусто, расчёт использует {kind==='balcony'?'3,0':'4,5'} м².</Body>
    {(['glazing','insulation','floor','walls','ceiling'] as const).map((key,i)=><Select key={key} label={['Остекление','Утепление','Пол','Стены','Потолок'][i]} value={e[key]}
      options={key==='ceiling'?{none:'Не требуется',required:'Выполнить, материал пока не выбран',...choices.ceiling}:choices[key]} onChange={v=>onChange({...e,[key]:v})} disabled={disabled}/>)}
    <Check label="Освещение" value={e.lighting} fallback onChange={v=>onChange({...e,lighting:v})} disabled={disabled}/>
    <Check label="Розетки" value={e.sockets} fallback onChange={v=>onChange({...e,sockets:v})} disabled={disabled}/>
  </>;
}
export function ExteriorsForm({value:e,onChange,disabled}:Props<SectionData['exteriors']>) {
  return <><Select label="Нужен ремонт?" value={e.presence==='none'?'no':'yes'} options={{yes:'Да',no:'Нет'}} onChange={v=>onChange({...e,presence:v==='no'?'none':'balcony'})} disabled={disabled}/>
    {e.presence!=='none'&&<Select label="Что нужно отремонтировать?" value={e.presence} options={{balcony:'Балкон',loggia:'Лоджия',both:'Оба'}} onChange={v=>onChange({...e,presence:v})} disabled={disabled}/> }
    {(['balcony','loggia'] as const).filter(key=>e.presence===key||e.presence==='both').map(key=><ExteriorForm key={key} kind={key} value={e[key]} onChange={v=>onChange({...e,[key]:v})} disabled={disabled}/>)}</>;
}
export function roomError(room:Room) {
  return !room.name.trim()?'Укажите название помещения':numberError(room.areaM2);
}
export function sectionError<K extends keyof SectionData>(key:K,value:SectionData[K]):string {
  if(key==='apartment') {
    const a=value as Apartment;
    return numberError(a.areaM2,true)||numberError(a.ceilingHeight,false,2,2,5);
  }
  if(key==='rooms') return (value as SectionData['rooms']).rooms.map(roomError).find(Boolean)??'';
  if(key==='kitchen') return Object.values(value as SectionData['kitchen']).filter(k=>k.cabinets==='new').map(k=>numberError(k.lengthM)).find(Boolean)??'';
  const e=value as SectionData['exteriors'];
  return (['balcony','loggia'] as const).filter(k=>e.presence===k||e.presence==='both').map(k=>numberError(e[k].areaM2)).find(Boolean)??'';
}
