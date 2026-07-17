# static-server — delta

## ADDED Requirements

### Requirement: Запуск и флаги
Бинарник SHALL принимать флаги `--host` (default `0.0.0.0`), `--port` (default `8080`) и `--dev`. Без `--dev` статика SHALL раздаваться из `embed.FS`; с `--dev` — из директории `web/` на диске, чтобы правки были видны без пересборки.

#### Scenario: Запуск по умолчанию
- **WHEN** бинарник запущен без флагов
- **THEN** сервер слушает `0.0.0.0:8080` и раздаёт встроенную (embed) копию `web/`

#### Scenario: Dev-режим
- **WHEN** бинарник запущен с `--dev` и файл `web/index.html` изменён на диске после запуска
- **THEN** следующий запрос `GET /` возвращает изменённое содержимое без пересборки

### Requirement: Только статика
Сервер SHALL раздавать только статические файлы; API-роуты SHALL отсутствовать. Единственное исключение — `/healthz`.

#### Scenario: Корень отдаёт приложение
- **WHEN** клиент запрашивает `GET /`
- **THEN** возвращается `200` с содержимым `web/index.html`

#### Scenario: Несуществующий путь
- **WHEN** клиент запрашивает `GET /api/anything`
- **THEN** возвращается `404`

### Requirement: Печать LAN-адресов и QR при старте
При старте сервер SHALL перечислить активные не-loopback IPv4-адреса интерфейсов и напечатать для каждого URL вида `http://<ip>:<port>`. Для первого приватного (RFC 1918) адреса SHALL печататься ASCII QR-код этого URL. Если `--host` задан конкретным (не wildcard) адресом, SHALL печататься только он.

#### Scenario: Старт в LAN
- **WHEN** сервер запущен на машине с адресом `192.168.1.10`
- **THEN** в консоли напечатан `http://192.168.1.10:8080` и ASCII QR-код этого URL

#### Scenario: Явный host
- **WHEN** сервер запущен с `--host 127.0.0.1`
- **THEN** напечатан только `http://127.0.0.1:8080`, перечисление интерфейсов не выполняется

### Requirement: Healthcheck
Сервер SHALL отвечать `200 OK` на `GET /healthz`.

#### Scenario: Проверка живости
- **WHEN** клиент запрашивает `GET /healthz`
- **THEN** возвращается `200` с телом `OK`

### Requirement: Graceful shutdown
По `SIGINT` или `SIGTERM` сервер SHALL завершиться корректно: перестать принимать новые соединения и дождаться активных запросов в пределах таймаута 5 секунд.

#### Scenario: Остановка по Ctrl+C
- **WHEN** процессу отправлен `SIGINT`
- **THEN** сервер завершает активные запросы и процесс выходит с кодом 0

### Requirement: Кеш-политика
`index.html` (и `/`) SHALL отдаваться с `Cache-Control: no-cache`. Файлы под `/vendor/` SHALL отдаваться с `Cache-Control: public, max-age=604800`. В `--dev` режиме все ответы SHALL иметь `Cache-Control: no-cache`.

#### Scenario: index.html не кешируется
- **WHEN** клиент запрашивает `GET /` в обычном режиме
- **THEN** ответ содержит заголовок `Cache-Control: no-cache`

#### Scenario: vendor кешируется
- **WHEN** клиент запрашивает `GET /vendor/pdf-lib.min.js` в обычном режиме
- **THEN** ответ содержит заголовок `Cache-Control: public, max-age=604800`

#### Scenario: dev-режим без кеша
- **WHEN** клиент запрашивает `GET /vendor/pdf-lib.min.js` при запуске с `--dev`
- **THEN** ответ содержит заголовок `Cache-Control: no-cache`
