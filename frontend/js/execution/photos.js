// Compress before upload; the server validates and re-encodes the actual image again.
export async function preparePhoto(file){
 if(!file.type.startsWith('image/')||file.size>25*1024*1024)throw new Error('Выберите фотографию до 25 МБ.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;
  try{await image.decode();}catch{throw new Error('Не удалось открыть фото. Попробуйте JPEG или PNG.');}
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const dataUrl=canvas.toDataURL('image/jpeg',0.75);
  if(dataUrl.length>2800000)throw new Error('Фото слишком большое. Выберите другое.');
  return {dataUrl};
 }finally{URL.revokeObjectURL(url);}
}
export function photoGrid(photos,editable=false){return `<div class="stage-photos">${photos.map((p,i)=>`<div class="stage-photo"><img src="${p.dataUrl}" alt="Фото этапа ${i+1}" loading="lazy">${editable?`<button type="button" class="secondary" data-remove-photo="${i}" aria-label="Удалить фото ${i+1}">Удалить</button>`:''}</div>`).join('')}</div>`;}
