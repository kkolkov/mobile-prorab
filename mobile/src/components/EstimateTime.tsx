import {useState} from 'react';
import {Text,View,useWindowDimensions} from 'react-native';
import {Body,Heading,Button,palette} from './ui';
import {timeSummary,timeNumber} from '../core/time-summary';
import type {Estimate} from '../core/types';
export function EstimateTime({estimate}:{estimate:Estimate|null|undefined}){
 const [open,setOpen]=useState(false);
 const {width,fontScale}=useWindowDimensions();const narrow=width<700||fontScale>=1.4;
 const t=timeSummary(estimate);
 return <View style={{gap:12}}><Button secondary label={open?'Скрыть сроки выполнения работ':'Сроки выполнения работ'} onPress={()=>setOpen(!open)}/>{open&&(!t?<Body>Сроки пока не рассчитаны.</Body>:<>
  {t.groups.map(g=><View key={g.id} style={{gap:10}}><Heading>{g.title}</Heading>
   {!narrow&&<View style={{flexDirection:'row',gap:12}}><Text style={{width:'40%',color:palette.muted}}>Вид работ</Text><View style={{flex:1,flexDirection:'row',gap:8}}>{['Объём','Норматив, чел.-ч','Срок, раб. дн.'].map(label=><Text key={label} style={{flex:1,color:palette.muted}}>{label}</Text>)}</View></View>}
   {g.rows.map((r,i)=><View key={i} style={{flexDirection:narrow?'column':'row',gap:10,paddingVertical:10,borderBottomWidth:1,borderColor:palette.line}}>
    <Text style={{width:narrow?'100%':'40%',fontWeight:'600',fontSize:15,color:palette.ink}}>{r.title}</Text>
    {r.hours===null?<View style={{flex:1}}><Body>Учтено в итоге этапа; отдельный норматив не задан.</Body></View>:<View style={{flex:1,flexDirection:'row',gap:8}}>{[['Объём',`${timeNumber(r.quantity??0)} ${r.unit}`],['Чел.-ч',timeNumber(r.hours)],['Раб. дн.',`~${timeNumber(r.workDays??0)}`]].map(([label,value])=><View key={label} style={{flex:1,minWidth:0,gap:6}}>{narrow&&<Text style={{fontSize:12,color:palette.muted}}>{label}</Text>}<Text style={{fontSize:14,color:palette.ink}}>{value}</Text></View>)}</View>}
   </View>)}
   {!g.rows.length&&<Body>Работы по этапу не предусмотрены.</Body>}
   <Body>Итого по этапу: ~{g.days} календ. дн.</Body>
  </View>)}
  {t.pauses.map((p,i)=><Body key={i}>{p.title}: {p.days} дн.</Body>)}
  <Body>ИТОГО с учётом технологических пауз: ~{t.total}{t.max>t.total?`–${t.max}`:''} дн.</Body>
  {!t.consistent&&<Body>Сохранённый итог не совпадает с этапами. Пересчитайте оценку, чтобы обновить срок.</Body>}
  <Text style={{fontSize:12,lineHeight:18,color:palette.muted}}>В строках — рабочие дни: человеко-часы ÷ 16. Итоги этапов — календарные дни с учётом выходных и работ без отдельной нормы. Верхняя граница включает запас срока.</Text>
  <Text style={{fontSize:12,lineHeight:18,color:palette.muted}}>{t.explanation}</Text>
 </>)}</View>;
}
