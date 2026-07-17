# Proposal: add-pipeline-math

## Why

Этап 2 плана SPEC.md §12 — чистая математика пайплайна (fit/fill, page-size↔DPI, санитайзер, сниф формата). Это фундамент этапов 3–4: canvas-пайплайн и pdf-worker вызывают эти функции, и ошибки в математике размещения — самые дорогие для отладки в браузере. Чистые функции тестируются через `node --test` без браузера вообще.

## What Changes

- Новый ESM-модуль `web/pipeline-math.js` без зависимостей: размер страницы (A4/Letter/auto, ориентация auto/portrait/landscape), размещение fit/fill с полями (включая кроп-прямоугольник для fill), пересчёт pt→px по DPI, кап эффективного DPI на мобильных, `sanitizeFilename`, `sniffFormat` (JPEG/PNG/WebP/HEIC по сигнатурам).
- Юнит-тесты `test/pipeline-math.test.js` через встроенный `node --test`, без тестовых зависимостей.
- Модель настроек — ровно та, что в прототипе (`docs/prototype.html`): `page` a4|letter|auto, `orientation` auto|portrait|landscape, `margin` 0–30 мм, `fit` fit|fill, `quality` %.

## Capabilities

### New Capabilities

- `pipeline-math`: чистые функции геометрии страницы, размещения изображения, DPI-пересчёта и валидации входа (имя файла, формат по сигнатуре).

### Modified Capabilities

<!-- browser-compat не меняется: кап DPI 200 уже зафиксирован там как требование; здесь появляется функция, которая его реализует. -->

## Impact

- Новые файлы: `web/pipeline-math.js`, `test/pipeline-math.test.js`.
- Зависимостей нет (ни runtime, ни dev).
- Этапы 3–4 (pipeline.js, pdf-worker.js) будут импортировать этот модуль; воркер должен быть `type: 'module'` — это ограничение фиксируется в design.
- SPEC.md §12: отметка DoD этапа 2 по завершении.
