import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { numberError } from '../core/rules';
import type { Numeric } from '../core/types';

export const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#f6f6f3'},content:{padding:22,paddingBottom:42,gap:18,width:'100%',maxWidth:720,alignSelf:'center'},
  brand:{fontSize:17,fontWeight:'800',color:'#171717'},row:{flexDirection:'row',alignItems:'center',gap:12},
  title:{fontSize:30,lineHeight:36,fontWeight:'700',color:'#171717'},h2:{fontSize:21,fontWeight:'700',color:'#171717'},
  text:{fontSize:16,lineHeight:23,color:'#6c6c69'},label:{fontSize:16,fontWeight:'600',color:'#222'},
  input:{minHeight:54,borderWidth:1,borderColor:'#d6d6d2',borderRadius:14,paddingHorizontal:16,paddingVertical:12,backgroundColor:'#fff',fontSize:17,color:'#171717'},
  button:{minHeight:52,backgroundColor:'#151515',borderRadius:14,padding:15,alignItems:'center',justifyContent:'center'},
  secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d6d6d2'},buttonText:{color:'#fff',fontSize:16,fontWeight:'700',textAlign:'center'},
  card:{borderWidth:1,borderColor:'#d7d7d3',borderRadius:16,padding:18,gap:7,backgroundColor:'#fff'},
  selected:{borderColor:'#171717',borderWidth:2,backgroundColor:'#ebebe6'},notice:{backgroundColor:'#eaeae5',borderRadius:14,padding:16,gap:8},
  error:{fontSize:15,lineHeight:21,color:'#b3261e'},disabled:{opacity:0.4},field:{gap:8},
  overlay:{flex:1,backgroundColor:'#0006',justifyContent:'flex-end'},sheet:{backgroundColor:'#f6f6f3',borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'85%',padding:22,gap:16},
});
export function Screen({title,subtitle,step,back,home,busy,children}: React.PropsWithChildren<{
  title:string;subtitle?:string;step?:number;back?:()=>void;home?:()=>void;busy?:boolean;
}>) {
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
      <View style={[styles.row,{justifyContent:'space-between'}]}><Text style={styles.brand}>Мобильный прораб</Text>{step && step<=5 ? <Text style={styles.text}>Шаг {step} из 5</Text>:null}</View>
      {(back || home) && <View style={styles.row}>{back && <Button label="Назад" secondary onPress={back} disabled={busy}/>}{home && <Button label="Мои проекты" secondary onPress={home} disabled={busy}/>}</View>}
      {step && step<=5 ? <View style={{height:4,backgroundColor:'#deded9',borderRadius:2}}><View style={{height:4,width:`${step*20}%`,backgroundColor:'#171717',borderRadius:2}}/></View>:null}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.text}>{subtitle}</Text>}{children}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Button({label,onPress,secondary=false,disabled=false,busy=false,testID,displayLabel}: {label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean;busy?:boolean;testID?:string;displayLabel?:string}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:disabled||busy,busy}} testID={testID}
    disabled={disabled||busy} onPress={onPress} style={({pressed})=>[styles.button,secondary&&styles.secondary,(disabled||busy)&&styles.disabled,pressed&&{opacity:0.7}]}>
    {busy?<ActivityIndicator color={secondary?'#171717':'white'}/>:<Text style={[styles.buttonText,secondary&&{color:'#171717'}]}>{displayLabel??label}</Text>}
  </Pressable>;
}
export function Card({title,description,selected,onPress,disabled}: {title:string;description?:string;selected?:boolean;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{selected,disabled}} aria-selected={selected} onPress={onPress} disabled={disabled}
    style={[styles.card,selected&&styles.selected,disabled&&styles.disabled]}>
    <Text style={styles.label}>{title}{selected?' ✓':''}</Text>{description&&<Text style={styles.text}>{description}</Text>}
  </Pressable>;
}
export function Field({label,value,onChange,numeric=false,required=false,scale=1,min=0,max=Infinity,placeholder,maxLength=100,disabled=false}: {
  label:string;value:Numeric;onChange:(value:string)=>void;numeric?:boolean;required?:boolean;scale?:number;min?:number;max?:number;placeholder?:string;maxLength?:number;disabled?:boolean;
}) {
  const error=numeric&&String(value??'')?numberError(value,required,scale,min,max):'';
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={String(value??'')} onChangeText={onChange}
    keyboardType={numeric?'decimal-pad':'default'} editable={!disabled} maxLength={maxLength} placeholder={placeholder} placeholderTextColor="#969691" style={[styles.input,!!error&&{borderColor:'#b3261e'}]}/>
    {!!error&&<ErrorText message={error}/>}</View>;
}
export function Select({label,value,options,onChange,disabled}: {label:string;value:string|null;options:Record<string,string>;onChange:(value:string)=>void;disabled?:boolean}) {
  const [open,setOpen]=useState(false);
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={()=>setOpen(true)} style={styles.input}>
    <Text style={{fontSize:17,color:'#171717'}}>{options[value??'']??'Выберите'} ▾</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}><View style={styles.overlay}><SafeAreaView style={styles.sheet}>
      <Text accessibilityRole="header" style={styles.h2}>{label}</Text><ScrollView contentContainerStyle={{gap:8}}>{Object.entries(options).map(([key,text])=><Card key={key} title={text} selected={key===value} onPress={()=>{onChange(key);setOpen(false);}}/>)}</ScrollView>
      <Button secondary label="Закрыть" onPress={()=>setOpen(false)}/>
    </SafeAreaView></View></Modal></View>;
}
export function Check({label,value,fallback,onChange,disabled}: {label:string;value:boolean|null;fallback:boolean;onChange:(v:boolean)=>void;disabled?:boolean}) {
  const checked=value??fallback;
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked,disabled}} aria-checked={checked} disabled={disabled} onPress={()=>onChange(!checked)} style={[styles.card,styles.row]}>
    <Text style={{fontSize:24,color:'#171717'}}>{checked?'☑':'☐'}</Text><View style={{flex:1}}><Text style={styles.label}>{label}</Text>{value===null&&<Text style={styles.text}>По нормативу</Text>}</View>
  </Pressable>;
}
export function Counter({label,value,onChange,min=1,max=20,disabled}: {label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;disabled?:boolean}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.row}>
    <Button label={`Уменьшить: ${label}`} displayLabel="−" secondary onPress={()=>onChange(value-1)} disabled={disabled||value<=min}/>
    <Text style={styles.h2}>{value}</Text><Button label={`Увеличить: ${label}`} displayLabel="+" secondary onPress={()=>onChange(value+1)} disabled={disabled||value>=max}/>
  </View></View>;
}
export const Notice=({children}:React.PropsWithChildren)=> <View style={styles.notice}><Text style={styles.text}>{children}</Text></View>;
export const Demo=()=> <Notice>Ориентировочная оценка. Базовые цены условные, срок демонстрационный.</Notice>;
export const ErrorText=({message}:{message:string})=>message?<Text accessibilityRole="alert" style={styles.error}>{message}</Text>:null;
export const Heading=({children}:React.PropsWithChildren)=><Text accessibilityRole="header" style={styles.h2}>{children}</Text>;
export const Body=({children}:React.PropsWithChildren)=><Text style={styles.text}>{children}</Text>;
export function Confirm({message,onConfirm,onCancel}: {message:string;onConfirm:()=>void;onCancel:()=>void}) {
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View style={styles.overlay}><SafeAreaView style={styles.sheet}>
    <Heading>Подтвердите действие</Heading><Body>{message}</Body><Button label="Подтвердить" onPress={onConfirm}/><Button secondary label="Отмена" onPress={onCancel}/>
  </SafeAreaView></View></Modal>;
}
