import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { numberError } from '../core/rules';
import type { Numeric } from '../core/types';

export const palette={background:'#f5f5f0',surface:'#fffefa',ink:'#263c35',muted:'#5e6e65',accent:'#365c4c',line:'#dce3d9',sage:'#e6eee3',lavender:'#eeebf5',sand:'#f4ecdf'};
export const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.background},content:{padding:24,paddingBottom:48,gap:20,width:'100%',maxWidth:880,alignSelf:'center'},
  brand:{fontSize:15,fontWeight:'700',color:palette.ink,letterSpacing:-.3},row:{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'},
  masthead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,borderBottomWidth:1,borderColor:palette.line,paddingBottom:20,marginBottom:4,flexWrap:'wrap'},
  logo:{width:34,height:34,borderRadius:11,backgroundColor:palette.accent,alignItems:'center',justifyContent:'center'},
  step:{fontSize:12,color:palette.accent,backgroundColor:palette.sage,paddingVertical:7,paddingHorizontal:10,borderRadius:18},
  title:{fontSize:32,lineHeight:38,fontWeight:'700',letterSpacing:-1,color:palette.ink},h2:{fontSize:21,lineHeight:28,fontWeight:'700',letterSpacing:-.4,color:palette.ink},
  text:{fontSize:15,lineHeight:24,color:palette.muted},label:{fontSize:15,lineHeight:22,fontWeight:'600',color:palette.ink},
  input:{minHeight:56,borderWidth:1,borderColor:'#9cae9f',borderRadius:14,paddingHorizontal:16,paddingVertical:15,backgroundColor:palette.surface,fontSize:16,color:palette.ink},
  button:{minHeight:52,backgroundColor:palette.accent,borderRadius:14,paddingVertical:14,paddingHorizontal:20,alignItems:'center',justifyContent:'center'},
  secondary:{backgroundColor:'#e9eee5',borderWidth:1,borderColor:'#d6dfd0'},buttonText:{color:palette.surface,fontSize:15,lineHeight:22,fontWeight:'600',textAlign:'center'},
  card:{borderWidth:1,borderColor:palette.line,borderRadius:20,padding:22,gap:8,backgroundColor:palette.surface},
  selected:{borderColor:palette.accent,backgroundColor:palette.sage},notice:{backgroundColor:palette.sand,borderWidth:1,borderColor:'#e6dccb',borderRadius:16,padding:18,gap:8},
  error:{fontSize:14,lineHeight:21,color:'#9d3838'},disabled:{opacity:0.5},field:{gap:9},
  overlay:{flex:1,backgroundColor:'#263c3566',justifyContent:'flex-end'},sheet:{backgroundColor:palette.background,borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:'85%',padding:24,gap:16},
  metric:{padding:24,borderRadius:22,backgroundColor:palette.sage,gap:12,borderWidth:1,borderColor:palette.line},
  metricValue:{fontSize:27,lineHeight:35,fontWeight:'700',letterSpacing:-.7,color:palette.ink},
  planning:{padding:20,borderRadius:20,backgroundColor:palette.surface,borderWidth:1,borderColor:palette.line,gap:18},
});
export function Grid({children}:React.PropsWithChildren){
 const {width,fontScale}=useWindowDimensions();
 const columns=width>=700&&fontScale<1.4;
 return <View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>{React.Children.toArray(children).map((child,i)=><View key={i} style={{width:columns?'48%':'100%',flexGrow:1,minWidth:0}}>{child}</View>)}</View>;
}
export function Metric({label,value,tone='sage'}:{label:string;value:string;tone?:'sage'|'lavender'}){
 return <View style={[styles.metric,{backgroundColor:palette[tone]}]}><Text style={styles.text}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}
export function Screen({title,subtitle,step,back,home,busy,children,scrollRef,headerRight}: React.PropsWithChildren<{
  title:string;subtitle?:string;step?:number;back?:()=>void;home?:()=>void;busy?:boolean;scrollRef?:React.Ref<ScrollView>;headerRight?:React.ReactNode;
}>) {
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
      <View style={[styles.masthead,!!headerRight&&{flexWrap:'nowrap'}]}><Pressable accessibilityRole="button" accessibilityLabel="Мобильный прораб — Мои проекты" accessibilityState={{disabled:!!busy}} disabled={busy} onPress={home??(()=>router.replace('/'))} style={[styles.row,!!headerRight&&{flex:1,flexWrap:'nowrap'}]}><View style={styles.logo}><Text style={{color:palette.surface,fontWeight:'700'}}>мп</Text></View><Text style={[styles.brand,!!headerRight&&{fontSize:13,flexShrink:1}]}>Мобильный прораб</Text></Pressable>{headerRight}{step && step<=5 ? <Text style={styles.step}>Шаг {step} из 5</Text>:null}</View>
      {(back || home) && <View style={styles.row}>{back && <Button label="Назад" secondary onPress={back} disabled={busy}/>}{home && <Button label="Мои проекты" secondary onPress={home} disabled={busy}/>}</View>}
      {step && step<=5 ? <View style={{height:6,backgroundColor:'#e0e7dc',borderRadius:4}}><View style={{height:6,width:`${step*20}%`,backgroundColor:'#66856b',borderRadius:4}}/></View>:null}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.text}>{subtitle}</Text>}{children}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Button({label,onPress,secondary=false,disabled=false,busy=false,testID,displayLabel,danger=false}: {label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean;busy?:boolean;testID?:string;displayLabel?:string;danger?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:disabled||busy,busy}} testID={testID}
    disabled={disabled||busy} onPress={onPress} style={({pressed})=>[styles.button,secondary&&styles.secondary,danger&&{backgroundColor:'#f7e9e7',borderColor:'#e6c7c3'},(disabled||busy)&&styles.disabled,pressed&&{opacity:0.7}]}>
    {busy?<ActivityIndicator color={danger?'#923d40':secondary?palette.ink:'white'}/>:<Text style={[styles.buttonText,secondary&&{color:palette.ink},danger&&{color:'#923d40'}]}>{displayLabel??label}</Text>}
  </Pressable>;
}
export function Card({title,description,selected,onPress,disabled,statusDescription=false}: {title:string;statusDescription?:boolean;description?:string;selected?:boolean;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{selected,disabled}} aria-selected={selected} onPress={onPress} disabled={disabled}
    style={[styles.card,selected&&styles.selected,disabled&&styles.disabled]}>
    <Text style={styles.label}>{title}{selected?' ✓':''}</Text>{description&&<Text style={[styles.text,statusDescription&&{color:'#465a4f',fontWeight:'500'}]}>{description}</Text>}
  </Pressable>;
}
export function Field({label,value,onChange,numeric=false,required=false,scale=1,min=0,max=Infinity,placeholder,maxLength=100,disabled=false}: {
  label:string;value:Numeric;onChange:(value:string)=>void;numeric?:boolean;required?:boolean;scale?:number;min?:number;max?:number;placeholder?:string;maxLength?:number;disabled?:boolean;
}) {
  const [focused,setFocused]=useState(false);
  const error=numeric&&String(value??'')?numberError(value,required,scale,min,max):'';
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={String(value??'')} onChangeText={onChange}
    onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} keyboardType={numeric?'decimal-pad':'default'} editable={!disabled} maxLength={maxLength} placeholder={placeholder} placeholderTextColor="#68766d" style={[styles.input,focused&&{borderColor:palette.accent,borderWidth:2},disabled&&styles.disabled,!!error&&{borderColor:'#b3261e'}]}/>
    {!!error&&<ErrorText message={error}/>}</View>;
}
export function Select({label,value,options,onChange,disabled,disabledOptions=[],hiddenOptions=[]}: {label:string;value:string|null;options:Record<string,string>;onChange:(value:string)=>void;disabled?:boolean;disabledOptions?:string[];hiddenOptions?:string[]}) {
  const [open,setOpen]=useState(false);
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={()=>setOpen(true)} style={[styles.input,disabled&&styles.disabled]}>
    <Text style={{fontSize:17,color:palette.ink}}>{options[value??'']??'Выберите'} ▾</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}><View style={styles.overlay}><SafeAreaView style={styles.sheet}>
      <Text accessibilityRole="header" style={styles.h2}>{label}</Text><ScrollView contentContainerStyle={{gap:8}}>{Object.entries(options).filter(([key])=>!hiddenOptions.includes(key)).map(([key,text])=><Card key={key} title={text} disabled={disabled||disabledOptions.includes(key)} selected={key===value} onPress={()=>{onChange(key);setOpen(false);}}/>)}</ScrollView>
      <Button secondary label="Закрыть" onPress={()=>setOpen(false)}/>
    </SafeAreaView></View></Modal></View>;
}
export function Check({label,value,fallback,onChange,disabled}: {label:string;value:boolean|null;fallback:boolean;onChange:(v:boolean)=>void;disabled?:boolean}) {
  const checked=value??fallback;
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked,disabled}} aria-checked={checked} disabled={disabled} onPress={()=>onChange(!checked)} style={[styles.card,styles.row,checked&&styles.selected,disabled&&styles.disabled]}>
    <Text style={{fontSize:24,color:palette.ink}}>{checked?'☑':'☐'}</Text><View style={{flex:1}}><Text style={styles.label}>{label}</Text>{value===null&&<Text style={styles.text}>По нормативу</Text>}</View>
  </Pressable>;
}
export function Counter({label,value,onChange,min=1,max=20,disabled}: {label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;disabled?:boolean}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={[styles.card,styles.row,{justifyContent:'space-between',padding:8}]}>
    <Button label={`Уменьшить: ${label}`} displayLabel="−" secondary onPress={()=>onChange(value-1)} disabled={disabled||value<=min}/>
    <Text style={styles.h2}>{value}</Text><Button label={`Увеличить: ${label}`} displayLabel="+" secondary onPress={()=>onChange(value+1)} disabled={disabled||value>=max}/>
  </View></View>;
}
export const Notice=({children}:React.PropsWithChildren)=> <View style={styles.notice}><Text style={styles.text}>{children}</Text></View>;
export const Demo=()=> <Notice>Ориентировочная оценка. Цены и допущения — в составе оценки. Срок ориентировочный.</Notice>;
export const ErrorText=({message}:{message:string})=>message?<Text accessibilityRole="alert" style={styles.error}>{message}</Text>:null;
export const Heading=({children}:React.PropsWithChildren)=><Text accessibilityRole="header" style={styles.h2}>{children}</Text>;
export const Body=({children}:React.PropsWithChildren)=><Text style={styles.text}>{children}</Text>;
export function Confirm({message,onConfirm,onCancel}: {message:string;onConfirm:()=>void;onCancel:()=>void}) {
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View style={styles.overlay}><SafeAreaView style={styles.sheet}>
    <Heading>Подтвердите действие</Heading><Body>{message}</Body><Button label="Подтвердить" onPress={onConfirm}/><Button secondary label="Отмена" onPress={onCancel}/>
  </SafeAreaView></View></Modal>;
}
