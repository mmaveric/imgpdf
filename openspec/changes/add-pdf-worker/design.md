# Design: add-pdf-worker

## Context

Этапы 2–3 + сервер готовы: `pipeline-math.js` (математика, 19 тестов), `pipeline.js`/`app.js` (очередь с реальными файлами, `startGenerate` — помеченная заглушка), `imgpdf --dev`. Осталась генерация: SPEC §6.2 описывает воркер-цикл, browser-compat фиксирует кап DPI 200 на мобильных и доставку download+share. Записи очереди уже хранят `File` + `rotation` + размеры после EXIF — ровно то, что нужно воркеру.

## Goals / Non-Goals

**Goals:**

- Валидный PDF из очереди с реальным прогрессом «n из m», UI не фризится.
- Доставка: автоскачивание + download-ссылка + share sheet (где поддержан).
- Память по бюджету §6.3: последовательная обработка, один decode одновременно.

**Non-Goals:**

- Прогноз размера PDF, per-page кламп DPI по размеру исходника — бэклог (отмечу в §4 при полировке, если дойдёт).
- Обложки/метаданные PDF, сжатие сверх JPEG.
- HEIC — уже отфильтрован на ingest, в воркер не попадает.

## Decisions

### D1. ESM-сборка pdf-lib, module worker

`pdf-worker.js` обязан быть module-воркером (импортирует `pipeline-math.js`, решение зафиксировано в design этапа 2). Module worker не поддерживает `importScripts()` → UMD-сборка `pdf-lib.min.js` не годится. Вендорим `dist/pdf-lib.esm.min.js` под именем `pdf-lib.esm.min.js` (заодно выполняется правило §5.2 «версия/вариант = имя»). Worker-safety проверяется первой задачей: импорт + сборка 3-страничного PDF в Node (та же среда без DOM), затем реальный e2e в браузере.

### D2. Контракт воркера

```
main → worker: {
  pages: [{file: File, rotation: 0|90|180|270, width, height}],  // только ready
  settings: {page, orientation, margin, fit, quality},
  dpi: number   // уже effectiveDpi(300, isMobile) — детект в главном потоке
}
worker → main: {type:'progress', done, total}
             | {type:'done', bytes: ArrayBuffer}   // transferable
             | {type:'error', message}
```

`File` проходит structured clone дёшево (ссылка на диск, не копия байтов). `isMobile` детектится в главном потоке (`navigator.userAgentData.mobile` + UA-fallback) — в воркере UA-Client Hints доступны не везде.

### D3. Цикл рендера страницы (в воркере)

1. `createImageBitmap(file, {imageOrientation:'from-image'})` — доступен в воркерах.
2. Повёрнутые размеры: при rotation 90/270 — swap width/height (контракт pipeline-math D4).
3. `resolvePage(settings, rw, rh, dpi)` → размер страницы pt; `renderSizePx` → канвас страницы; `placeImage` → dest (pt→px тем же масштабом) + src-кроп.
4. `OffscreenCanvas` размером страницы в px, белая заливка (поля), `translate/rotate` для rotation, 9-аргументный `drawImage` src→dest.
5. `convertToBlob({type:'image/jpeg', quality: settings.quality/100})` → `embedJpg` → `page.drawImage` на всю страницу pt.
6. `bitmap.close()`, канвас обнуляется (память, §10); `postMessage(progress)`.

Один `OffscreenCanvas` переиспользуется между страницами (лимит суммарной canvas-памяти Safari).

### D4. Ошибка = абрис всей генерации

Файл не декодировался в воркере (хотя прошёл ingest — гонка/битый диск): `{type:'error'}`, UI показывает сообщение и возвращает в сетку. Частичный PDF без страницы — тихая потеря данных, хуже честного отказа. Пропуск-с-предупреждением — кандидат в полировку.

### D5. Доставка результата

По `done`: `Blob(['application/pdf'])` → objectURL → программный клик по `<a download="name.pdf">` (автоскачивание, ФТ-7) + тот же URL на кнопке «Скачать PDF». Если `navigator.canShare({files:[pdfFile]})` — рядом кнопка «Поделиться» → `navigator.share({files})` (browser-compat; требует user gesture — на кнопке он есть; отказ пользователя от share — не ошибка, глотаем `AbortError`). Имя: `sanitizeFilename(settings.filename) + '.pdf'`. Предыдущий objectURL revoke при новой генерации и при `clearAll`.

### D6. Верификация

- Node-спайк (задача 1): ESM-импорт vendored pdf-lib, PDF из 3 JPEG — worker-safety без браузера.
- Playwright e2e: фикстуры → генерация → перехват download → файл начинается с `%PDF-`, парсится pdf-lib'ом в Node, число страниц = числу ready-карточек, прогресс дошёл до n/n.
- Регрессия: `node --test`, `go build`.
- iPhone: реальный PDF 150+ страниц — ручной хвост вместе с 4.2 этапа 3.

## Risks / Trade-offs

- [ESM-сборка pdf-lib может тянуть отличия от UMD] → спайк первой задачей; фолбэк — classic worker + UMD + дублирование констант из pipeline-math (некрасиво, но работает).
- [Пик памяти на save() при 200 стр × 300 DPI на десктопе ~1 ГБ] → принято и задокументировано (§6.3); мобильные защищены капом 200.
- [`convertToBlob` quality в Safari мог игнорироваться в старых версиях] → минимум 16.4 уже отсекает проблемные; проверяется на ручном прогоне.
- [Автоскачивание без user gesture блокируется некоторыми браузерами] → download-ссылка остаётся на экране результата; автоклик — best effort.

## Migration Plan

Заглушка `startGenerate` заменяется целиком; откат — git revert одного change. Web-слой самодостаточен, сервер не трогается.

## Open Questions

Нет.
