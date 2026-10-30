import type {Room} from '../core/types';
export function roomName(room:Room,rooms:Room[],labels:Record<string,string>){
 if(room.name.trim())return room.name.trim();
 const peers=rooms.filter(r=>r.type===room.type||r.id===room.id);
 const index=peers.findIndex(r=>r.id===room.id);
 const n=index<0?peers.length+1:index+1;
 return `${labels[room.type]} ${n}`;
}
