// app.js — Alpine store: UI-состояние, очередь, reorder, rotate, settings.
// Основа — store прототипа (docs/prototype.html); addMock заменён реальным
// ingest через pipeline.js.

import Alpine from './vendor/alpine.esm.js';
import { ingestFile } from './pipeline.js';
import { effectiveDpi, sanitizeFilename } from './pipeline-math.js';

const QUEUE_WARN = 100;
const QUEUE_MAX = 200;

const ERROR_TEXTS = {
  heic: 'HEIC не поддерживается — на iPhone включите передачу «Автоматически»',
  corrupt: 'Не удалось прочитать файл',
  unsupported: 'Не удалось прочитать файл',
};

const BASE_DPI = 300; // на мобильных капится до 200 (browser-compat)

function isMobile() {
  return navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
}

Alpine.data('app', () => ({
  // Минимум платформы един для всего пайплайна: без OffscreenCanvas
  // не будет работать генерация (этап 4), поэтому не впускаем сразу.
  unsupported: typeof OffscreenCanvas === 'undefined',

  view: 'empty',
  settingsOpen: false,
  images: [],
  nextId: 1,
  settings: { page: 'a4', orientation: 'auto', margin: 10, fit: 'fit', quality: 85, filename: 'scan' },
  job: { done: 0, total: 0, finished: false },
  limitMsg: '',
  genError: '',
  dropActive: false,
  pdfUrl: '',
  pdfFile: null,
  pdfName: '',
  canSharePdf: false,
  _queue: Promise.resolve(),
  _worker: null,

  errorText(code) {
    return ERROR_TEXTS[code] ?? ERROR_TEXTS.corrupt;
  },

  get readyImages() {
    return this.images.filter((img) => img.status === 'ready');
  },
  get queueWarn() {
    return this.images.length > QUEUE_WARN;
  },
  get pageLabel() {
    return { a4: 'A4', letter: 'Letter', auto: 'по фото' }[this.settings.page];
  },

  // --- источники файлов ---

  pickGallery() { this.$refs.galleryInput.click(); },
  pickCamera() { this.$refs.cameraInput.click(); },
  onPicked(event) {
    this.addFiles(event.target.files);
    event.target.value = ''; // повторный выбор того же файла должен срабатывать
  },
  onDrop(event) {
    this.dropActive = false;
    this.addFiles(event.dataTransfer?.files ?? []);
  },

  addFiles(fileList) {
    let files = [...fileList].filter((f) => f instanceof File);
    if (files.length === 0) return;

    this.limitMsg = '';
    const room = QUEUE_MAX - this.images.length;
    if (files.length > room) {
      this.limitMsg = `Лимит ${QUEUE_MAX} файлов: ${files.length - Math.max(0, room)} не добавлено`;
      files = files.slice(0, Math.max(0, room));
      if (files.length === 0) return;
    }

    const records = files.map((file) => ({
      id: this.nextId++,
      name: file.name,
      file,
      rotation: 0,
      thumbUrl: '',
      width: 0,
      height: 0,
      status: 'processing', // processing | ready | error
      error: '',
    }));
    this.images.push(...records);
    if (this.view === 'empty') this.view = 'grid';

    // Общая последовательная очередь: один полноразмерный decode
    // одновременно, сколько бы пачек ни накидали (SPEC §6.3).
    for (const rec of records) {
      this._queue = this._queue.then(() => this.processRecord(rec.id));
    }
  },

  async processRecord(id) {
    const rec = this.images.find((x) => x.id === id);
    if (!rec) return; // карточку удалили, пока она ждала очереди

    const res = await ingestFile(rec.file);

    const still = this.images.find((x) => x.id === id);
    if (!still) {
      if (res.ok) URL.revokeObjectURL(res.thumbUrl);
      return;
    }
    if (res.ok) {
      still.thumbUrl = res.thumbUrl;
      still.width = res.width;
      still.height = res.height;
      still.status = 'ready';
    } else {
      still.status = 'error';
      still.error = res.error;
    }
  },

  // --- управление очередью ---

  removeImage(id) {
    const img = this.images.find((x) => x.id === id);
    if (img?.thumbUrl) URL.revokeObjectURL(img.thumbUrl);
    this.images = this.images.filter((x) => x.id !== id);
    if (this.images.length === 0) {
      this.limitMsg = '';
      this.view = 'empty';
    }
  },
  rotateImage(id) {
    const img = this.images.find((x) => x.id === id);
    if (img) img.rotation = (img.rotation + 90) % 360;
  },
  clearAll() {
    for (const img of this.images) {
      if (img.thumbUrl) URL.revokeObjectURL(img.thumbUrl);
    }
    this.images = [];
    this.limitMsg = '';
    this.genError = '';
    this.view = 'empty';
    this.settingsOpen = false;
    this.releasePdf();
  },

  // Клик по логотипу: чистый старт из любого экрана. Воркер убивается до
  // сброса состояния, чтобы поздний done/error не переключил view.
  goHome() {
    this._worker?.terminate();
    this._worker = null;
    this.clearAll();
    this.job = { done: 0, total: 0, finished: false };
  },

  releasePdf() {
    if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
    this.pdfUrl = '';
    this.pdfFile = null;
    this.pdfName = '';
    this.canSharePdf = false;
  },

  // Вызывается из x-init контейнера сетки: x-if пересоздаёт узел при каждом
  // показе grid-экрана, Sortable надо навешивать на каждый новый элемент.
  initSortable(grid) {
    if (!grid || grid._init) return;
    grid._init = true;
    // window.Sortable: UMD-сборка подключена классическим <script> в index.html.
    // draggable обязан совпадать с классом карточки в index.html — иначе
    // <template x-for> (первый ребёнок сетки) сдвигает oldIndex/newIndex.
    window.Sortable.create(grid, {
      animation: 150,
      delay: 150,
      delayOnTouchOnly: true,
      draggable: '.thumb-card',
      onEnd: (evt) => {
        const { item, from, oldIndex, newIndex } = evt;
        // Sortable уже переставил узел в DOM. Возвращаем его на исходную
        // позицию, чтобы keyed-патч Alpine шёл от нетронутой разметки,
        // и только потом меняем массив — перестановку делает сам Alpine.
        const rest = [...from.children].filter(
          (el) => el !== item && el.matches('.thumb-card'),
        );
        from.insertBefore(item, rest[oldIndex] ?? null);
        if (oldIndex === newIndex) return;
        const moved = this.images.splice(oldIndex, 1)[0];
        this.images.splice(newIndex, 0, moved);
      },
    });
  },

  startGenerate() {
    const ready = this.readyImages;
    if (ready.length === 0) return;
    this.settingsOpen = false;
    this.genError = '';
    this.releasePdf();
    this.view = 'result';
    this.job = { done: 0, total: ready.length, finished: false };

    this._worker?.terminate();
    const worker = new Worker('pdf-worker.js', { type: 'module' });
    this._worker = worker;

    worker.onmessage = (e) => this.onWorkerMessage(e.data);
    worker.onerror = (e) => this.failGenerate(e.message || 'сбой воркера');

    worker.postMessage({
      pages: ready.map((img) => ({
        file: img.file,
        rotation: img.rotation,
        width: img.width,
        height: img.height,
      })),
      settings: { ...this.settings }, // plain-копия: Alpine-proxy не проходит structured clone
      dpi: effectiveDpi(BASE_DPI, isMobile()),
    });
  },

  onWorkerMessage(msg) {
    if (msg.type === 'progress') {
      this.job.done = msg.done;
      this.job.total = msg.total;
      return;
    }
    if (msg.type === 'error') {
      this.failGenerate(msg.message);
      return;
    }
    // done
    const name = sanitizeFilename(this.settings.filename) + '.pdf';
    const blob = new Blob([msg.bytes], { type: 'application/pdf' });
    this.pdfName = name;
    this.pdfFile = new File([blob], name, { type: 'application/pdf' });
    this.pdfUrl = URL.createObjectURL(blob);
    this.canSharePdf = !!(navigator.canShare && navigator.canShare({ files: [this.pdfFile] }));
    this.job.finished = true;
    this._worker?.terminate();
    this._worker = null;
    this.downloadPdf(); // автоскачивание — best effort, ссылка остаётся на экране
  },

  failGenerate(message) {
    this._worker?.terminate();
    this._worker = null;
    this.genError = 'Не удалось создать PDF: ' + message;
    this.view = 'grid';
  },

  downloadPdf() {
    if (!this.pdfUrl) return;
    const a = document.createElement('a');
    a.href = this.pdfUrl;
    a.download = this.pdfName;
    a.click();
  },

  async sharePdf() {
    if (!this.pdfFile) return;
    try {
      await navigator.share({ files: [this.pdfFile] });
    } catch (err) {
      if (err.name !== 'AbortError') console.error('share:', err);
    }
  },
}));

Alpine.start();
