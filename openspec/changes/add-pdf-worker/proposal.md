# Proposal: add-pdf-worker

## Why

Последний этап MVP (SPEC.md §12, этап 4): всё до PDF уже работает — очередь реальных фото с миниатюрами, настройки, Go-сервер. Генерация пока заглушка-симуляция из прототипа. Этот change превращает «Создать PDF» в настоящий PDF: Web Worker + pdf-lib + реальный прогресс + доставка (download + share).

## What Changes

- Вендоринг `web/vendor/pdf-lib.esm.min.js` (~700 КБ) — ESM-сборка, потому что module-воркер не умеет `importScripts` (имя отличается от `pdf-lib.min.js` из SPEC §5.1 — заодно соблюдает правило «версия в имени»).
- Новый `web/pdf-worker.js` (module worker): последовательно для каждого фото — decode (`createImageBitmap` с EXIF), поворот + размещение на `OffscreenCanvas` по математике `pipeline-math.js`, JPEG-энкод с качеством из настроек, `embedJpg` + `drawImage`, `postMessage({done, total})`; в конце `save()` → transferable ArrayBuffer.
- `web/app.js`: `startGenerate` вместо симуляции запускает воркер, счётчик «n из m» — реальные сообщения; по завершении — Blob, автоскачивание через `<a download>`, кнопка «Скачать PDF» с blob URL и кнопка «Поделиться» через Web Share API при `navigator.canShare({files})` (требование browser-compat). Ошибка генерации — сообщение и возврат в сетку.
- Внутренний DPI рендера: 300, на мобильных капится до 200 через `effectiveDpi` (кап из browser-compat).
- `sanitizeFilename` из `pipeline-math.js` применяется к имени файла.
- Ревок blob URL готового PDF при повторной генерации.

## Capabilities

### New Capabilities

- `pdf-generation`: генерация PDF в воркере — вход/выход воркера, порядок и математика рендера страниц, реальный прогресс, обработка ошибок, доставка результата (автоскачивание, download-ссылка, share sheet).

### Modified Capabilities

<!-- browser-compat: требования «доставка PDF» и «кап DPI» уже зафиксированы там — здесь реализуются, требования не меняются. pipeline-math: используется как есть. -->

## Impact

- Новые файлы: `web/pdf-worker.js`, `web/vendor/pdf-lib.esm.min.js`.
- Изменяется: `web/app.js` (startGenerate, result-экран), `web/index.html` (кнопки скачивания/шаринга).
- SPEC.md: §12 DoD этапа 4; §2.1/§5.1 — фактическое имя vendor-файла pdf-lib.
- Закрывает последний открытый риск §10 «pdf-lib worker-safe» — проверка входит первой задачей.
