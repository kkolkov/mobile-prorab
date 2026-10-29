import {Text,View,useWindowDimensions} from 'react-native';
import {Body,Heading,palette} from './ui';
import {rub} from '../core/rules';
import type {Estimate} from '../core/types';

export function EstimateSummary({estimate}:{estimate:Estimate|null|undefined}){
 const {width,fontScale}=useWindowDimensions();
 const narrow=width<700||fontScale>=1.4;
 const d=estimate?.details;
 if(!d)return <Body>Разбивка оценки пока недоступна.</Body>;
 const materials=d.roughMaterials+d.finishMaterials;
 const rows=[...(d.groups??[]),{code:'total',title:'ИТОГО',description:'',laborRub:d.labor,materialsRub:materials,totalRub:d.labor+materials}];
 return <View style={{gap:12}}><Heading>Состав оценки</Heading>
  {!d.groups?.length&&<Body>Для этой сохранённой оценки нет разбивки по разделам. Она появится после пересчёта. Общие суммы сохранены.</Body>}
  {!narrow&&<View style={{flexDirection:'row',gap:12}}><Text style={{width:'40%',color:palette.muted}}>Категория работ и материалов</Text><View style={{flex:1,flexDirection:'row',gap:8}}>{['Стоимость работ','Стоимость материалов','Итого по разделу'].map(label=><Text key={label} style={{flex:1,color:palette.muted}}>{label}</Text>)}</View></View>}
  {rows.map(row=><View key={row.code} style={{flexDirection:narrow?'column':'row',gap:12,padding:12,borderBottomWidth:1,borderColor:palette.line,backgroundColor:row.code==='total'?palette.sage:palette.surface,borderRadius:8}}>
   <View style={{width:narrow?'100%':'40%',gap:5}}><Text style={{fontSize:16,fontWeight:'600',color:palette.ink}}>{row.title}</Text>{!!row.description&&<Text style={{fontSize:13,lineHeight:19,color:palette.muted}}>{row.description}</Text>}</View>
   <View style={{flex:1,flexDirection:'row',gap:8}}>{[['Работы',row.laborRub],['Материалы',row.materialsRub],['Итого',row.totalRub]].map(([label,value])=><View key={label} style={{flex:1,minWidth:0,gap:6}}>{narrow&&<Text style={{fontSize:12,color:palette.muted}}>{label}</Text>}<Text style={{fontSize:14,color:palette.ink,fontWeight:row.code==='total'?'700':'400'}}>{rub(Number(value))}</Text></View>)}</View>
  </View>)}
  <Body>Суммы без резерва. Оценка предварительная; разделение комплексных ставок — по составу справочника.</Body>
 </View>;
}
