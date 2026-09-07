# Tasks: fix-page-reorder

## 1. Исправления app.js / index.html

- [x] 1.1 `initSortable(el)`: принимать элемент параметром, guard `el._init` оставить; убрать `$nextTick(() => this.initSortable())` из `addFiles`
- [x] 1.2 `index.html`: `x-init="initSortable($el)"` на `#imageGrid` — переинициализация при каждом монтировании сетки (D1)
- [x] 1.3 Опция `draggable: '.thumb-card'` — исключить `<template x-for>` из нумерации и захвата (D2)
- [x] 1.4 `onEnd`: откат DOM-перестановки (вернуть узел на исходную позицию среди `.thumb-card`), затем `splice` массива; комментарий о связи селектора с разметкой (D3)

## 2. Проверка

- [x] 2.1 Playwright e2e: две фикстуры разного размера, `page:'auto'` → drag первой карточки на вторую позицию → генерация → парсинг PDF в Node: размеры страниц в новом порядке (D5)
- [x] 2.2 E2e: grid → генерация → «Создать ещё раз» → drag снова работает (сценарий переинициализации)
- [x] 2.3 E2e-проверка отсутствия дублей/пропаж карточек после серии перетаскиваний (количество `.thumb-card` и уникальность имён)
- [x] 2.4 Регрессия: `node --test`, `go build ./...`, `go test ./...`
- [x] 2.5 `openspec validate fix-page-reorder` зелёный
- [ ] 2.6 Ручной хвост (iPhone, вместе с 4.2 change'а add-canvas-pipeline): long-press drag работает, свайп скроллит без drag
