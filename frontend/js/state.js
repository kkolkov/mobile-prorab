import {validArea} from './validation.js';
export const state={projectId:null,project:null,step:1,local:{},loading:false,error:''};
export function setProject(p){state.project=p;state.projectId=p.projectId;state.local={...state.local,...p};}
export function localName(area){return validArea(area)?`Ремонт квартиры ${Number(String(area).replace(',', '.'))} м²`:''}
export function renderScreen(app,html){app.innerHTML=`<div class="shell">${html}</div>`}
