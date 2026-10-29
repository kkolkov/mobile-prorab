export function roomName(room,rooms,labels){
 if(room.name.trim())return room.name.trim();
 const ordered=rooms.some(r=>r.id===room.id)?rooms.map(r=>r.id===room.id?room:r):[...rooms,room];
 const peers=ordered.filter(r=>r.type===room.type);
 const index=peers.findIndex(r=>r.id===room.id);
 const number=index<0?peers.length+1:index+1;
 return `${labels[room.type]} ${number}`;
}
