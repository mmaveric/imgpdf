# Tasks: add-go-static-server

## 1. Каркас проекта

- [ ] 1.1 `go mod init imgpdf` (Go 1.22+), добавить `github.com/skip2/go-qrcode`
- [ ] 1.2 Создать `web/index.html` копией `docs/prototype.html`
- [ ] 1.3 `embed.go` в корне модуля: `//go:embed web` → экспорт `embed.FS`

## 2. Сервер

- [ ] 2.1 `cmd/imgpdf/main.go`: флаги `--host`/`--port`/`--dev`, выбор источника статики (`fs.Sub(embedFS)` vs `os.DirFS("web")`)
- [ ] 2.2 Cache-middleware: `/` и `index.html` → `no-cache`; `/vendor/*` → `public, max-age=604800`; всё → `no-cache` в `--dev`
- [ ] 2.3 `/healthz` → `200 OK`
- [ ] 2.4 Чистая функция `lanAddrs`: фильтр up/не-loopback/IPv4 из `[]net.Addr`; печать URL при старте; ASCII QR для первого RFC 1918-адреса; при конкретном `--host` — только он
- [ ] 2.5 Graceful shutdown: `signal.NotifyContext(SIGINT, SIGTERM)` + `srv.Shutdown` с таймаутом 5 с

## 3. Тесты

- [ ] 3.1 httptest: `/healthz` → 200; `/` → 200 + `no-cache`; `/vendor/x.js` → `max-age=604800`; dev-режим → всё `no-cache`; `/api/anything` → 404
- [ ] 3.2 Юнит-тест `lanAddrs` на подготовленных `[]net.Addr`
- [ ] 3.3 `go vet ./...` и `go test ./...` зелёные

## 4. Ручная проверка и спека

- [ ] 4.1 Запустить, открыть с телефона по напечатанному LAN-адресу / QR — прототип открывается и кликается
- [ ] 4.2 Проверить `--dev`: правка `web/index.html` видна по F5 без пересборки
- [ ] 4.3 SPEC.md §12: перенести этап 5 сразу после этапа 1, обновить колонку DoD (примечание, что web/ пока копия прототипа); зафиксировать правило «смена версии vendor-файла = смена имени файла» в §5.2
- [ ] 4.4 `openspec validate add-go-static-server` зелёный
