# Design: add-pipeline-math

## Context

SPEC.md §6 описывает клиентский пайплайн; вся его математика — чистые функции, вынесенные в `pipeline-math.js` (§5.1). Модель настроек уже зафиксирована прототипом (`docs/prototype.html:349–363`): `page` a4|letter|auto, `orientation` auto|portrait|landscape, `margin` 0–30 мм (default 10), `fit` fit|fill, `quality` % (default 85), `filename` (default `scan`). DPI в UI отсутствует — это внутренний параметр рендера; change `update-spec-browser-risks` требует кап эффективного DPI 200 на мобильных.

## Goals / Non-Goals

**Goals:**

- ESM-модуль `web/pipeline-math.js` без зависимостей, работающий в главном потоке, воркере и Node.
- Полное покрытие `node --test`, включая граничные случаи.
- API, достаточный для этапов 3–4 без доработок математики.

**Non-Goals:**

- Любая работа с Canvas/ImageBitmap/DOM — только числа на входе и выходе.
- Выбор дефолтного DPI рендера — решение этапа 4 (pdf-worker); здесь только механика пересчёта и капа.
- HEIC-декодирование — сниф только детектирует формат для сообщения об ошибке.

## Decisions

### D1. ESM без зависимостей, тесты вне web/

Модуль — ESM (`export`), импортируется `pipeline.js`, воркером (`new Worker(..., {type:'module'})`) и тестами. Тесты лежат в `test/pipeline-math.test.js`, не в `web/` — иначе попадут в `//go:embed web` и будут раздаваться сервером. Следствие для этапа 4: `pdf-worker.js` обязан быть module-воркером, что также означает ESM-совместимую сборку pdf-lib — фиксируется здесь, проверяется спайком/этапом 4.

### D2. Единицы измерения

Страница и размещение — в PDF-пунктах (pt, 1/72"); растровые размеры — в px; мм — только на входе (`margin`). Конвертеры: `mmToPt(mm) = mm / 25.4 * 72`, `renderSizePx(wPt, hPt, dpi) = round(pt / 72 * dpi)`. Одна система единиц на границе функций исключает класс ошибок «pt перепутали с px».

### D3. API

```js
export const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] }; // pt

// page:'auto' → страница по размеру фото при данном DPI; orientation:'auto' → по аспекту фото
export function resolvePage(settings, imgW, imgH, dpi) => { wPt, hPt }

// fit=contain (src целиком, поля внутри рамки), fill=cover (src кропится по центру)
// src нужен для 9-аргументного drawImage при fill
export function placeImage(imgW, imgH, pageWPt, pageHPt, marginMm, mode)
  => { dest: {x, y, w, h}, src: {sx, sy, sw, sh} }   // dest в pt, src в px исходника

export function renderSizePx(wPt, hPt, dpi) => { w, h }
export function effectiveDpi(requested, isMobile) // isMobile → min(requested, 200)
export function mmToPt(mm)
export function sanitizeFilename(name) // whitelist, пусто → 'scan'
export function sniffFormat(bytes)     // 'jpeg'|'png'|'webp'|'heic'|'unknown'
```

### D4. Поворот — забота вызывающего

Пользовательский rotation (0/90/180/270) не параметр этих функций: вызывающий код передаёт уже «повёрнутые» imgW/imgH (при 90/270 — местами). Кроп-прямоугольник `src` считается в системе координат повёрнутого изображения; трансформацию Canvas применяет этап 3/4. Альтернатива (rotation как параметр) тянет состояние карточки в чистую математику и удваивает тестовую матрицу.

### D5. sniffFormat по сигнатурам

- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47`
- WebP: `RIFF` + байты 8–11 `WEBP`
- HEIC: ISOBMFF — байты 4–7 `ftyp`, major brand (байты 8–11) ∈ {`heic`, `heix`, `hevc`, `mif1`}
- Иначе `unknown`. Буфер короче нужного для проверки → `unknown`, не исключение.

`file.type` остаётся первичным сигналом на этапе 3; сниф — подстраховка от пустого/лживого MIME (SPEC §6.1 п.1).

### D6. sanitizeFilename

Удалить все символы вне `[a-zA-Z0-9._ -]`, схлопнуть повторные пробелы, обрезать пробелы/точки по краям, ограничить 120 символами; пустой результат → `scan`. Расширение `.pdf` добавляет вызывающий код — санитайзер про basename.

## Risks / Trade-offs

- [Кириллица в имени файла целиком выпадает под whitelist → `scan`] → приемлемо для MVP, whitelist из SPEC §6.2; расширение whitelist — отдельное решение, если начнёт раздражать.
- [`page:'auto'` при экстремальных размерах фото даёт экстремальные страницы] → pt-размер страницы = px/dpi×72, ограничений не вводим; PDF-читалки справляются, а кап DPI уже ограничивает растровую часть.
- [Module-воркер как следствие D1] → поддержан всеми целевыми браузерами (Safari ≥ 15, наш минимум 16.4); риска нет, но связь зафиксирована.

## Migration Plan

Новые файлы, ломать нечего. Откат — удалить два файла.

## Open Questions

Нет.
