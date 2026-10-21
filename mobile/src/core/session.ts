import {emptyAnswers,type Answers} from '../onboarding/questions';
import { emit } from './analytics';
import type { Drafts, Project } from './types';
export interface WizardData {
  areaM2: string; name: string; nameSource: 'auto' | 'user'; address: string;
  currentState: string | null; targetState: string | null; finishLevel: string | null;
  otherRoomsRepair: boolean; roomsCount: number; bathroomsCount: number; redevelopment: boolean;
}
export const wizard: {project: Project | null; local: WizardData; answers: Answers} = {project: null, local: blank(),answers:emptyAnswers()};
function blank(): WizardData {
  return {areaM2:'', name:'', nameSource:'auto', address:'', currentState:null, targetState:null,
    finishLevel:null, otherRoomsRepair:false, roomsCount:1, bathroomsCount:1, redevelopment:false};
}
export function startWizard(project?: Project) {
  wizard.answers=emptyAnswers();
  wizard.project = project ?? null;
  wizard.local = project ? {...project, areaM2:String(project.areaM2), address:project.address ?? '',
    roomsCount:Math.max(0, Math.min(20, project.roomsCount ?? 1)),
    bathroomsCount:Math.max(0, Math.min(20, project.bathroomsCount ?? 1)), redevelopment:project.redevelopment ?? false} : blank();
  emit({name:project ? 'project_creation_resumed' : 'project_creation_started',projectId:project?.projectId});
}
export const refinementDrafts = new Map<string, Drafts>();
export function draftsFor(id: string) {
  if (!refinementDrafts.has(id)) refinementDrafts.set(id, {});
  return refinementDrafts.get(id)!;
}
export function resetSession(){wizard.project=null;wizard.local=blank();wizard.answers=emptyAnswers();refinementDrafts.clear();}
