# Android APK

## Выпуск 4 — 20 октября 2026

Новый пастельный интерфейс, разбивка расчёта по справочнику и зелёная иконка
«МП». Версия 1.0.0, versionCode 4, пакет `ru.prorab.mobile`, прежний ключ подписи.
API: `https://mobile-prorab.onrender.com/api`.

Сборка: https://expo.dev/accounts/kkolkov/projects/mobile-prorab/builds/6c438a34-1d33-4dcc-ae14-57a122417766
На момент записи ожидается завершение EAS. Предыдущая попытка без новой иконки
отменена и не предназначена для установки.

Исходник знака — `mobile/assets/brand-mark.svg`. `icon.png` — непрозрачный
1024×1024, фон #365c4c; `adaptive-icon.png` — прозрачный передний план 1024×1024.
Буквы расположены в центральной безопасной области адаптивной иконки;
форму внешнего контура задаёт Android. Настройки соответствуют
[руководству Expo](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).
Иконка также задана для тематического оформления Android.

Android использует существующие экраны и логику Expo из `mobile/src`.
Нативный проект в `mobile/android` генерируется Expo, вручную не редактируется
и не хранится в Git. Его настройки находятся в `mobile/app.json`.

## Сборка для установки на телефон

Из корня репозитория:

```sh
npm --prefix mobile run android:apk
```

Нужен вход в Expo: `cd mobile && npx eas-cli@latest login`.
Проект: https://expo.dev/accounts/kkolkov/projects/mobile-prorab

Профиль `preview` в `mobile/eas.json` собирает подписанный APK для внутреннего
тестирования. Ключ подписи хранится в Expo. Это самостоятельное приложение:
Expo Go, Metro и работающий Mac не нужны. API вшивается при сборке:
`https://mobile-prorab.onrender.com/api`. Аккаунты и проекты общие с вебом.
Сервер Render должен быть доступен; при холодном старте может потребоваться
повторить запрос после пробуждения сервера.

Ссылка на APK появляется в завершённой сборке Expo. Скачайте файл на Android
и разрешите установку из выбранного браузера/файлового менеджера. Для обновлений
используйте тот же ключ подписи; `android.versionCode` повышайте перед выпуском.

## Генерация нативного проекта

```sh
npm --prefix mobile run android:prebuild
```

Для локальной компиляции потребуются Android SDK и JDK; сейчас используется
облачная сборка EAS. `.easignore` исключает документы, backend, веб-клиент,
локальные настройки и сгенерированные нативные проекты из загрузки.

## Проверки

```sh
npm --prefix mobile test
npm --prefix mobile run typecheck
npm --prefix mobile run lint
```

Успешный экспорт JavaScript для Android не заменяет сборку APK и проверку
на Android-устройстве. После установки проверить вход, восстановление сессии,
создание проекта CP-01–06, уточнение, ошибки сети и системную кнопку «Назад».

## Первая сборка

APK: `mobile/build/android/mobile-prorab-1.0.0.apk` (92 МиБ).
SHA-256 находится рядом в `.apk.sha256`.
Сборка: https://expo.dev/accounts/kkolkov/projects/mobile-prorab/builds/f11dbe5c-e1e0-4097-8b05-39ed6aad8a93

EAS завершил сборку успешно. Целостность APK и наличие встроенного Android JS
проверены; установка и интерфейс на Android-устройстве пока не проверены.

## Регистрация с согласием — 19 октября 2026

Сборка versionCode 2: https://expo.dev/accounts/kkolkov/projects/mobile-prorab/builds/d622831a-222c-4629-95b7-5a26afa4283b
Включает чекбокс и полноэкранную политику с LOREM IPSUM. На момент записи
сборка стоит в очереди EAS; новый APK локально ещё не скачан. Файл
`mobile-prorab-1.0.0.apk` остаётся предыдущей сборкой без этого изменения.
Клиент отправляет privacyAccepted; серверная проверка и веб-экран пока
изменены только локально, на Render не опубликованы.


## APK №7 — 28 октября 2026

Сборка da2d19a1-56e7-40a7-925f-5471c05a573e, commit 89030e4.
https://expo.dev/artifacts/eas/ZvNwmZVrBemr78f-huWivySWdCGCbgCWk4IheOuHw6Q.apk
Локально mobile/build/android/mobile-prorab-1.0.0-build7.apk.
ZIP без повреждений; apksigner verify прошёл; SHA-256 сертификата
fa10c67409b39ebc8fad392db5ab41b5452022fe17f3161b1d3aa5536f5ab5c9,
совпадает с APK №5. Package ru.prorab.mobile, versionCode 7, minSdk24,
INTERNET и публичный HTTPS API подтверждены. Физическая установка не проверена.
Содержит опубликованный релиз цен/сроков catalog-pricing-5; новая политика и
локальная catalog-pricing-6 разрабатывались после отправки сборки и в неё не входят.


## APK №8 — релиз 4d67c60

https://expo.dev/artifacts/eas/y1SvHMG0OruUkmYgoa43ifKUjbgmwMOr6tY5710VAmg.apk
EAS 769e97a0-2cf8-4bd5-bdd6-e0110e8177f4, готова 28.10.2026 19:34 UTC.
Локально mobile/build/android/mobile-prorab-1.0.0-build8.apk.
Включает политику и смену пароля, использует API Render с catalog-pricing-7.
ZIP без повреждений, apksigner verify успешен, сертификат совпадает с №5/7;
ru.prorab.mobile, versionCode8, minSdk24, INTERNET, публичный API и маршрут
/auth/password в bundle подтверждены. Физическое устройство не проверено.


## Релиз 6fe8b90 / APK №9 — 29.10.2026

Веб опубликован: /porabadmin/guide.html совпадает с локальной версией.
Публичный API smoke прошёл: создание, пересчёт, применение, финансы и график.
Frontend 20/20, mobile 15/15, typecheck и lint прошли.
APK: https://expo.dev/artifacts/eas/ALY_776QqKueKc4tSeSlI5NWLG5pkUapMs48z0xK2No.apk
EAS a394a9cf-812e-418a-82bf-784faa876b8f; локально mobile/build/android/mobile-prorab-1.0.0-build9.apk.
ZIP и apksigner проверены; сертификат совпадает с №8, versionCode 9, minSdk24,
публичный HTTPS API подтверждён. На физическом Android установка не проверялась.

## Подготовка APK №10 — 29.10.2026

versionCode 10, production API Render. Включает обновления мастера/уточнения, компактную детализацию, новые цены и сохранённый резерв из расчёта. Админка коэффициентов — на сервере; её изменения применяются к следующему расчёту. Статус сборки и ссылка добавляются после EAS.
