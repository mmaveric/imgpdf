# Tasks: add-pdf-worker

## 1. Спайк и вендоринг

- [x] 1.1 Vendored `web/vendor/pdf-lib.esm.min.js` (версия комментарием в первой строке)
- [x] 1.2 Node-спайк worker-safety: ESM-импорт vendored сборки, PDF из 3 JPEG через `embedJpg` собирается и парсится — риск §10 закрыт

## 2. pdf-worker.js

- [x] 2.1 Контракт сообщений: приём `{pages, settings, dpi}`, ответы `progress`/`done`(transferable)/`error`
- [x] 2.2 Цикл страницы: `createImageBitmap`(EXIF) → swap размеров при 90/270 → `resolvePage`/`renderSizePx`/`placeImage` → переиспользуемый `OffscreenCanvas` (белый фон, transform для rotation, 9-арг `drawImage`) → `convertToBlob(jpeg, quality)` → `embedJpg`+`drawImage` → `bitmap.close()` → progress
- [x] 2.3 `save()` → ArrayBuffer transferable; try/catch всего цикла → `error`

## 3. Интеграция app.js / index.html

- [x] 3.1 `startGenerate`: собрать pages из readyImages, `effectiveDpi(300, isMobile)` (UA-детект), запуск воркера, удалить симуляцию
- [x] 3.2 Прогресс по сообщениям; `done` → Blob + objectURL: автоскачивание `<a download>`, кнопка «Скачать PDF» с тем же URL; revoke предыдущего URL
- [x] 3.3 Кнопка «Поделиться» при `canShare({files})`: `navigator.share`, `AbortError` глотается
- [x] 3.4 `error` → сообщение + возврат в grid без потери очереди
- [x] 3.5 Имя файла: `sanitizeFilename(settings.filename) + '.pdf'`

## 4. Проверка

- [x] 4.1 Playwright e2e: фикстуры → генерация → download перехвачен, файл `%PDF-`, парсится в Node, страниц = ready-карточек, счётчик дошёл до n/n, консоль чистая
- [x] 4.2 Fill-режим + поворот 90° + Letter + качество 50 — повторный прогон с другими настройками
- [x] 4.3 Регрессия: `node --test`, `go build`, `go test`
- [x] 4.4 SPEC.md: §12 DoD этапа 4; §2.1/§5.1 — имя vendor-файла `pdf-lib.esm.min.js`
- [x] 4.5 `openspec validate add-pdf-worker` зелёный
- [ ] 4.6 Ручной хвост (iPhone, вместе с 4.2 этапа 3): генерация 150+ страниц, download и share sheet на реальном устройстве

## Backlog-кандидаты (не в этом change)

- Per-page кламп DPI по размеру исходника (не апскейлить мелкие фото)
- Пропуск битой страницы с предупреждением вместо аборта
