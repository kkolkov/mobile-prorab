import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import {Body,palette,styles} from '../components/ui';
import {rub} from '../core/rules';
import {StagePhotos} from './StagePhotos';
import type {StagePhoto} from './photos';
import type {Expense} from './types';
export function ExpenseCard({expense,details,disabled,photos,onEdit,onRemove,onReceipt}:{expense:Expense;details:string;disabled:boolean;photos?:StagePhoto[];onEdit:()=>void;onRemove:()=>void;onReceipt:()=>void}){
 const {width,fontScale}=useWindowDimensions();
 const wide=width>=700&&fontScale<1.4,stack=fontScale>=1.4;
 const action=(label:string,onPress:()=>void)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,styles.secondary,{flexGrow:1,flexBasis:0,minWidth:0,paddingHorizontal:12},disabled&&styles.disabled,pressed&&{opacity:0.7}]}><Text style={[styles.buttonText,{color:palette.ink}]}>{label}</Text></Pressable>;
 const receipt=expense.receiptPhotoId?action(photos?'Скрыть чек':'Посмотреть чек',onReceipt):null;
 return <View testID={`expense-${expense.id}`} style={[styles.card,{padding:20,gap:16}]}>
  <View style={{flexDirection:wide?'row':'column',gap:8,justifyContent:'space-between'}}><View style={{flex:1,minWidth:0,gap:8}}><Text style={styles.label}>{expense.title}</Text><Body>{details}</Body></View><Text style={[styles.label,{flexShrink:0}]}>{rub(expense.amount)}</Text></View>
  <View style={{gap:10}}><View style={{flexDirection:stack?'column':'row',gap:10,alignItems:'stretch'}}>{action('Изменить',onEdit)}{action('Удалить',onRemove)}{wide&&(receipt??<View style={{flex:1}}/>)}</View>{!wide&&receipt}</View>
  {photos&&<StagePhotos photos={photos} label="Чек"/>}
 </View>;
}
