# Локальное приложение для iOS Simulator

Из корня репозитория:

```sh
npm --prefix mobile run ios:simulator
```

Команда генерирует iOS-проект через Expo (если его ещё нет) и собирает Release-приложение со встроенным JS-бандлом в `mobile/build/simulator`. Требуются Xcode, установленный iOS Simulator runtime и CocoaPods (`brew install cocoapods`). Сгенерированный проект `mobile/ios` не редактируется вручную.

Артефакт — `.app` для симулятора на этом Mac, не `.ipa` для физического iPhone. Его можно перетащить в окно запущенного Simulator. Metro и Expo Go для этой сборки не нужны.

В этой локальной сборке API закреплён на `http://127.0.0.1:8080/api`: симулятор обращается к backend на Mac. Для входа и работы с проектами должны быть запущены backend и PostgreSQL. Это не адрес для физического телефона или распространения приложения.

Существующие команды `npm --prefix mobile run ios` и `npm --prefix mobile start` по-прежнему используются для разработки с Expo Go.
