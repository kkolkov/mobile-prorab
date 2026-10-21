import {registerAccount,installSession} from '../../../frontend/tests/browser/auth-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {webkit,chromium} from '../../../frontend/node_modules/playwright/index.mjs';
const front=process.env.PRORAB_MOBILE_URL||'http://localhost:8081';
const base=process.env.PRORAB_TEST_API||'http://localhost:8080/api';
let account;
async function api(path,body,method='POST'){
  if(!account)account=await registerAccount();
  const response=await fetch(base+path,body===undefined?{headers:{Authorization:`Bearer ${account.token}`}}:{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${account.token}`},body:JSON.stringify(body)});
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;
}
const button=(page,name)=>page.getByRole('button',{name,exact:true});
async function select(page,label,value){await button(page,label).click();await button(page,value).click();}
async function activeProject(){
  account=await registerAccount();
  let p=await api('/projects/draft',{areaM2:68,name:'Expo: проверка конфликта'});
  await api('/projects/access/answers',{firstRenovation:false,renovationManager:'self',renovationStage:'planning',questionnaireVersion:'1'});
  const path=`/projects/${p.projectId}`;
  p=await api(path+'/steps/2',{version:p.version,currentState:'old_finish'},'PUT');
  p=await api(path+'/steps/3',{version:p.version,targetState:'move_in_ready'},'PUT');
  p=await api(path+'/steps/5/estimate',{version:p.version,finishLevel:'comfort'},'PUT');
  return api(path+'/activate?version='+p.version,{});
}
for(const [engine,type] of Object.entries({webkit,chromium}))test(`${engine}: CP-01–06, persistence, refinement four sections and explicit apply`,{timeout:180000},async()=>{
  const browser=await type.launch();try{
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));let creates=0,id;
    page.on('response',async response=>{if(response.url().endsWith('/projects/draft')&&response.request().method()==='POST'){creates++;if(response.ok())id=(await response.json()).projectId;}});
    account=await registerAccount();await installSession(page,account);
    await page.goto(front);await button(page,'Создать проект').click();await page.getByRole('radio',{name:'Нет',exact:true}).click();await page.getByRole('radio',{name:'Я сам(а)',exact:true}).click();await page.getByRole('radio',{name:'Планирую',exact:true}).click();await button(page,'Продолжить').click();
    assert.equal(await button(page,'Продолжить').isDisabled(),true);assert.equal(creates,0);
    await page.getByLabel('Площадь квартиры, м²',{exact:true}).fill('33');
    assert.equal(await page.getByLabel('Название проекта · необязательно',{exact:true}).inputValue(),'Ремонт квартиры 33 м²');
    await page.getByLabel('Название проекта · необязательно',{exact:true}).fill('Expo МОЯ квартира 33 м²');
    await page.getByLabel('Площадь квартиры, м²',{exact:true}).fill('38');
    assert.equal(await page.getByLabel('Название проекта · необязательно',{exact:true}).inputValue(),'Expo МОЯ квартира 38 м²');
    await page.getByLabel('Адрес · необязательно',{exact:true}).fill('Тестовый адрес');
    await button(page,'Продолжить').click();await button(page,'Старая отделка').waitFor();
    assert.equal(creates,1);assert.equal((await api('/projects/'+id)).address,'Тестовый адрес');
    await button(page,'Старая отделка').click();assert.equal((await api('/projects/'+id)).currentState,null);
    await button(page,'Назад').click();await page.getByLabel('Площадь квартиры, м²',{exact:true}).fill('68');
    await button(page,'Продолжить').click();await button(page,'Старая отделка').waitFor();
    assert.equal(creates,1);assert.equal((await api('/projects/'+id)).areaM2,68);assert.equal((await api('/projects/'+id)).completedStep,1);
    assert.equal(await button(page,'Старая отделка').getAttribute('aria-selected'),'true');
    await button(page,'Продолжить').click();await button(page,'Готовая к проживанию').click();
    await button(page,'Мои проекты').click();await page.reload();
    await button(page,'Expo МОЯ квартира 68 м²').click();await button(page,'Готовая к проживанию').waitFor();
    assert.equal(await button(page,'Продолжить').isDisabled(),true); // unsaved choice lost after process/page restart
    await button(page,'Готовая к проживанию').click();await button(page,'Продолжить').click();await button(page,'Нет').waitFor();
    assert.equal(await button(page,'Нет').getAttribute('aria-selected'),'true');
    assert.equal(await button(page,'Уменьшить: Количество комнат').isDisabled(),true);
    await button(page,'Увеличить: Количество комнат').click();await button(page,'Увеличить: Количество комнат').click();
    await button(page,'Продолжить').click();await button(page,'Комфорт').click();await button(page,'Получить оценку').click();
    await page.getByRole('heading',{name:'Предварительная оценка',exact:true}).waitFor();
    await button(page,'Из чего складывается оценка').click();
    await page.getByText('Черновые материалы:',{exact:false}).waitFor();
    await button(page,'Скрыть состав оценки').click();
    await button(page,'Перейти в проект').click();await button(page,'Уточнить параметры проекта').click();
    await button(page,'Балкон и лоджия').click();
    await button(page,'Нужен ремонт?').waitFor();
    assert.equal(await button(page,'Что нужно отремонтировать?').count(),0);
    await button(page,'Назад').click();
    assert.match(await button(page,'Балкон и лоджия').innerText(),/Не уточнено/);
    assert.match(await button(page,'Балкон и лоджия').innerText(),/Есть несохранённый ввод/);
    await button(page,'Балкон и лоджия').click();await button(page,'Продолжить').click();
    await button(page,'Балкон и лоджия').waitFor();
    assert.match(await button(page,'Балкон и лоджия').innerText(),/Данные указаны/);
    assert.doesNotMatch(await button(page,'Балкон и лоджия').innerText(),/несохранённый/);
    await button(page,'Кухня и техника').click();await select(page,'Гарнитур','Оставить существующий');
    for(const label of ['Плита / варочная панель','Отдельный духовой шкаф','Холодильник','Вытяжка','Посудомоечная машина'])await page.getByRole('checkbox',{name:label,exact:true}).click();
    await button(page,'Продолжить').click();await button(page,'Параметры квартиры').click();
    await page.getByLabel('Площадь квартиры, м² — без балкона и лоджии',{exact:true}).fill('75');
    await page.getByLabel('Высота потолков, м',{exact:true}).fill('2,75');
    await page.route('**/refinement/apartment',route=>route.abort());await button(page,'Продолжить').click();
    await page.getByRole('alert').filter({hasText:'Ваш ввод остался'}).waitFor();
    assert.equal(await page.getByLabel('Высота потолков, м',{exact:true}).inputValue(),'2,75');
    await page.unroute('**/refinement/apartment');await button(page,'Продолжить').click();
    const path=`/projects/${id}/refinement`;await button(page,'Помещения').click();let snapshot=await api(path);
    assert.equal(snapshot.data.rooms.filter(r=>r.type==='living').length,3);
    const room=snapshot.data.rooms.find(r=>r.type==='living');await button(page,room.name).click();
    await page.getByLabel('Название помещения',{exact:true}).fill('Спальня');await page.getByLabel('Площадь помещения, м²',{exact:true}).fill('20');
    await select(page,'Пол','Паркетная доска');await button(page,'Готово').click();
    assert.equal((await api(path)).data.rooms.find(r=>r.id===room.id).areaM2,null);
    await button(page,'Назад').click();await button(page,'Помещения').click();await button(page,'Спальня').waitFor();
    await button(page,'Удалить Спальня').click();await button(page,'Отмена').click();await button(page,'Спальня').waitFor();
    await button(page,'Продолжить').click();await button(page,'Балкон и лоджия').click();await select(page,'Нужен ремонт?','Да');await select(page,'Что нужно отремонтировать?','Оба');
    // Normative areas stay empty, explicit refusals remain false.
    assert.equal(await page.getByLabel('Площадь балкона, м²',{exact:true}).inputValue(),'');
    const ceiling=button(page,'Потолок');await ceiling.first().click();await button(page,'Не требуется').click();
    await page.getByRole('checkbox',{name:'Освещение',exact:true}).first().click();
    await button(page,'Продолжить').click();await button(page,'Посмотреть расчёт').click();
    await page.getByRole('heading',{name:'Сравнение сметы',exact:true}).waitFor();snapshot=await api(path);
    assert.equal(snapshot.data.completedSections.length,4);assert.equal(snapshot.candidateEstimate.kitchen.expected,0);
    assert.equal(snapshot.data.exteriors.balcony.areaM2,null);assert.equal(snapshot.data.exteriors.balcony.lighting,false);
    const oldBudget=snapshot.project.budgetMinRub;
    await button(page,'Вернуться в проект').click();await button(page,'Уточнить параметры проекта').waitFor();
    assert.equal((await api('/projects/'+id)).budgetMinRub,oldBudget);
    await page.screenshot({path:`/tmp/prorab-mobile-${engine}.png`,fullPage:true});
    await button(page,'Уточнить параметры проекта').click();await button(page,'Посмотреть расчёт').click();await button(page,'Применить расчёт').click();
    await button(page,'Уточнить параметры проекта').waitFor();const applied=await api(path);
    assert.equal(applied.project.budgetMinRub,snapshot.candidateEstimate.total.min);assert.equal(applied.project.durationMinDays,snapshot.candidateEstimate.durationMinDays);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});

test('Mobile conflict: refresh preserves local input; only explicit retry overwrites server values',{timeout:60000},async()=>{
  const browser=await webkit.launch();try{
    const p=await activeProject(),path=`/projects/${p.projectId}/refinement`;
    const page=await browser.newPage({viewport:{width:390,height:844}});await installSession(page,account);await page.goto(`${front}/refinement/${p.projectId}`);
    await button(page,'Параметры квартиры').click();await page.getByLabel('Высота потолков, м',{exact:true}).fill('2,8');
    const old=await api(path);await api(path+'/apartment',{version:old.project.version,data:{...old.data.apartment,ceilingHeight:3.1}},'PUT');
    await button(page,'Продолжить').click();await button(page,'Загрузить актуальную версию, сохранив мой ввод').waitFor();
    assert.equal(await page.getByLabel('Высота потолков, м',{exact:true}).inputValue(),'2,8');assert.equal((await api(path)).data.apartment.ceilingHeight,3.1);
    assert.equal(await button(page,'Продолжить').isDisabled(),true);
    await button(page,'Загрузить актуальную версию, сохранив мой ввод').click();await page.getByRole('alert').filter({hasText:'Версия обновлена'}).waitFor();
    assert.equal((await api(path)).data.apartment.ceilingHeight,3.1);
    await button(page,'Продолжить').click();await button(page,'Параметры квартиры').waitFor();assert.equal((await api(path)).data.apartment.ceilingHeight,2.8);
  }finally{await browser.close();}
});
