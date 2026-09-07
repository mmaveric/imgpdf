# Tasks: add-pipeline-math

## 1. Модуль web/pipeline-math.js

- [x] 1.1 Константы и конвертеры: `PAGE_SIZES`, `mmToPt`, `renderSizePx`
- [x] 1.2 `resolvePage(settings, imgW, imgH, dpi)`: форматы a4/letter, `page:'auto'` по размеру фото, `orientation:'auto'` по аспекту
- [x] 1.3 `placeImage(imgW, imgH, pageWPt, pageHPt, marginMm, mode)`: fit=contain с центрированием, fill=cover с центральным src-кропом
- [x] 1.4 `effectiveDpi(requested, isMobile)`: кап 200 на мобильных
- [x] 1.5 `sanitizeFilename(name)`: whitelist, схлопывание пробелов, обрезка краёв, лимит 120, fallback `scan`
- [x] 1.6 `sniffFormat(bytes)`: JPEG/PNG/WebP/HEIC(ftyp+бренды), короткий буфер → `unknown`

## 2. Тесты test/pipeline-math.test.js (node --test)

- [x] 2.1 `resolvePage`: все 3 формата × 3 ориентации, авто-ориентация на портретном и альбомном фото, auto-страница с DPI
- [x] 2.2 `placeImage`: fit/fill на совпадающем и не совпадающем аспекте, поля 0/10/30 мм, src-кроп при fill центрирован и с верным аспектом
- [x] 2.3 `renderSizePx`/`effectiveDpi`/`mmToPt`: контрольные числа (A4@150 → 1240×1754), кап 200/без капа
- [x] 2.4 `sanitizeFilename`: кириллица/спецсимволы, пустая строка, только точки/пробелы, длина > 120
- [x] 2.5 `sniffFormat`: валидные сигнатуры всех 4 форматов, все 4 HEIC-бренда, мусор, буферы 0–11 байт

## 3. Завершение

- [x] 3.1 `node --test test/` зелёный
- [x] 3.2 SPEC.md §12: отметить DoD этапа 2
- [x] 3.3 `openspec validate add-pipeline-math` зелёный
