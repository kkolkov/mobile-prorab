export function roomName(room,rooms,labels){
 if(room.name.trim())return room.name.trim();
 const peers=rooms.filter(r=>r.id!==room.id&&r.type===room.type);
 let n=peers.reduce((max,r)=>Math.max(max,Number(r.name.match(/ (\d+)$/)?.[1]??0)),peers.length)+1;
 return `${labels[room.type]} ${n}`;
}
