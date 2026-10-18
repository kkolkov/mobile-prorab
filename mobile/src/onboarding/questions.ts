export const questionnaireVersion = '1';
export const questionnaireTitle = 'Расскажите о себе и вашем опыте ремонта';
export const questionnaireSubtitle = 'Ответьте на 3 коротких вопроса';
export interface Answers {
  firstRenovation:boolean|null;
  renovationManager:'self'|'turnkey_team'|'designer_or_management'|null;
  renovationStage:'planning'|'in_progress'|'completed'|null;
}
type Question = {key:keyof Answers;label:string;options:{value:boolean|string;label:string}[]};
export const questions:Question[] = [
  {key:'firstRenovation',label:'Это ваш первый ремонт?',options:[{value:true,label:'Да'},{value:false,label:'Нет'}]},
  {key:'renovationManager',label:'Кто будет управлять ремонтом?',options:[
    {value:'self',label:'Я сам(а)'},{value:'turnkey_team',label:'Бригада под ключ'},
    {value:'designer_or_management',label:'Дизайнер или управляющая компания'}
  ]},
  {key:'renovationStage',label:'На каком этапе ваш ремонт?',options:[
    {value:'planning',label:'Планирую'},{value:'in_progress',label:'Идёт'},{value:'completed',label:'Завершён'}
  ]}
];
export const emptyAnswers = ():Answers => ({firstRenovation:null,renovationManager:null,renovationStage:null});
export const answersComplete = (answers:Answers) => questions.every(question => question.options.some(option => option.value === answers[question.key]));
