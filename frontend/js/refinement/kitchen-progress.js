export function hasPendingKitchens(data){
 const ids=data.rooms.filter(r=>r.type==='kitchen').map(r=>r.id);
 if(ids.length<2||!data.completedSections.includes('kitchen'))return false;
 return ids.some(id=>{
  const k=data.kitchens[id];if(!k)return true;
  if(k.parametersConfirmed!=null)return !k.parametersConfirmed;
  return ['cabinets','facade','countertop'].every(key=>!k[key]||k[key]==='unknown')&&k.lengthM==null&&['stove','oven','refrigerator','hood','dishwasher'].every(key=>k[key]==null);
 });
}
