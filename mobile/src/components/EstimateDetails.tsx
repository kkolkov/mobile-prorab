import {useState} from 'react';
import {Link} from 'expo-router';
import {EstimateSummary} from './EstimateSummary';
import {EstimateTime} from './EstimateTime';
import {View} from 'react-native';
import {Body,Heading,Button} from './ui';
import {rub} from '../core/rules';
import type {Estimate} from '../core/types';

function EstimateAdditional(){return <>
   <Heading>Источники цен</Heading>
   <Body>Работы: прайс-листы <Link href="https://lemanapro.ru/uslugi/?utm_referrer=https%3A%2F%2Fwww.google.com%2F" style={{textDecorationLine:'underline'}}>Лемана ПРО</Link> (актуальны на октябрь 2026).</Body>
   <Body>Материалы: средние рыночные цены по России (на основе открытых данных строительных магазинов, обновление раз в квартал).</Body>
   <Body>Нормативы времени: ГЭСН (государственные сметные нормы).</Body>
   <Heading>Ограничения расчета</Heading>
   <Body>Расчет является предварительным и ориентировочным. Он основан на усредненных рыночных ценах и типовых нормах расхода материалов.</Body>
   <Body>Скрытые работы: расчет не включает стоимость вывоза строительного мусора, доставку материалов и возможные перепланировки (если они не выбраны в параметрах).</Body>
   <Body>Точность площади: площади стен и потолков рассчитаны по геометрическим формулам с учетом типовой высоты потолков (2.7 м) и стандартного процента проемов. Точный объем работ определяется после обмеров на объекте.</Body>
   <Body>Материалы: в смету заложены средние цены на материалы. Итоговая стоимость зависит от конкретных брендов и магазинов, которые вы выберете в процессе.</Body>
   <Body>Сроки: расчет предполагает работу бригады из 2 человек. Технологические паузы на высыхание смесей включены.</Body>
 </>;}

export function EstimateDetails({estimate,compact=false}:{estimate:Estimate|null|undefined;compact?:boolean}){
 const [open,setOpen]=useState(false),[costOpen,setCostOpen]=useState(false);
 const d=estimate?.details;
 if(compact)return <View style={{gap:12}}>
  <Button secondary label={costOpen?'Состав оценки ▴':'Состав оценки ▾'} onPress={()=>setCostOpen(!costOpen)}/>
  {costOpen&&<EstimateSummary estimate={estimate} showHeading={false}/>}
  <EstimateTime estimate={estimate}/>
  <Button secondary label={open?'Дополнительно ▴':'Дополнительно ▾'} onPress={()=>setOpen(!open)}/>
  {open&&<EstimateAdditional/>}
 </View>;
 if(!d)return null;
 return <View style={{gap:12}}>
  <Button secondary label={open?'Скрыть состав оценки':'Из чего складывается оценка'} onPress={()=>setOpen(!open)}/>
  {open&&<>
   <Body>Черновые материалы: {rub(d.roughMaterials)}{ '\n' }Чистовые материалы и оснащение: {rub(d.finishMaterials)}{ '\n' }Работы: {rub(d.labor)}</Body>
   <Body>Работы и материалы — по составу строк. Для укрупнённых ставок разделение оценочное. Суммы без резерва.</Body>
   {d.lines.map((line,i)=><Body key={i}>{line.name}{'\n'}{line.quantity} {line.unit} × {rub(line.unitPriceRub)} × {line.coefficient} = {rub(line.amountRub)}</Body>)}
   <Body>Версия цен: {estimate.pricingVersion}. Алгоритм: {estimate.algorithmVersion}.</Body>
   {!!estimate.timePlan?.workloads?.length&&<><Heading>Трудозатраты по нормам</Heading><Body>Только работы, для которых есть нормы. Бригада: 2 человека по 8 часов.</Body>{estimate.timePlan.workloads.map(w=><Body key={w.code}>{w.title}: {w.quantityM2} м² × {w.personHoursPer100m2} / 100 = {w.personHours.toFixed(2)} чел.-ч</Body>)}</>}
   <EstimateAdditional/>
  </>}
 </View>;
}
