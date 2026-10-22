import {Image,View} from 'react-native';
import {Button} from '../components/ui';
import type {StagePhoto} from './photos';
export function StagePhotos({photos,remove,disabled=false}:{photos:StagePhoto[];remove?:(index:number)=>void;disabled?:boolean}){
 return <View style={{gap:12}}>{photos.map((photo,i)=><View key={i} style={{gap:8}}><Image source={{uri:photo.dataUrl}} accessibilityLabel={`Фото этапа ${i+1}`} style={{width:'100%',height:240,borderRadius:12}} resizeMode="contain"/>{remove&&<Button label={`Удалить фото ${i+1}`} secondary disabled={disabled} onPress={()=>remove(i)}/>}</View>)}</View>;
}
