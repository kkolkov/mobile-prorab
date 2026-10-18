import { Pressable, Text, View } from 'react-native';
import { Button, ErrorText, Heading, styles } from '../components/ui';
import { answersComplete, questions, type Answers } from './questions';

export function Questionnaire({answers,onChange,onContinue,busy=false,error=''}:{
  answers:Answers;onChange:(answers:Answers)=>void;onContinue:()=>void;busy?:boolean;error?:string;
}) {
  return <>
    {questions.map(question=><View key={question.key} accessibilityRole="radiogroup" accessibilityLabel={question.label} style={{gap:10}}>
      <Heading>{question.label}</Heading>
      {question.options.map(option=>{
        const checked=answers[question.key]===option.value;
        return <Pressable key={String(option.value)} accessibilityRole="radio" accessibilityLabel={option.label}
          accessibilityState={{checked,disabled:busy}} aria-checked={checked} disabled={busy}
          onPress={()=>onChange({...answers,[question.key]:option.value})}
          style={[styles.card,checked&&styles.selected,busy&&styles.disabled]}>
          <Text style={styles.label}>{checked?'●':'○'}  {option.label}</Text>
        </Pressable>;
      })}
    </View>)}
    <ErrorText message={error}/>
    <Button label={busy?'Сохранение…':'Продолжить'} onPress={onContinue} disabled={!answersComplete(answers)} busy={busy}/>
  </>;
}
