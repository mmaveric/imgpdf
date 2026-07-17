# Tasks: add-pipeline-math

## 1. Модуль web/pipeline-math.js

- [ ] 1.1 Константы и конвертеры: `PAGE_SIZES`, `mmToPt`, `renderSizePx`
- [ ] 1.2 `resolvePage(settings, imgW, imgH, dpi)`: форматы a4/letter, `page:'auto'` по размеру фото, `orientation:'auto'` по аспекту
- [ ] 1.3 `placeImage(imgW, imgH, pageWPt, pageHPt, marginMm, mode)`: fit=contain с центрированием, fill=cover с центральным src-кропом
- [ ] 1.4 `effectiveDpi(requested, isMobile)`: кап 200 на мобильных
- [ ] 1.5 `sanitizeFilename(name)`: whitelist, схлопывание пробелов, обрезка краёв, лимит 120, fallback `scan`
- [ ] 1.6 `sniffFormat(bytes)`: JPEG/PNG/WebP/HEIC(ftyp+бренды), короткий буфер → `unknown`

## 2. Тесты test/pipeline-math.test.js (node --test)

- [ ] 2.1 `resolvePage`: все 3 формата × 3 ориентации, авто-ориентация на портретном и альбомном фото, auto-страница с DPI
- [ ] 2.2 `placeImage`: fit/fill на совпадающем и не совпадающем аспекте, поля 0/10/30 мм, src-кроп при fill центрирован и с верным аспектом
- [ ] 2.3 `renderSizePx`/`effectiveDpi`/`mmToPt`: контрольные числа (A4@150 → 1240×1754), кап 200/без капа
- [ ] 2.4 `sanitizeFilename`: кириллица/спецсимволы, пустая строка, только точки/пробелы, длина > 120
- [ ] 2.5 `sniffFormat`: валидные сигнатуры всех 4 форматов, все 4 HEIC-бренда, мусор, буферы 0–11 байт

## 3. Завершение

- [ ] 3.1 `node --test test/` зелёный
- [ ] 3.2 SPEC.md §12: отметить DoD этапа 2
- [ ] 3.3 `openspec validate add-pipeline-math` зелёный
