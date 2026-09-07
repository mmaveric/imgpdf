# Tasks: add-canvas-pipeline

## 1. Нарезка и вендоринг

- [x] 1.1 Vendored `web/vendor/alpine.esm.js` и `web/vendor/sortable.min.js` (версия — комментарием в первой строке)
- [x] 1.2 Разнести прототип: `web/index.html` (разметка, без CDN и inline-скрипта) + `web/styles.css` + `web/app.js` (store, ESM, `Alpine.data` + `Alpine.start()`)
- [x] 1.3 Проверить через `imgpdf --dev`: прототипное поведение (моки) работает как раньше после нарезки

## 2. pipeline.js

- [x] 2.1 `ingestFile(file)`: сниф (`sniffFormat` из pipeline-math) + `file.type` → heic/unsupported-ошибки
- [x] 2.2 `createImageBitmap(file, {imageOrientation:'from-image'})`, decode-ошибка → `corrupt`
- [x] 2.3 Thumbnail: переиспользуемый canvas, длинная сторона 320, `toBlob('image/jpeg', 0.8)` → objectURL; `bitmap.close()`; вернуть размеры после EXIF

## 3. Интеграция в app.js

- [x] 3.1 Скрытый `<input type="file" accept="image/*" multiple>`, привязка к кнопкам прототипа; drag&drop на scan-bed и в состоянии grid
- [x] 3.2 Заменить `addMock`: карточка сразу, последовательная очередь обработки (один decode одновременно), убрать таймерные симуляции прогресса карточек
- [x] 3.3 Карточки ошибок (heic/corrupt/unsupported) с текстами, исключение из будущей генерации
- [x] 3.4 `revokeObjectURL` в `removeImage`/`clearAll`
- [x] 3.5 Лимиты: предупреждение > 100, потолок 200 с сообщением
- [x] 3.6 Feature-detect `OffscreenCanvas` при старте → экран «браузер не поддерживается» (текст с минимумом iOS 16.4)
- [x] 3.7 Пометить `startGenerate` заглушкой (комментарий: заменяется этапом 4)

## 4. Проверка

- [x] 4.1 Десктоп (Chrome + Firefox): drag&drop, клик, 30 реальных фото, повреждённый JPEG, HEIC-фикстура, удаление/очистка
- [ ] 4.2 iPhone по LAN: галерея + камера, портретное EXIF-фото в верной ориентации (DoD этапа 3), оба режима передачи HEIC
- [ ] 4.3 SPEC.md §12: отметить DoD этапа 3
- [x] 4.4 `openspec validate add-canvas-pipeline` зелёный
