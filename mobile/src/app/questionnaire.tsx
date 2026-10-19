import {useState} from 'react';
import {router} from 'expo-router';
import {Screen} from '../components/ui';
import {Questionnaire} from '../onboarding/Questionnaire';
import {questionnaireTitle,questionnaireSubtitle,answersComplete} from '../onboarding/questions';
import {wizard} from '../core/session';
export default function QuestionnaireScreen(){
 const [answers,setAnswers]=useState(wizard.answers);
 return <Screen title={questionnaireTitle} subtitle={questionnaireSubtitle} back={()=>router.replace('/')}>
  <Questionnaire answers={answers} busy={false} error="" onChange={value=>{wizard.answers=value;setAnswers(value);}} onContinue={()=>{if(answersComplete(answers))router.replace('/wizard/1');}}/>
 </Screen>;
}
