import {Link} from 'expo-router';
import {timeSummary,timeNumber,timeExplanation} from '../core/time-summary';
import {useState} from 'react';
import {View} from 'react-native';
import {Body,Heading,Button} from './ui';
import {rub} from '../core/rules';
import type {Estimate} from '../core/types';

export function EstimateDetails({estimate}:{estimate:Estimate|null|undefined}){
 const [open,setOpen]=useState(false),[technical,setTechnical]=useState(false);
 const d=estimate?.details;
 if(!d)return null;
 return <View style={{gap:12}}>
  <Button secondary label={open?'Скрыть состав оценки':'Из чего складывается оценка'} onPress={()=>setOpen(!open)}/>
  {open&&<>
   <Body>Черновые материалы: {rub(d.roughMaterials)}{ '\n' }Чистовые материалы и оснащение: {rub(d.finishMaterials)}{ '\n' }Работы: {rub(d.labor)}</Body>
   <Body>Работы и материалы — по составу строк. Для укрупнённых ставок разделение оценочное. Суммы без резерва.</Body>
   <TimeDetails estimate={estimate}/>
   <Heading>Источники цен</Heading>
   <Body>Работы: загруженные прайсы и нормативные ориентиры. Прайс-листы Лемана ПРО — для сравнения; источник каждой ставки указан в подробностях.</Body>
   <Link href="https://lemanapro.ru/" style={{textDecorationLine:'underline'}}>Прайс-листы Лемана ПРО</Link>
   <Body>Материалы: усреднённые цены по городам России, открытые прайсы магазинов и нормативные ориентиры. Плановое обновление — раз в квартал, вручную; автоматическая актуализация не настроена.</Body>
   <Body>Нормативы времени: ГЭСН для работ, обеспеченных нормами.</Body>
   <Heading>Ограничения расчёта</Heading>
   <Body>Смета предварительная. Площади рассчитаны по геометрическим допущениям; точные объёмы подтверждаются после обмеров. Средние цены зависят от выбранных брендов и магазинов. Сроки рассчитаны для бригады из двух человек и включают рассчитанные технологические паузы.</Body>
   <Body>Не входят в расчёт: вывоз строительного мусора, доставка материалов и перепланировка. Сейчас эти расходы учитываются отдельно; выбор перепланировки в параметрах не добавляет её стоимость.</Body>
   <Button secondary label={technical?'Скрыть подробности расчёта':'Подробности расчёта'} onPress={()=>setTechnical(!technical)}/>
   {technical&&<>
   {d.lines.map((line,i)=><Body key={i}>{line.name}{'\n'}{line.quantity} {line.unit} × {rub(line.unitPriceRub)} × {line.coefficient} = {rub(line.amountRub)}</Body>)}
   <Body>Версия цен: {estimate.pricingVersion}. Алгоритм: {estimate.algorithmVersion}.</Body>
   <Heading>Источники ставок</Heading>{[...new Set(d.lines.map(l=>`${l.priceDate}: ${l.source}`))].map(text=><Body key={text}>{text}</Body>)}
   <Heading>Допущения расчёта</Heading>{estimate.assumptions.map((text,i)=><Body key={i}>• {text}</Body>)}
   <Heading>Пояснения к срокам</Heading>{(estimate.timePlan?.assumptions??[]).map((text,i)=><Body key={i}>• {text}</Body>)}
   </>}
  </>}
 </View>;
}

function TimeDetails({estimate}:{estimate:Estimate}){
 const plan=timeSummary(estimate);
 if(!plan)return <><Heading>Сроки по этапам</Heading><Body>Разбивка сроков не сохранена. Пересчитайте оценку, чтобы получить сроки по этапам.</Body></>;
 return <View style={{gap:12}}><Heading>Сроки по этапам</Heading><Body>{timeExplanation}</Body>
  {plan.groups.map(g=><View key={g.id} style={{gap:10}}><Heading>{g.title}</Heading>
   {g.rows.length?g.rows.map((r,i)=><View key={i}><Body>{r.title}</Body><Body>Объём: {timeNumber(r.quantity)} {r.unit}</Body>
    {r.norm==null?<Body>Отдельная норма и срок не рассчитаны; учтено в сроке этапа.</Body>:<>
     <Body>Норма: {timeNumber(r.norm)} чел.-ч / 100 м² · Трудозатраты: {timeNumber(r.hours!)} чел.-ч</Body>
     <Body>Срок работы: {timeNumber(r.workDays!)} рабочих дн.</Body></>}
   </View>):<Body>{g.days?'Подробные трудозатраты не рассчитаны. Срок включает монтаж и уборку по сохранённому плану.':'Работы этого этапа не предусмотрены.'}</Body>}
   <Body>Итого по этапу: {g.days} календарных дн.</Body>
  </View>)}
  {plan.pauses.map((p,i)=><Body key={i}>{p.title}: {p.days} календарных дн.</Body>)}
  <Heading>{plan.consistent?`Общий срок с паузами: ${plan.total} календарных дн.`:'Для общего срока пересчитайте оценку: сохранённый итог не совпадает с этапами.'}</Heading>
  <Body>Дни отдельных работ — рабочие, по 16 человеко-часов в день. Итоги этапов — календарные: учитывают выходные, округление и работы без отдельных норм. Финишный монтаж и уборка включены в чистовой этап. Общий срок — сумма этапов и пауз; верхняя граница оценки содержит дополнительный запас.</Body>
 </View>;
}
