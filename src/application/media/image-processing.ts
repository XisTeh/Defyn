import type { LocalMedia, MediaKind } from '../../domain/media/media';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface ImagePreparationOptions {
  rotationQuarterTurns?: 0 | 1 | 2 | 3;
  cropInsetPercent?: number;
  enhanceForOcr?: boolean;
  perspectiveCorners?: PerspectiveCorners;
  ocrEnhancement?: 'none' | 'contrast' | 'adaptive-threshold';
  maxDimension?: number;
  onTiming?: (timings: ImageProcessingTimings) => void;
}

export interface NormalizedPoint { x: number; y: number; }
export interface PerspectiveCorners { topLeft: NormalizedPoint; topRight: NormalizedPoint; bottomRight: NormalizedPoint; bottomLeft: NormalizedPoint; }

export const DEFAULT_PERSPECTIVE_CORNERS: PerspectiveCorners = {
  topLeft: { x: .04, y: .04 }, topRight: { x: .96, y: .04 }, bottomRight: { x: .96, y: .96 }, bottomLeft: { x: .04, y: .96 },
};

export interface ImageProcessingTimings {
  decodeMs: number;
  transformMs: number;
  encodeMs: number;
  totalMs: number;
}

export interface ImageQualityAssessment {
  width: number;
  height: number;
  edgeScore: number;
  warnings: string[];
}

export async function detectNutritionLabelQuadrilateral(file: File): Promise<{ corners: PerspectiveCorners; confidence: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale)); const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) { bitmap.close(); return { corners: DEFAULT_PERSPECTIVE_CORNERS, confidence: 0 }; }
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminance = (x: number, y: number) => { const index = (y * width + x) * 4; return (pixels[index] ?? 0) * .299 + (pixels[index + 1] ?? 0) * .587 + (pixels[index + 2] ?? 0) * .114; };
  const points: Array<{ x: number; y: number; score: number }> = [];
  for (let y = 2; y < height - 2; y += 2) for (let x = 2; x < width - 2; x += 2) {
    const score = Math.abs(luminance(x - 2, y) - luminance(x + 2, y)) + Math.abs(luminance(x, y - 2) - luminance(x, y + 2));
    if (score > 45) points.push({ x, y, score });
  }
  if (points.length < 60) return { corners: DEFAULT_PERSPECTIVE_CORNERS, confidence: 0 };
  const xs = points.map((point) => point.x).sort((a, b) => a - b); const ys = points.map((point) => point.y).sort((a, b) => a - b);
  const quantile = (values: number[], ratio: number) => values[Math.min(values.length - 1, Math.max(0, Math.floor(values.length * ratio)))] ?? 0;
  const left = quantile(xs, .02); const right = quantile(xs, .98); const top = quantile(ys, .02); const bottom = quantile(ys, .98);
  const candidates = points.filter((point) => point.x >= left && point.x <= right && point.y >= top && point.y <= bottom);
  const averageExtreme = (score: (point: { x: number; y: number }) => number, direction: 1 | -1) => {
    const selected = [...candidates].sort((a, b) => (score(a) - score(b)) * direction).slice(0, Math.min(24, candidates.length));
    return { x: selected.reduce((sum, point) => sum + point.x, 0) / Math.max(1, selected.length), y: selected.reduce((sum, point) => sum + point.y, 0) / Math.max(1, selected.length) };
  };
  const topLeft = averageExtreme((point) => point.x + point.y, 1); const topRight = averageExtreme((point) => point.x - point.y, -1);
  const bottomRight = averageExtreme((point) => point.x + point.y, -1); const bottomLeft = averageExtreme((point) => point.x - point.y, 1);
  const polygonArea = Math.abs([topLeft, topRight, bottomRight, bottomLeft].reduce((sum, point, index, polygon) => { const next = polygon[(index + 1) % polygon.length]!; return sum + point.x * next.y - next.x * point.y; }, 0)) / 2;
  const coverage = polygonArea / Math.max(1, width * height);
  const corners = normalizeCorners({ topLeft: { x: topLeft.x / width, y: topLeft.y / height }, topRight: { x: topRight.x / width, y: topRight.y / height }, bottomRight: { x: bottomRight.x / width, y: bottomRight.y / height }, bottomLeft: { x: bottomLeft.x / width, y: bottomLeft.y / height } });
  return { corners, confidence: Math.min(1, coverage / .55) };
}

export async function assessNutritionLabelImage(file: File): Promise<ImageQualityAssessment> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const width = bitmap.width; const height = bitmap.height;
  const sampleScale = Math.min(1, 320 / Math.max(width, height));
  const sampleWidth = Math.max(1, Math.round(width * sampleScale)); const sampleHeight = Math.max(1, Math.round(height * sampleScale));
  const canvas = document.createElement('canvas'); canvas.width = sampleWidth; canvas.height = sampleHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) { bitmap.close(); return { width, height, edgeScore: 0, warnings: ['Não foi possível avaliar a nitidez desta imagem.'] }; }
  context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight); bitmap.close();
  const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let edgeTotal = 0; let samples = 0;
  const luminance = (index: number) => (pixels[index] ?? 0) * .299 + (pixels[index + 1] ?? 0) * .587 + (pixels[index + 2] ?? 0) * .114;
  for (let y = 1; y < sampleHeight - 1; y += 2) for (let x = 1; x < sampleWidth - 1; x += 2) {
    const index = (y * sampleWidth + x) * 4;
    edgeTotal += Math.abs(luminance(index - 4) - luminance(index + 4)) + Math.abs(luminance(index - sampleWidth * 4) - luminance(index + sampleWidth * 4)); samples += 2;
  }
  const edgeScore = samples ? edgeTotal / samples : 0;
  const warnings: string[] = [];
  if (Math.min(width, height) < 700) warnings.push('Essa foto pode estar difícil de ler. Aproxime a câmera da tabela.');
  if (edgeScore < 7) warnings.push('A imagem parece pouco nítida. Apoie o aparelho e aproxime a câmera da tabela.');
  return { width, height, edgeScore, warnings };
}

export async function optimizeImage(
  file: File,
  kind: MediaKind,
  ownerType: LocalMedia['ownerType'],
  ownerId?: string,
  id = crypto.randomUUID(),
  now = new Date(),
  options: ImagePreparationOptions = {},
): Promise<LocalMedia> {
  const processingStarted = performance.now();
  if (!ALLOWED.has(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  if (file.size <= 0 || file.size > 20 * 1024 * 1024) throw new Error('A imagem precisa ter até 20 MB.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const decodedAt = performance.now();
  const rotation = options.rotationQuarterTurns ?? 0;
  const max = options.maxDimension ?? (kind === 'profile-avatar' ? 512 : kind === 'nutrition-label' ? 2000 : 1600);
  const prepared = options.perspectiveCorners ? warpPerspective(bitmap, normalizeCorners(options.perspectiveCorners), max) : undefined;
  const crop = prepared ? 0 : Math.min(24, Math.max(0, options.cropInsetPercent ?? 0)) / 100;
  const sourceX = prepared ? 0 : Math.round(bitmap.width * crop); const sourceY = prepared ? 0 : Math.round(bitmap.height * crop);
  const sourceWidth = prepared?.width ?? Math.max(1, bitmap.width - sourceX * 2); const sourceHeight = prepared?.height ?? Math.max(1, bitmap.height - sourceY * 2);
  const ratio = prepared ? 1 : Math.min(1, max / Math.max(sourceWidth, sourceHeight));
  const drawWidth = Math.max(1, Math.round(sourceWidth * ratio)); const drawHeight = Math.max(1, Math.round(sourceHeight * ratio));
  const rotated = rotation % 2 === 1;
  const width = rotated ? drawHeight : drawWidth;
  const height = rotated ? drawWidth : drawHeight;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: options.enhanceForOcr });
  if (!context) { bitmap.close(); throw new Error('O navegador não conseguiu preparar a imagem.'); }
  context.translate(width / 2, height / 2);
  context.rotate(rotation * Math.PI / 2);
  context.drawImage(prepared ?? bitmap, sourceX, sourceY, sourceWidth, sourceHeight, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  bitmap.close();
  const enhancement = options.ocrEnhancement ?? (options.enhanceForOcr ? 'contrast' : 'none');
  if (enhancement !== 'none') applyOcrEnhancement(context, width, height, enhancement);
  const transformedAt = performance.now();
  const quality = kind === 'profile-avatar' ? .82 : kind === 'nutrition-label' ? .9 : .78;
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Não foi possível comprimir a imagem.')), 'image/webp', quality));
  const encodedAt = performance.now();
  options.onTiming?.({ decodeMs: decodedAt - processingStarted, transformMs: transformedAt - decodedAt, encodeMs: encodedAt - transformedAt, totalMs: encodedAt - processingStarted });
  const timestamp = now.toISOString();
  return { id, kind, ownerType, ownerId, mimeType: blob.type, sizeBytes: blob.size, width, height, blob, createdAt: timestamp, updatedAt: timestamp };
}

function applyOcrEnhancement(context: CanvasRenderingContext2D, width: number, height: number, mode: 'contrast' | 'adaptive-threshold') {
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  const luminances = new Uint8ClampedArray(width * height);
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0; const green = pixels[index + 1] ?? 0; const blue = pixels[index + 2] ?? 0;
    const luminance = red * .299 + green * .587 + blue * .114;
    luminances[index / 4] = luminance;
  }
  const integral = mode === 'adaptive-threshold' ? new Float64Array((width + 1) * (height + 1)) : undefined;
  if (integral) for (let y = 1; y <= height; y += 1) {
    let rowTotal = 0;
    for (let x = 1; x <= width; x += 1) { rowTotal += luminances[(y - 1) * width + x - 1] ?? 0; integral[y * (width + 1) + x] = (integral[(y - 1) * (width + 1) + x] ?? 0) + rowTotal; }
  }
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const pixelIndex = y * width + x; const index = pixelIndex * 4; const luminance = luminances[pixelIndex] ?? 0;
    let output = Math.max(0, Math.min(255, (luminance - 128) * 1.2 + 128));
    if (integral) {
      const left = Math.max(0, x - 8); const right = Math.min(width - 1, x + 8); const top = Math.max(0, y - 8); const bottom = Math.min(height - 1, y + 8); const stride = width + 1;
      const total = (integral[(bottom + 1) * stride + right + 1] ?? 0) - (integral[top * stride + right + 1] ?? 0) - (integral[(bottom + 1) * stride + left] ?? 0) + (integral[top * stride + left] ?? 0);
      output = luminance < total / ((right - left + 1) * (bottom - top + 1)) - 7 ? 0 : 255;
    }
    pixels[index] = output; pixels[index + 1] = output; pixels[index + 2] = output;
  }
  context.putImageData(image, 0, 0);
}

function normalizeCorners(corners: PerspectiveCorners): PerspectiveCorners {
  const point = ({ x, y }: NormalizedPoint) => ({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
  return { topLeft: point(corners.topLeft), topRight: point(corners.topRight), bottomRight: point(corners.bottomRight), bottomLeft: point(corners.bottomLeft) };
}

function warpPerspective(bitmap: ImageBitmap, normalized: PerspectiveCorners, maxDimension: number): HTMLCanvasElement {
  const sourcePoints = [normalized.topLeft, normalized.topRight, normalized.bottomRight, normalized.bottomLeft].map((point) => ({ x: point.x * bitmap.width, y: point.y * bitmap.height }));
  const distance = (a: NormalizedPoint, b: NormalizedPoint) => Math.hypot(a.x - b.x, a.y - b.y);
  const naturalWidth = (distance(sourcePoints[0]!, sourcePoints[1]!) + distance(sourcePoints[3]!, sourcePoints[2]!)) / 2;
  const naturalHeight = (distance(sourcePoints[0]!, sourcePoints[3]!) + distance(sourcePoints[1]!, sourcePoints[2]!)) / 2;
  const scale = Math.min(1, maxDimension / Math.max(1, naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale)); const height = Math.max(1, Math.round(naturalHeight * scale));
  const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = bitmap.width; sourceCanvas.height = bitmap.height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const outputCanvas = document.createElement('canvas'); outputCanvas.width = width; outputCanvas.height = height;
  const outputContext = outputCanvas.getContext('2d');
  if (!sourceContext || !outputContext) throw new Error('O navegador não conseguiu corrigir a perspectiva.');
  sourceContext.drawImage(bitmap, 0, 0);
  const source = sourceContext.getImageData(0, 0, bitmap.width, bitmap.height); const output = outputContext.createImageData(width, height);
  const destination = [{ x: 0, y: 0 }, { x: width - 1, y: 0 }, { x: width - 1, y: height - 1 }, { x: 0, y: height - 1 }];
  const transform = projectiveTransform(destination, sourcePoints);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const denominator = transform[6]! * x + transform[7]! * y + 1;
    const sourceX = Math.min(bitmap.width - 1, Math.max(0, Math.round((transform[0]! * x + transform[1]! * y + transform[2]!) / denominator)));
    const sourceY = Math.min(bitmap.height - 1, Math.max(0, Math.round((transform[3]! * x + transform[4]! * y + transform[5]!) / denominator)));
    const sourceIndex = (sourceY * bitmap.width + sourceX) * 4; const outputIndex = (y * width + x) * 4;
    output.data[outputIndex] = source.data[sourceIndex] ?? 255; output.data[outputIndex + 1] = source.data[sourceIndex + 1] ?? 255; output.data[outputIndex + 2] = source.data[sourceIndex + 2] ?? 255; output.data[outputIndex + 3] = 255;
  }
  outputContext.putImageData(output, 0, 0);
  return outputCanvas;
}

function projectiveTransform(from: NormalizedPoint[], to: NormalizedPoint[]): number[] {
  const matrix: number[][] = []; const values: number[] = [];
  for (let index = 0; index < 4; index += 1) {
    const source = from[index]!; const target = to[index]!;
    matrix.push([source.x, source.y, 1, 0, 0, 0, -source.x * target.x, -source.y * target.x]); values.push(target.x);
    matrix.push([0, 0, 0, source.x, source.y, 1, -source.x * target.y, -source.y * target.y]); values.push(target.y);
  }
  for (let pivot = 0; pivot < 8; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < 8; row += 1) if (Math.abs(matrix[row]![pivot]!) > Math.abs(matrix[best]![pivot]!)) best = row;
    [matrix[pivot], matrix[best]] = [matrix[best]!, matrix[pivot]!]; [values[pivot], values[best]] = [values[best]!, values[pivot]!];
    const divisor = matrix[pivot]![pivot] || 1e-9;
    for (let column = pivot; column < 8; column += 1) matrix[pivot]![column] = matrix[pivot]![column]! / divisor; values[pivot] = values[pivot]! / divisor;
    for (let row = 0; row < 8; row += 1) if (row !== pivot) {
      const factor = matrix[row]![pivot]!;
      for (let column = pivot; column < 8; column += 1) matrix[row]![column] = matrix[row]![column]! - factor * matrix[pivot]![column]!;
      values[row] = values[row]! - factor * values[pivot]!;
    }
  }
  return values;
}
