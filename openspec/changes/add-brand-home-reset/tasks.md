# Tasks: add-brand-home-reset

## 1. Реализация

- [x] 1.1 `web/app.js`: метод `goHome()` — `_worker?.terminate()`, `_worker = null`, `clearAll()`, сброс `job` (D1)
- [x] 1.2 `web/index.html`: `.brand` — `@click="goHome()"`, `role="button"`, `tabindex="0"`, `@keydown.enter="goHome()"` (D2)
- [x] 1.3 `web/styles.css`: `.brand { cursor: pointer }` (+ лёгкий hover в стиле шапки)

## 2. Проверка

- [x] 2.1 E2e: добавить фикстуры → клик по логотипу → пустой экран, `images.length === 0`, настройки не сброшены
- [x] 2.2 E2e: сгенерировать PDF → на экране результата клик по логотипу → пустой экран; повторное добавление и генерация работают с чистым прогрессом
- [x] 2.3 E2e: клик по логотипу во время генерации → воркер убит, баннер ошибки не появился, консоль чистая
- [x] 2.4 Регрессия: `node --test`, `go build ./...`, `go test ./...`
- [x] 2.5 `openspec validate add-brand-home-reset` зелёный
