import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base = process.env.PRORAB_DEPLOY_URL || 'http://127.0.0.1:18080';
test('deployed JAR: same-origin registration, project persistence and private API', {timeout: 90000}, async () => {
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
    await page.getByRole('button', {name: 'Нет аккаунта? Зарегистрироваться'}).click();
    await page.getByLabel('Логин', {exact:true}).fill('deploy_' + crypto.randomUUID().replaceAll('-', ''));
    await page.getByLabel('Пароль', {exact:true}).fill('Deployment-test-123');
    await page.getByRole('button', {name:'Создать аккаунт', exact:true}).click();
    await page.getByRole('heading', {name:'Мои проекты'}).waitFor();
    const status = await page.evaluate(async () => {
      const {token} = JSON.parse(localStorage.getItem('prorab.auth.v1'));
      return (await fetch('/api/projects/draft', {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({areaM2:33, name:'Проверка размещения'})
      })).status;
    });
    assert.equal(status, 200);
    await page.reload();
    await page.getByRole('button', {name:/Проверка размещения/}).waitFor();
    assert.ok(apiOrigins.length > 0);
    assert.deepEqual([...new Set(apiOrigins)], [new URL(base).origin]);
    assert.deepEqual(errors, []);
    assert.equal((await fetch(base + '/api/projects')).status, 401);
    for (const path of ['/package.json', '/dev_server.py', '/tests/browser/auth.test.mjs']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
  } finally { await browser.close(); }
});
