export interface OcrProgress { status: string; progress: number; }
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
export async function recognizeNutritionLabel(image: Blob, onProgress?: (progress: OcrProgress) => void): Promise<{ text: string; confidence: number }> {
  const { createWorker, OEM } = await import('tesseract.js');
  const base = `${import.meta.env.BASE_URL}ocr`;
  const worker = await createWorker('por', OEM.LSTM_ONLY, {
    workerPath: `${base}/worker.min.js`, langPath: base, corePath: `${base}/tesseract-core-lstm.wasm.js`,
    logger: (message) => onProgress?.({ status: message.status, progress: message.progress ?? 0 }),
  });
  try {
    const result = await worker.recognize(image);
    return { text: result.data.text, confidence: result.data.confidence };
  } finally { await worker.terminate(); }
}
