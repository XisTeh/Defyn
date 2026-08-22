import type { Worker } from 'tesseract.js';
import type { NutritionLabelOcrLine } from '../../domain/food/nutrition-label-parser';

export interface OcrProgress { status: string; progress: number; }
export interface OcrTimings { workerLoadMs: number; recognizeMs: number; totalMs: number; reusedWorker: boolean; }
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
    const result = await worker.recognize(image, {}, { text: true, blocks: true });
    const lines = (result.data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.map((line) => ({ text: line.text, confidence: line.confidence, bbox: { ...line.bbox } }))));
    return { text: result.data.text, confidence: result.data.confidence, lines, timings: { workerLoadMs: loadMs, recognizeMs: performance.now() - recognizeStarted, totalMs: performance.now() - totalStarted, reusedWorker: reused } };
  } finally { activeProgress = undefined; }
}

export async function cancelNutritionLabelRecognition(): Promise<void> {
  const pending = workerPromise;
  workerPromise = undefined;
  activeProgress = undefined;
  if (pending) await pending.then((worker) => worker.terminate()).catch(() => undefined);
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { void cancelNutritionLabelRecognition(); }, { once: true });
