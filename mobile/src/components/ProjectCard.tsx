import {useEffect,useState} from 'react';
import {Modal,Platform,Pressable,Text,View} from 'react-native';
import {projectAppearance,projectCardDetails} from '../core/display';
import type {Project} from '../core/types';
import {palette,styles} from './ui';
export function ProjectCard({project,onPress,onRename,onDelete,disabled}:{project:Project;onPress:()=>void;onRename:()=>void;onDelete:()=>void;disabled:boolean}){
 const [menu,setMenu]=useState(false),[hover,setHover]=useState(false);
 const appearance=projectAppearance(project),details=projectCardDetails(project),progress=details.progress;
 const tone=({neutral:'#edf0e8',sage:palette.sage,lavender:palette.lavender,sand:palette.sand} as Record<string,string>)[appearance.tone];
 const empty=project.budgetMinRub==null||project.budgetMaxRub==null;
 useEffect(()=>{if(Platform.OS!=='web'||!menu)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenu(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[menu]);
 return <View style={{flex:1,padding:16,borderWidth:1,borderColor:palette.line,borderRadius:22,backgroundColor:palette.surface,transform:[{translateY:hover?-2:0}]}}>
  <Pressable accessibilityRole="button" accessibilityLabel={project.name} disabled={disabled} onPress={onPress} onHoverIn={()=>setHover(true)} onHoverOut={()=>setHover(false)} style={{flex:1}}>
   <View style={{height:200,minHeight:200,padding:24,borderRadius:20,gap:12,backgroundColor:tone}}>
    <Text numberOfLines={2} style={[styles.label,{fontSize:18,lineHeight:22}]}>{project.name}</Text>
    <Text style={{alignSelf:'flex-start',paddingHorizontal:10,paddingVertical:5,borderRadius:20,backgroundColor:'#fffefa99',color:'#465a4f',fontSize:12,fontWeight:'600'}}>{appearance.label}</Text>
    <Text style={{marginTop:'auto',color:empty?'#465a4f':palette.ink,fontSize:empty?18:20,lineHeight:28,fontWeight:empty?'400':'600'}}>{details.budget}</Text>
   </View>
   <View style={{height:36,marginTop:16,gap:8,opacity:progress?1:0}} accessibilityElementsHidden={!progress} importantForAccessibility={progress?'auto':'no-hide-descendants'}>
    <View style={[styles.row,{justifyContent:'space-between'}]}><Text style={{color:'#465a4f',fontSize:13}}>{progress?.label??' '}</Text><Text style={{color:'#465a4f',fontSize:13,fontWeight:'600'}}>{progress?.percent??0}%</Text></View>
    <View accessibilityRole="progressbar" accessibilityLabel={progress?.aria} accessibilityValue={{min:0,max:100,now:progress?.percent??0}} style={{height:7,borderRadius:8,backgroundColor:palette.line,overflow:'hidden'}}><View style={{height:7,width:`${progress?.percent??0}%`,backgroundColor:'#66856b',borderRadius:8}}/></View>
   </View>
   <Text style={{marginTop:8,minHeight:18,lineHeight:18,color:'#465a4f',fontSize:12}}>{details.updated??' '}</Text>
  </Pressable>
  <View style={{flexDirection:'row',gap:8,marginTop:16}}>
   <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button,{flex:1,height:44,minHeight:44,paddingVertical:0}]}><Text style={styles.buttonText}>{project.status==='draft'?'Продолжить':'Открыть'}</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={`Действия: ${project.name}`} accessibilityState={{expanded:menu,disabled}} disabled={disabled} onPress={()=>setMenu(true)} style={{width:44,height:44,borderWidth:1,borderColor:palette.line,borderRadius:14,alignItems:'center',justifyContent:'center'}}><Text style={{color:palette.ink,fontSize:24}}>⋯</Text></Pressable>
  </View>
  <Modal visible={menu} transparent animationType="fade" onRequestClose={()=>setMenu(false)}><Pressable accessibilityLabel="Закрыть меню" onPress={()=>setMenu(false)} style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#263c3520'}}><View style={{width:260,padding:6,borderRadius:14,backgroundColor:palette.surface,borderWidth:1,borderColor:palette.line}}>
   <Pressable accessibilityRole="button" onPress={()=>{setMenu(false);onRename();}} style={{padding:12,minHeight:44}}><Text style={{color:palette.ink}}>Переименовать</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>{setMenu(false);onDelete();}} style={{padding:12,minHeight:44}}><Text style={{color:'#923d40'}}>Удалить</Text></Pressable>
  </View></Pressable></Modal>
 </View>;
}
