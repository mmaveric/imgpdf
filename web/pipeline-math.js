// pipeline-math.js — чистые функции геометрии страницы и валидации входа.
// Единицы: страница в pt (1/72"), растр в px, мм только на входе (поля).
// Ни одного обращения к DOM/Canvas — модуль работает в главном потоке,
// воркере и node --test.

export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export function mmToPt(mm) {
  return (mm / 25.4) * 72;
}

// Размер страницы в px рендера при заданном DPI.
export function renderSizePx(wPt, hPt, dpi) {
  return {
    w: Math.round((wPt / 72) * dpi),
    h: Math.round((hPt / 72) * dpi),
  };
}

// Кап бюджета памяти: на мобильных эффективный DPI не выше 200 (SPEC §6.2).
export function effectiveDpi(requested, isMobile) {
  return isMobile ? Math.min(requested, 200) : requested;
}

// Размер страницы в pt из настроек.
// page:'auto' — страница по размеру фото при данном DPI (ориентация не нужна);
// orientation:'auto' — по аспекту фото.
export function resolvePage(settings, imgW, imgH, dpi) {
  if (settings.page === 'auto') {
    return { wPt: (imgW / dpi) * 72, hPt: (imgH / dpi) * 72 };
  }
  const [shortPt, longPt] = PAGE_SIZES[settings.page];
  const landscape =
    settings.orientation === 'landscape' ||
    (settings.orientation === 'auto' && imgW > imgH);
  return landscape ? { wPt: longPt, hPt: shortPt } : { wPt: shortPt, hPt: longPt };
}

// Размещение изображения на странице с полями.
// fit  — contain: изображение целиком, центрировано в рамке полей;
// fill — cover: рамка полей заполнена целиком, исходник кропится по центру.
// dest в pt страницы, src в px исходника (для 9-аргументного drawImage).
export function placeImage(imgW, imgH, pageWPt, pageHPt, marginMm, mode) {
  const m = mmToPt(marginMm);
  const frameW = pageWPt - 2 * m;
  const frameH = pageHPt - 2 * m;

  if (mode === 'fill') {
    const frameAspect = frameW / frameH;
    let sw, sh;
    if (imgW / imgH > frameAspect) {
      sh = imgH;
      sw = imgH * frameAspect;
    } else {
      sw = imgW;
      sh = imgW / frameAspect;
    }
    return {
      dest: { x: m, y: m, w: frameW, h: frameH },
      src: { sx: (imgW - sw) / 2, sy: (imgH - sh) / 2, sw, sh },
    };
  }

  const scale = Math.min(frameW / imgW, frameH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    dest: { x: m + (frameW - w) / 2, y: m + (frameH - h) / 2, w, h },
    src: { sx: 0, sy: 0, sw: imgW, sh: imgH },
  };
}

// Whitelist-очистка имени файла (basename, без расширения — .pdf добавляет
// вызывающий код). Пустой результат заменяется на 'scan'.
export function sanitizeFilename(name) {
  const cleaned = String(name ?? '')
    .replace(/[^a-zA-Z0-9._ -]+/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^[ .]+|[ .]+$/g, '')
    .slice(0, 120)
    .replace(/[ .]+$/g, '');
  return cleaned === '' ? 'scan' : cleaned;
}

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'mif1']);

// Формат по сигнатуре первых байт. Короткий/нераспознанный буфер → 'unknown'.
export function sniffFormat(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  const ascii = (from, to) => String.fromCharCode(...b.subarray(from, to));

  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'jpeg';
  }
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return 'png';
  }
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return 'webp';
  }
  if (b.length >= 12 && ascii(4, 8) === 'ftyp' && HEIC_BRANDS.has(ascii(8, 12))) {
    return 'heic';
  }
  return 'unknown';
}
