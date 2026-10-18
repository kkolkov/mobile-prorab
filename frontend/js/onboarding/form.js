import {questions, answersComplete, questionnaireTitle, questionnaireSubtitle} from './questions.js';

// A controlled form: navigation owns the session answers; no storage happens on selection.
export function questionnaireHtml(answers, busy=false) {
  return `<h1>${questionnaireTitle}</h1><p>${questionnaireSubtitle}</p>
    <form id="onboarding-form">${questions.map(question=>`<fieldset class="onboarding-question"><legend>${question.label}</legend>
      ${question.options.map((option,index)=>`<label class="card ${answers[question.key]===option.value?'selected':''}">
        <input type="radio" name="${question.key}" value="${index}" ${answers[question.key]===option.value?'checked':''} ${busy?'disabled':''}>
        <span>${option.label}</span></label>`).join('')}</fieldset>`).join('')}
      <div class="error" role="alert" id="onboarding-error"></div>
      <div class="actions"><button class="secondary" type="button" id="onboarding-back" ${busy?'disabled':''}>Назад</button>
      <button class="primary" type="submit" ${busy||!answersComplete(answers)?'disabled':''}>${busy?'Сохранение…':'Продолжить'}</button></div>
    </form>`;
}
export function bindQuestionnaire(root, {answers,onChange,onContinue,onBack,busy=false,error=''}) {
  root.querySelector('#onboarding-error').textContent=error;
  root.querySelectorAll('input[type=radio]').forEach(input=>input.onchange=()=>{
    if(busy)return;
    const question=questions.find(question=>question.key===input.name);
    onChange({...answers,[question.key]:question.options[Number(input.value)].value});
  });
  root.querySelector('#onboarding-back').onclick=()=>{if(!busy)onBack();};
  root.querySelector('#onboarding-form').onsubmit=event=>{
    event.preventDefault();if(!busy&&answersComplete(answers))onContinue();
  };
}
