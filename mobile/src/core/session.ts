import { emit } from './analytics';
import type { Drafts, Project } from './types';
export interface WizardData {
  areaM2: string; name: string; nameSource: 'auto' | 'user'; address: string;
  currentState: string | null; targetState: string | null; finishLevel: string | null;
  kitchensCount: number; bathroomsCount: number; redevelopment: boolean;
}
export const wizard: {project: Project | null; local: WizardData} = {project: null, local: blank()};
function blank(): WizardData {
  return {areaM2:'', name:'', nameSource:'auto', address:'', currentState:null, targetState:null,
    finishLevel:null, kitchensCount:1, bathroomsCount:1, redevelopment:false};
}
export function startWizard(project?: Project) {
  wizard.project = project ?? null;
  wizard.local = project ? {...project, areaM2:String(project.areaM2), address:project.address ?? '',
    kitchensCount:Math.max(1, Math.min(20, project.kitchensCount ?? 1)),
    bathroomsCount:Math.max(1, Math.min(20, project.bathroomsCount ?? 1)), redevelopment:project.redevelopment ?? false} : blank();
  emit({name:project ? 'project_creation_resumed' : 'project_creation_started',projectId:project?.projectId});
}
export const refinementDrafts = new Map<string, Drafts>();
export function draftsFor(id: string) {
  if (!refinementDrafts.has(id)) refinementDrafts.set(id, {});
  return refinementDrafts.get(id)!;
}
export function resetSession(){wizard.project=null;wizard.local=blank();refinementDrafts.clear();}
