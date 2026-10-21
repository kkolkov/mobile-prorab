import {EstimateDetails} from '../components/EstimateDetails';
import { View } from 'react-native';
import { Heading, Body, Notice } from '../components/ui';
import { rub } from '../core/rules';
import type { Estimate, Totals } from '../core/types';

export function Comparison({old,next}:{old:Estimate|null;next:Estimate}) {
  const groups:[string,Totals|null|undefined,Totals|null][]=[['Общая сумма',old?.total,next.total],['Ремонт',old?.repair,next.repair],['Кухня и техника',old?.kitchen,next.kitchen]];
  const metrics:[keyof Totals,string][]=[['min','Минимум'],['max','Максимум'],['expected','Расчётная стоимость'],['withReserve','Бюджет с резервом']];
  const value=(totals:Totals|null|undefined,key:keyof Totals)=>totals?(key==='withReserve'?Math.round(totals.max*1.1):totals[key]):null;
  return <><Body>Бюджет с резервом — максимум + 10% на непредвиденные расходы. Это правило применяется к обеим колонкам, включая старые оценки. Сохранённая смета изменится только после применения расчёта.</Body>{groups.map(([label,a,b])=><View key={label} style={{gap:12}}><Heading>{label}</Heading>
    {metrics.map(([key,title])=><Notice key={key}>{title}{'\n'}Текущая: {rub(value(a,key))}{'\n'}Уточнённая: {rub(value(b,key))}{'\n'}Разница: {a&&b?rub(value(b,key)!-value(a,key)!):'Нет данных'}</Notice>)}
  </View>)}<Body>В составе ремонта: балкон {rub(next.balconyIncluded)}, лоджия {rub(next.loggiaIncluded)}. Повторно к итогу не прибавляются.</Body>
    <Body>Новый расчёт включает ориентировочный срок по этапам. Он применяется вместе со сметой; начатый график сохраняет фактический ход работ.</Body>
    <EstimateDetails estimate={next}/><Heading>Причины изменения</Heading>{next.reasons.map((text,i)=><Body key={i}>• {text}</Body>)}
    {old&&(old.pricingVersion!==next.pricingVersion||old.algorithmVersion!==next.algorithmVersion)&&<Notice>Изменилась версия цен или алгоритма.</Notice>}
    <Body>Цены: {next.pricingVersion}. Алгоритм: {next.algorithmVersion}.</Body>
    <Heading>Допущения</Heading>{[...new Set([...(old?.assumptions??[]),...next.assumptions])].map((text,i)=><Body key={i}>• {text}</Body>)}
  </>;
}
