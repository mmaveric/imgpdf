// pipeline.js — приём файла: сниф формата → decode с EXIF → миниатюра.
// Работает в главном потоке; тяжёлая генерация PDF — в pdf-worker.js (этап 4).

import { sniffFormat } from './pipeline-math.js';

const THUMB_LONG_SIDE = 320;
const THUMB_QUALITY = 0.8;

// Один переиспользуемый canvas на модуль: суммарная память живых
// canvas-контекстов ограничена на мобильном Safari (SPEC §10).
let thumbCanvas = null;

async function sniff(file) {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return sniffFormat(head);
}

// Результат: {ok:true, thumbUrl, width, height}
// или {ok:false, error: 'heic' | 'unsupported' | 'corrupt'}.
// width/height — размеры после применения EXIF-ориентации.
export async function ingestFile(file) {
  let format;
  try {
    format = await sniff(file);
  } catch {
    return { ok: false, error: 'corrupt' };
  }

  if (format === 'heic') {
    return { ok: false, error: 'heic' };
  }
  if (format === 'unknown' && !/^image\//.test(file.type)) {
    return { ok: false, error: 'unsupported' };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return { ok: false, error: 'corrupt' };
  }

  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, THUMB_LONG_SIDE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    thumbCanvas ??= document.createElement('canvas');
    thumbCanvas.width = w;
    thumbCanvas.height = h;
    thumbCanvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise((resolve, reject) =>
      thumbCanvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob вернул null'))),
        'image/jpeg',
        THUMB_QUALITY
      )
    );
    return { ok: true, thumbUrl: URL.createObjectURL(blob), width, height };
  } catch {
    return { ok: false, error: 'corrupt' };
  } finally {
    bitmap.close();
  }
}
