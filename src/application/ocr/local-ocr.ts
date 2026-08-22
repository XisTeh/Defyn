import type { PSM, Worker } from 'tesseract.js';
import type { NutritionLabelOcrLine, NutritionLabelOcrToken } from '../../domain/food/nutrition-label-parser';

export interface OcrProgress { status: string; progress: number; }
export interface OcrTimings { workerLoadMs: number; recognizeMs: number; documentPassMs: number; numericPassMs: number; totalMs: number; reusedWorker: boolean; }
export function describeOcrProgress(progress: OcrProgress): string {
  const percent = progress.progress > 0 ? ` ${Math.round(progress.progress * 100)}%` : '';
  const labels: Record<string, string> = {
    'loading tesseract core': 'Carregando motor OCR local',
    'initializing tesseract': 'Inicializando leitor local',
    'loading language traineddata': 'Carregando português offline',
    'initializing api': 'Preparando reconhecimento',
    'recognizing text': 'Lendo a tabela',
  };
  return `${labels[progress.status.toLowerCase()] ?? 'Processando no dispositivo'}${percent}`;
}
let workerPromise: Promise<Worker> | undefined;
let activeProgress: ((progress: OcrProgress) => void) | undefined;

async function getWorker(): Promise<{ worker: Worker; reused: boolean; loadMs: number }> {
  const reused = Boolean(workerPromise);
  const started = performance.now();
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(async ({ createWorker, OEM, PSM }) => {
      const base = `${import.meta.env.BASE_URL}ocr`;
      const worker = await createWorker('por', OEM.LSTM_ONLY, {
        workerPath: `${base}/worker.min.js`, langPath: base, corePath: `${base}/tesseract-core-lstm.wasm.js`,
        logger: (message) => activeProgress?.({ status: message.status, progress: message.progress ?? 0 }),
      });
      await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      return worker;
    }).catch((error) => { workerPromise = undefined; throw error; });
  }
  return { worker: await workerPromise, reused, loadMs: performance.now() - started };
}

export async function recognizeNutritionLabel(image: Blob, onProgress?: (progress: OcrProgress) => void): Promise<{ text: string; confidence: number; lines: NutritionLabelOcrLine[]; timings: OcrTimings }> {
  const totalStarted = performance.now();
  activeProgress = onProgress;
  const { worker, reused, loadMs } = await getWorker();
  const recognizeStarted = performance.now();
  try {
    await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '11' as PSM, tessedit_char_whitelist: '' });
    const documentResult = await worker.recognize(image, {}, { text: true, blocks: true });
    const documentFinished = performance.now();
    const bitmap = await createImageBitmap(image);
    const valueRegion = { left: Math.round(bitmap.width * .3), top: 0, width: Math.max(1, Math.round(bitmap.width * .7)), height: bitmap.height };
    bitmap.close();
    await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '11' as PSM, tessedit_char_whitelist: '0123456789,.%—–-' });
    const numericResult = await worker.recognize(image, { rectangle: valueRegion }, { text: true, blocks: true });
    await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '11' as PSM, tessedit_char_whitelist: '' });
    const numericFinished = performance.now();
    const lines = [
      ...ocrLines(documentResult.data.blocks, 'document'),
      ...ocrLines(numericResult.data.blocks, 'numeric-pass'),
    ];
    return {
      text: documentResult.data.text,
      confidence: documentResult.data.confidence,
      lines,
      timings: {
        workerLoadMs: loadMs,
        recognizeMs: numericFinished - recognizeStarted,
        documentPassMs: documentFinished - recognizeStarted,
        numericPassMs: numericFinished - documentFinished,
        totalMs: performance.now() - totalStarted,
        reusedWorker: reused,
      },
    };
  } finally { activeProgress = undefined; }
}

function ocrLines(blocks: Awaited<ReturnType<Worker['recognize']>>['data']['blocks'], source: NutritionLabelOcrToken['source']): NutritionLabelOcrLine[] {
  return (blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.map((line) => ({
    text: line.text,
    confidence: line.confidence,
    bbox: { ...line.bbox },
    source,
    words: line.words.map((word) => ({ text: word.text, confidence: word.confidence, bbox: { ...word.bbox }, source })),
  }))));
}

export async function cancelNutritionLabelRecognition(): Promise<void> {
  const pending = workerPromise;
  workerPromise = undefined;
  activeProgress = undefined;
  if (pending) await pending.then((worker) => worker.terminate()).catch(() => undefined);
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { void cancelNutritionLabelRecognition(); }, { once: true });
