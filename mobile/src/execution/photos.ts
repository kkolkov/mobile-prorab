import * as ImagePicker from 'expo-image-picker';
import {ImageManipulator,SaveFormat} from 'expo-image-manipulator';
export type StagePhoto={dataUrl:string};
export async function pickPhotos(remaining:number,receipt=false):Promise<StagePhoto[]>{
 if(remaining<=0)throw new Error('К этапу можно прикрепить до 5 фотографий.');
 const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:remaining,quality:0.8});
 if(result.canceled)return [];
 if(result.assets.length>remaining)throw new Error('К этапу можно прикрепить до 5 фотографий.');
 const photos:StagePhoto[]=[];
 for(const asset of result.assets){
  const context=ImageManipulator.manipulate(asset.uri);
  if(Math.max(asset.width,asset.height)>(receipt?3200:1600))context.resize(asset.width>=asset.height?{width:receipt?3200:1600}:{height:receipt?3200:1600});
  const image=await context.renderAsync();
  let saved=await image.saveAsync({format:SaveFormat.JPEG,compress:receipt?0.85:0.75,base64:true});
  if(receipt)for(const quality of [0.7,0.55,0.4]){if(saved.base64&&saved.base64.length<=1299900)break;saved=await image.saveAsync({format:SaveFormat.JPEG,compress:quality,base64:true});}
  if(receipt&&(!saved.base64||saved.base64.length>1299900))throw new Error('Чек слишком большой. Обрежьте лишний фон на фотографии.');
  if(!saved.base64||saved.base64.length>2799900)throw new Error('Фото слишком большое. Выберите другое.');
  photos.push({dataUrl:'data:image/jpeg;base64,'+saved.base64});
 }
 return photos;
}
