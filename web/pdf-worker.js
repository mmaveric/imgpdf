// pdf-worker.js — Web Worker (module): resize → pdf-lib → PDF-байты.
// Весь тяжёлый цикл здесь; главный поток только рисует прогресс.
// Контракт: см. design.md change'а add-pdf-worker (D2).

import { resolvePage, renderSizePx, placeImage } from './pipeline-math.js';
import { PDFDocument } from './vendor/pdf-lib.esm.min.js';

// Один переиспользуемый канвас: лимит суммарной canvas-памяти Safari (SPEC §10).
let canvas = null;

self.onmessage = async (e) => {
  const { pages, settings, dpi } = e.data;
  try {
    const bytes = await generate(pages, settings, dpi);
    self.postMessage({ type: 'done', bytes: bytes.buffer }, [bytes.buffer]);
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message ?? err) });
  } finally {
    canvas = null;
  }
};

async function generate(pages, settings, dpi) {
  const doc = await PDFDocument.create();
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    await renderPage(doc, pages[i], settings, dpi);
    self.postMessage({ type: 'progress', done: i + 1, total });
  }
  return doc.save();
}

async function renderPage(doc, item, settings, dpi) {
  const bitmap = await createImageBitmap(item.file, { imageOrientation: 'from-image' });
  try {
    const rot = ((item.rotation % 360) + 360) % 360;
    const swapped = rot === 90 || rot === 270;
    // Математика pipeline-math работает в системе координат уже
    // повёрнутого изображения (её design, D4) — подаём swapped-размеры.
    const rw = swapped ? bitmap.height : bitmap.width;
    const rh = swapped ? bitmap.width : bitmap.height;

    const { wPt, hPt } = resolvePage(settings, rw, rh, dpi);
    const pagePx = renderSizePx(wPt, hPt, dpi);
    const { dest, src } = placeImage(rw, rh, wPt, hPt, settings.margin, settings.fit);
    const k = pagePx.w / wPt; // pt → px рендера

    canvas ??= new OffscreenCanvas(1, 1);
    canvas.width = pagePx.w;
    canvas.height = pagePx.h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, pagePx.w, pagePx.h);

    const dx = dest.x * k, dy = dest.y * k, dw = dest.w * k, dh = dest.h * k;
    // До поворота прямоугольник рисуется в «своих» размерах,
    // после ctx.rotate он ложится ровно в dest.
    const tw = swapped ? dh : dw;
    const th = swapped ? dw : dh;
    const s = mapSrcToBitmap(src, rot, bitmap.width, bitmap.height);

    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(bitmap, s.sx, s.sy, s.sw, s.sh, -tw / 2, -th / 2, tw, th);
    ctx.restore();

    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: settings.quality / 100,
    });
    const img = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const page = doc.addPage([wPt, hPt]);
    page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt });
  } finally {
    bitmap.close();
  }
}

// src-кроп задан в координатах повёрнутого изображения; drawImage читает
// исходный bitmap — пересчёт кропа обратным поворотом.
function mapSrcToBitmap(src, rot, w, h) {
  const { sx, sy, sw, sh } = src;
  switch (rot) {
    case 90:
      return { sx: sy, sy: h - sx - sw, sw: sh, sh: sw };
    case 180:
      return { sx: w - sx - sw, sy: h - sy - sh, sw, sh };
    case 270:
      return { sx: w - sy - sh, sy: sx, sw: sh, sh: sw };
    default:
      return { sx, sy, sw, sh };
  }
}
