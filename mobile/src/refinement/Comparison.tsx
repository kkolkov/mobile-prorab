import {EstimateDetails} from '../components/EstimateDetails';
import { View } from 'react-native';
import { Heading, Body, Notice } from '../components/ui';
import { rub } from '../core/rules';
import type { Estimate, Totals } from '../core/types';

export function Comparison({old,next}:{old:Estimate|null;next:Estimate}) {
  const groups:[string,Totals|null|undefined,Totals|null][]=[['Общая сумма',old?.total,next.total],['Ремонт',old?.repair,next.repair],['Кухня и техника',old?.kitchen,next.kitchen]];
  const metrics:[keyof Totals,string][]=[['min','Минимум'],['max','Максимум'],['expected','Ожидаемая сумма'],['withReserve','Бюджет с резервом']];
  return <>{groups.map(([label,a,b])=><View key={label} style={{gap:12}}><Heading>{label}</Heading>
    {metrics.map(([key,title])=><Notice key={key}>{title}{'\n'}Текущая: {rub(a?.[key])}{'\n'}Уточнённая: {rub(b?.[key])}{'\n'}Разница: {a&&b?rub(b[key]-a[key]):'Нет данных'}</Notice>)}
  </View>)}<Body>В составе ремонта: балкон {rub(next.balconyIncluded)}, лоджия {rub(next.loggiaIncluded)}. Повторно к итогу не прибавляются.</Body>
    <Body>Срок ремонта сохраняется: калькулятор стоимости не рассчитывает длительность.</Body>
    <EstimateDetails estimate={next}/><Heading>Причины изменения</Heading>{next.reasons.map((text,i)=><Body key={i}>• {text}</Body>)}
    {old&&(old.pricingVersion!==next.pricingVersion||old.algorithmVersion!==next.algorithmVersion)&&<Notice>Изменилась версия цен или алгоритма.</Notice>}
    <Body>Цены: {next.pricingVersion}. Алгоритм: {next.algorithmVersion}.</Body>
    <Heading>Допущения</Heading>{[...new Set([...(old?.assumptions??[]),...next.assumptions])].map((text,i)=><Body key={i}>• {text}</Body>)}
  </>;
}
