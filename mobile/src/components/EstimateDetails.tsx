import {useState} from 'react';
import {View} from 'react-native';
import {Body,Heading,Button} from './ui';
import {rub} from '../core/rules';
import type {Estimate} from '../core/types';

export function EstimateDetails({estimate}:{estimate:Estimate|null|undefined}){
 const [open,setOpen]=useState(false);
 const d=estimate?.details;
 if(!d)return null;
 return <View style={{gap:12}}>
  <Button secondary label={open?'Скрыть состав оценки':'Из чего складывается оценка'} onPress={()=>setOpen(!open)}/>
  {open&&<>
   <Body>Черновые материалы: {rub(d.roughMaterials)}{ '\n' }Чистовые материалы и оснащение: {rub(d.finishMaterials)}{ '\n' }Работы: {rub(d.labor)}</Body>
   <Body>Разделение по условным долям справочника. Суммы без резерва.</Body>
   {d.lines.map((line,i)=><Body key={i}>{line.name}{'\n'}{line.quantity} {line.unit} × {rub(line.unitPriceRub)} × {line.coefficient} = {rub(line.amountRub)}</Body>)}
   <Body>Версия цен: {estimate.pricingVersion}. Алгоритм: {estimate.algorithmVersion}.</Body>
   <Heading>Источники ставок</Heading>{[...new Set(d.lines.map(l=>`${l.priceDate}: ${l.source}`))].map(text=><Body key={text}>{text}</Body>)}
   <Heading>Допущения расчёта</Heading>{estimate.assumptions.map((text,i)=><Body key={i}>• {text}</Body>)}
  </>}
 </View>;
}
