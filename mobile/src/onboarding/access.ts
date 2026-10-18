import type { Answers } from './questions';
export interface Access extends Answers {
 userGroup:'A'|'B';assignmentSource:string;firstProjectId:string;questionnaireRequired:boolean;
 questionnaireShown:boolean;questionnaireVersion:string|null;questionnaireCompletedAt:string|null;
 offerShown:boolean;trialEligible:boolean;fullAccess:boolean;freemiumStartedAt:string|null;freemiumEndsAt:string|null;
 subscriptionStatus:string;version:number;
}
export const questionnaireDrafts=new Map<string,Answers>();
