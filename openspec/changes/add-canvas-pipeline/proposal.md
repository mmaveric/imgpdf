# Proposal: add-canvas-pipeline

## Why

Этап 3 плана SPEC.md §12: превратить кликабельный прототип в приложение, принимающее реальные файлы. Сейчас `web/index.html` — копия прототипа с моками (`addMock`, симуляция прогресса) и CDN-зависимостью SortableJS, что нарушает §2.1 (офлайн-LAN без CDN). Это последний этап перед pdf-worker: без реального ingest нечего отдавать в генерацию.

## What Changes

- Нарезка прототипа: `web/index.html` (разметка) + `web/styles.css` + `web/app.js` (Alpine store) вместо монолитного файла.
- Вендоринг `web/vendor/alpine.esm.js` и `web/vendor/sortable.min.js` — CDN-ссылки исчезают (§2.1).
- Новый `web/pipeline.js`: приём файлов → сниф формата (HEIC → карточка ошибки) → `createImageBitmap(..., {imageOrientation:'from-image'})` → thumbnail 320px → objectURL; реальный прогресс обработки вместо симуляции.
- Реальные источники файлов: drag&drop + клик на десктопе, камера/галерея на мобильном (`<input type="file">`) — в прототипе их нет вообще.
- Управление памятью: `revokeObjectURL` при удалении/очистке, мягкие лимиты очереди (предупреждение и потолок).
- Feature-detect `OffscreenCanvas` при старте → экран «браузер не поддерживается» (требование browser-compat).
- Генерация PDF остаётся симуляцией прототипа — её заменяет этап 4.

## Capabilities

### New Capabilities

- `canvas-pipeline`: приём и подготовка изображений в браузере — источники файлов, детект формата и HEIC-ошибка, декодирование с EXIF-ориентацией, миниатюры, прогресс обработки, управление памятью и лимиты очереди.

### Modified Capabilities

<!-- browser-compat: требование «неподдерживаемый браузер» уже зафиксировано, здесь реализуется. pipeline-math: используется без изменений. -->

## Impact

- Новые файлы: `web/app.js`, `web/pipeline.js`, `web/styles.css`, `web/vendor/alpine.esm.js`, `web/vendor/sortable.min.js`.
- Переписывается: `web/index.html` (из копии прототипа — в настоящую разметку без CDN и моков).
- Зависимости: vendored Alpine.js + SortableJS (версии пиновать в имени файла или комментарии).
- Импортирует `web/pipeline-math.js` (change `add-pipeline-math`) — `sniffFormat`; зависит от него в порядке apply.
- DoD включает тест EXIF-ориентации на реальном iPhone (browser-compat, этап 3 DoD).
