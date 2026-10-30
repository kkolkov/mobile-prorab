export function roomName(room,rooms,labels){
 if(room.name.trim())return room.name.trim();
 const peers=rooms.filter(r=>r.type===room.type||r.id===room.id);
 const index=peers.findIndex(r=>r.id===room.id);
 const n=index<0?peers.length+1:index+1;
 return `${labels[room.type]} ${n}`;
}
