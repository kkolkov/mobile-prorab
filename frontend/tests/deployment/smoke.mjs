import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base = process.env.PRORAB_DEPLOY_URL || 'http://127.0.0.1:18080';
test('deployed JAR: same-origin registration, project persistence and private API', {timeout: 180000}, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    const apiOrigins = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiOrigins.push(new URL(request.url()).origin);
    });
    await page.goto(base);
    await page.getByRole('heading',{name:'Вход',exact:true}).waitFor();
    await page.getByRole('button', {name: 'Нет аккаунта? Зарегистрироваться'}).click();
    await page.getByLabel('Логин', {exact:true}).fill('deploy_' + crypto.randomUUID().replaceAll('-', ''));
    await page.getByLabel('Пароль', {exact:true}).fill('Deployment-test-123');
    assert.equal(await page.getByRole('button',{name:'Создать аккаунт',exact:true}).isDisabled(),true);
    await page.getByRole('checkbox',{name:'Я согласен на обработку персональных данных'}).check();
    await page.getByRole('button', {name:'Создать аккаунт', exact:true}).click();
    await page.getByRole('heading', {name:'Мои проекты'}).waitFor();
    await page.getByText('Создайте новый проект.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Создать проект',exact:true}).click();
    await page.getByRole('heading',{name:'Расскажите о себе',exact:true}).waitFor();
    for(const name of ['Нет','Я сам(а)','Планирую'])await page.getByRole('radio',{name,exact:true}).check();
    await page.getByRole('button',{name:'Продолжить',exact:true}).click();
    await page.locator('#area').fill('33');await page.locator('#name').fill('Проверка размещения');
    await page.getByRole('button',{name:'Продолжить',exact:true}).click();
    await page.getByRole('heading',{name:'Текущее состояние квартиры',exact:true}).waitFor();
    await page.locator('[data-value="old_finish"]').click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
    await page.getByRole('heading',{name:'Желаемый результат ремонта',exact:true}).waitFor();
    assert.equal(await page.getByText('Что входит',{exact:false}).count(),0);
    await page.locator('[data-value="move_in_ready"]').click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
    await page.getByText('Количество комнат',{exact:true}).waitFor();
    await page.locator('[data-plus="k"]').click();await page.locator('[data-plus="k"]').click();
    await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.locator('[data-value="comfort"]').click();
    await page.getByRole('button',{name:'Получить оценку',exact:true}).click();
    await page.getByText('4 мес. 10 дн. — 6 мес.',{exact:true}).waitFor();
    await page.getByText('Из чего складывается оценка',{exact:true}).click();
    await page.getByText('Черновые материалы:',{exact:false}).waitFor();
    assert.ok(await page.locator('.estimate-details tbody tr').count()>0);
    await page.getByText('Из чего складывается оценка',{exact:true}).click();
    await page.getByRole('button',{name:'Перейти в проект',exact:true}).click();
    await page.getByRole('heading',{name:'Планирование',exact:true}).waitFor();
    const durationBox=await page.getByText('4 мес. 10 дн. — 6 мес.',{exact:true}).boundingBox();
    const statusBox=await page.getByText('Статус',{exact:true}).boundingBox();
    const refineBox=await page.getByRole('button',{name:'Уточнить параметры проекта',exact:true}).boundingBox();
    assert.ok(statusBox.y>=durationBox.y+durationBox.height);
    assert.ok(refineBox.y>=durationBox.y+durationBox.height);

    await page.getByRole('button',{name:'Уточнить параметры проекта',exact:true}).click();
    const exteriorCard=page.locator('[data-open="exteriors"]');
    await exteriorCard.getByText('Не уточнено',{exact:true}).waitFor();
    await exteriorCard.click();
    assert.equal(await page.getByLabel('Нужен ремонт?',{exact:true}).inputValue(),'no');
    await page.getByRole('button',{name:'Назад',exact:true}).click();
    await exteriorCard.getByText('Есть несохранённый ввод',{exact:true}).waitFor();
    await exteriorCard.click();
    await page.getByRole('button',{name:'Продолжить',exact:true}).click();
    await exteriorCard.getByText('Данные указаны',{exact:true}).waitFor();
    await page.reload();await exteriorCard.getByText('Данные указаны',{exact:true}).waitFor();
    await exteriorCard.click();
    await page.getByLabel('Нужен ремонт?',{exact:true}).selectOption('yes');
    await page.getByLabel('Что нужно отремонтировать?',{exact:true}).selectOption('both');
    assert.deepEqual(await page.locator('fieldset legend').allTextContents(), ['Балкон','Лоджия']);

    await page.goto(base);await page.getByText('Продолжите ремонт или создайте новый проект.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Переименовать: Проверка размещения',exact:true}).click();
    await page.getByLabel('Название проекта',{exact:true}).fill('Проверка обновления Render');
    await page.getByRole('button',{name:'Сохранить',exact:true}).click();
    await page.getByRole('button',{name:'Переименовать: Проверка обновления Render',exact:true}).waitFor();
    await page.reload();await page.getByRole('button',{name:'Переименовать: Проверка обновления Render',exact:true}).waitFor();
    const saved=await page.evaluate(async()=>{const {token}=JSON.parse(localStorage.getItem('prorab.auth.v1'));return (await fetch('/api/projects',{headers:{Authorization:`Bearer ${token}`}})).json();});
    assert.equal(saved.length,1);assert.equal(saved[0].roomsCount,3);assert.equal(saved[0].kitchensCount,1);
    assert.equal(saved[0].estimateDetails.algorithmVersion,'unit-pricing-3');
    assert.equal(saved[0].estimateDetails.total.withReserve,Math.round(saved[0].estimateDetails.total.max*1.1));
    assert.equal(saved[0].budgetMinRub,saved[0].estimateDetails.total.min);
    assert.ok(apiOrigins.length > 0);
    assert.deepEqual([...new Set(apiOrigins)], [new URL(base).origin]);
    assert.deepEqual(errors, []);
    assert.equal((await fetch(base + '/api/projects')).status, 401);
    for (const path of ['/package.json', '/dev_server.py', '/tests/browser/auth.test.mjs']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
  } finally { await browser.close(); }
});
