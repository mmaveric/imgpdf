# Proposal: add-go-static-server

## Why

Мобильный Safari — главный источник сюрпризов проекта (EXIF-ориентация, OffscreenCanvas, память, download больших Blob), а DoD этапа 3 теперь требует теста на реальном iPhone. По плану SPEC.md §12 Go-сервер идёт последним (этап 5) — это значит, что доступ с телефона по LAN появляется только в конце. Переносим этап 5 вперёд: сервер — 50–100 строк без зависимостей от остального кода, зато этапы 3–4 тестируются на реальном телефоне с первого дня.

## What Changes

- Новый Go-бинарник `cmd/imgpdf/main.go`: статический файл-сервер поверх `embed.FS` без единого API-роута (SPEC.md §5.2).
- Флаги `--host` (default `0.0.0.0`), `--port` (default `8080`), `--dev` (раздача `web/` с диска для живой правки без пересборки).
- При старте — печать всех LAN-адресов (`net.Interfaces()`) + ASCII QR-код через `go-qrcode` (§5.3).
- `/healthz` → `200 OK`; graceful shutdown по `SIGINT`/`SIGTERM`.
- Кеш-политика: `Cache-Control: no-cache` для `index.html`, `max-age` для `vendor/*`.
- Каркас `web/`: копия `docs/prototype.html` как `web/index.html` — чтобы серверу было что раздавать и с телефона сразу открывался кликабельный прототип. Настоящая нарезка на `app.js`/`styles.css` — этап 3, не этот change.

## Capabilities

### New Capabilities

- `static-server`: раздача статики по LAN — флаги запуска, embed vs dev-режим, печать LAN-адресов и QR, healthcheck, graceful shutdown, кеш-политика.

### Modified Capabilities

<!-- browser-compat не трогаем: серверная часть не меняет браузерных требований. -->

## Impact

- Новые файлы: `cmd/imgpdf/main.go`, `go.mod`, `web/index.html` (копия прототипа), `web/vendor/` (пока пустой или отсутствует).
- Новая зависимость: `github.com/skip2/go-qrcode` (единственная, без CGo).
- SPEC.md §12 фактически меняет порядок этапов (5 раньше 2–4) — правка таблицы плана в рамках этого change.
- Кросс-компиляция тривиальна (нет CGo) — Makefile можно отложить до этапа 6.
