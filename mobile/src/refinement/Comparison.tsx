import {EstimateDetails} from '../components/EstimateDetails';
import {Text,View,useWindowDimensions} from 'react-native';
import {Body,palette} from '../components/ui';
import {rub} from '../core/rules';
import type {Estimate} from '../core/types';
export function Comparison({old,next}:{old:Estimate|null;next:Estimate}){
 const {width}=useWindowDimensions();const narrow=width<640;
 return <><Body>Параметры изменились. Ниже указана новая стоимость. Текущая смета останется прежней, пока вы не подтвердите изменения.</Body>
 <View style={{gap:12}}>{!narrow&&<View style={{flexDirection:'row'}}>{['Показатель','Было','Стало','Разница'].map(t=><Text key={t} style={{flex:1,color:palette.muted}}>{t}</Text>)}</View>}
 {([['expected','Расчетная стоимость'],['withReserve','Бюджет с резервом']] as const).map(([key,label])=>{
  const a=old?.total?.[key],b=next.total?.[key],diff=a==null||b==null?null:b-a;
  return <View key={key} style={{flexDirection:narrow?'column':'row',gap:12,paddingVertical:12,borderBottomWidth:1,borderColor:palette.line}}><View style={narrow?undefined:{flex:1}}><Body>{label}</Body></View><View style={{flexDirection:'row',flex:narrow?undefined:3,gap:8}}>{[['Было',rub(a)],['Стало',rub(b)],['Разница',diff==null?'Нет данных':(diff>0?'+':'')+rub(diff)]].map(([title,value])=><View key={title} style={{flex:1,minWidth:0}}>{narrow&&<Text style={{fontSize:12,color:palette.muted}}>{title}</Text>}<Body>{value}</Body></View>)}</View></View>;
 })}</View><EstimateDetails estimate={next} compact/></>;
}
