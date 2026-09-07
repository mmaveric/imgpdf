import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGE_SIZES,
  mmToPt,
  renderSizePx,
  effectiveDpi,
  resolvePage,
  placeImage,
  sanitizeFilename,
  sniffFormat,
} from '../web/pipeline-math.js';

// --- resolvePage ---

test('resolvePage: фиксированные форматы, portrait/landscape', () => {
  for (const page of ['a4', 'letter']) {
    const [shortPt, longPt] = PAGE_SIZES[page];
    assert.deepEqual(resolvePage({ page, orientation: 'portrait' }, 100, 100, 150), {
      wPt: shortPt,
      hPt: longPt,
    });
    assert.deepEqual(resolvePage({ page, orientation: 'landscape' }, 100, 100, 150), {
      wPt: longPt,
      hPt: shortPt,
    });
  }
});

test('resolvePage: авто-ориентация по аспекту фото', () => {
  const landscape = resolvePage({ page: 'a4', orientation: 'auto' }, 4000, 3000, 150);
  assert.deepEqual(landscape, { wPt: 841.89, hPt: 595.28 });

  const portrait = resolvePage({ page: 'a4', orientation: 'auto' }, 3000, 4000, 150);
  assert.deepEqual(portrait, { wPt: 595.28, hPt: 841.89 });

  // Квадрат — портрет (imgW > imgH ложно).
  const square = resolvePage({ page: 'a4', orientation: 'auto' }, 3000, 3000, 150);
  assert.deepEqual(square, { wPt: 595.28, hPt: 841.89 });
});

test('resolvePage: page auto — страница по размеру фото при данном DPI', () => {
  const { wPt, hPt } = resolvePage({ page: 'auto', orientation: 'auto' }, 3000, 2000, 300);
  assert.equal(wPt, 720);
  assert.equal(hPt, 480);
});

// --- placeImage ---

test('placeImage fit: вписывает целиком, центрирует, src без кропа', () => {
  const page = { w: 595.28, h: 841.89 };
  const { dest, src } = placeImage(4000, 3000, page.w, page.h, 10, 'fit');

  const m = mmToPt(10);
  const frameW = page.w - 2 * m;

  // Широкое фото в портретной странице упирается в ширину рамки.
  assert.ok(Math.abs(dest.w - frameW) < 1e-9);
  assert.ok(Math.abs(dest.w / dest.h - 4000 / 3000) < 1e-9, 'аспект сохранён');
  assert.ok(Math.abs(dest.x - m) < 1e-9);
  assert.ok(dest.y > m, 'центрировано по вертикали');
  assert.deepEqual(src, { sx: 0, sy: 0, sw: 4000, sh: 3000 });
});

test('placeImage fit: совпадающий аспект заполняет рамку целиком', () => {
  const { dest } = placeImage(2000, 1000, 200, 100, 0, 'fit');
  assert.deepEqual(dest, { x: 0, y: 0, w: 200, h: 100 });
});

test('placeImage fill: dest равен рамке полей, src-кроп центрирован', () => {
  const page = { w: 595.28, h: 841.89 };
  const m = mmToPt(10);
  const { dest, src } = placeImage(4000, 3000, page.w, page.h, 10, 'fill');

  assert.ok(Math.abs(dest.x - m) < 1e-9);
  assert.ok(Math.abs(dest.y - m) < 1e-9);
  assert.ok(Math.abs(dest.w - (page.w - 2 * m)) < 1e-9);
  assert.ok(Math.abs(dest.h - (page.h - 2 * m)) < 1e-9);

  // Широкое фото на портретной рамке: высота src целиком, ширина кропится.
  assert.equal(src.sh, 3000);
  assert.equal(src.sy, 0);
  assert.ok(src.sw < 4000);
  assert.ok(Math.abs(src.sx - (4000 - src.sw) / 2) < 1e-9, 'кроп центрирован');
  assert.ok(Math.abs(src.sw / src.sh - dest.w / dest.h) < 1e-9, 'аспект кропа = аспект рамки');
});

test('placeImage fill: нулевые поля — dest совпадает со страницей', () => {
  const { dest } = placeImage(3000, 2000, 600, 400, 0, 'fill');
  assert.deepEqual(dest, { x: 0, y: 0, w: 600, h: 400 });
});

test('placeImage: поля 30 мм уменьшают рамку с обеих сторон', () => {
  const m = mmToPt(30);
  const { dest } = placeImage(1000, 1000, 595.28, 841.89, 30, 'fill');
  assert.ok(Math.abs(dest.w - (595.28 - 2 * m)) < 1e-9);
  assert.ok(Math.abs(dest.h - (841.89 - 2 * m)) < 1e-9);
});

// --- renderSizePx / effectiveDpi / mmToPt ---

test('renderSizePx: контрольные числа A4', () => {
  assert.deepEqual(renderSizePx(595.28, 841.89, 150), { w: 1240, h: 1754 });
  assert.deepEqual(renderSizePx(595.28, 841.89, 300), { w: 2480, h: 3508 });
});

test('effectiveDpi: кап 200 только на мобильных', () => {
  assert.equal(effectiveDpi(300, true), 200);
  assert.equal(effectiveDpi(150, true), 150);
  assert.equal(effectiveDpi(300, false), 300);
});

test('mmToPt: 25.4 мм = 72 pt', () => {
  assert.equal(mmToPt(25.4), 72);
  assert.equal(mmToPt(0), 0);
});

// --- sanitizeFilename ---

test('sanitizeFilename: кириллица и спецсимволы вычищены', () => {
  assert.equal(sanitizeFilename('отчёт: итог/2026?.v1'), '2026.v1');
});

test('sanitizeFilename: пробелы схлопнуты, края очищены', () => {
  assert.equal(sanitizeFilename('  my   scan  '), 'my scan');
  assert.equal(sanitizeFilename('...doc...'), 'doc');
});

test('sanitizeFilename: пустые и полностью недопустимые → scan', () => {
  assert.equal(sanitizeFilename(''), 'scan');
  assert.equal(sanitizeFilename('///???'), 'scan');
  assert.equal(sanitizeFilename('...'), 'scan');
  assert.equal(sanitizeFilename(undefined), 'scan');
});

test('sanitizeFilename: длина ограничена 120', () => {
  const long = 'a'.repeat(300);
  assert.equal(sanitizeFilename(long).length, 120);
});

// --- sniffFormat ---

const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

test('sniffFormat: валидные сигнатуры', () => {
  assert.equal(sniffFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
  assert.equal(sniffFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])), 'png');
  assert.equal(
    sniffFormat(new Uint8Array([...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP')])),
    'webp'
  );
});

test('sniffFormat: все четыре HEIC-бренда', () => {
  for (const brand of ['heic', 'heix', 'hevc', 'mif1']) {
    const buf = new Uint8Array([0, 0, 0, 24, ...ascii('ftyp'), ...ascii(brand)]);
    assert.equal(sniffFormat(buf), 'heic', brand);
  }
});

test('sniffFormat: не-HEIC бренд ISOBMFF — не heic', () => {
  const buf = new Uint8Array([0, 0, 0, 24, ...ascii('ftyp'), ...ascii('isom')]);
  assert.equal(sniffFormat(buf), 'unknown');
});

test('sniffFormat: мусор и короткие буферы → unknown без исключений', () => {
  assert.equal(sniffFormat(new Uint8Array([1, 2, 3, 4, 5])), 'unknown');
  for (let len = 0; len <= 11; len++) {
    const buf = new Uint8Array(len); // нули любой длины — не сигнатура
    assert.equal(sniffFormat(buf), 'unknown', `len=${len}`);
  }
  assert.equal(sniffFormat(null), 'unknown');
});
