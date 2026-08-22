import type { LocalMedia, MediaKind } from '../../domain/media/media';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface ImagePreparationOptions {
  rotationQuarterTurns?: 0 | 1 | 2 | 3;
  cropInsetPercent?: number;
  enhanceForOcr?: boolean;
  maxDimension?: number;
  onTiming?: (timings: ImageProcessingTimings) => void;
}

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
  const crop = Math.min(24, Math.max(0, options.cropInsetPercent ?? 0)) / 100;
  const sourceX = Math.round(bitmap.width * crop);
  const sourceY = Math.round(bitmap.height * crop);
  const sourceWidth = Math.max(1, bitmap.width - sourceX * 2);
  const sourceHeight = Math.max(1, bitmap.height - sourceY * 2);
  const max = options.maxDimension ?? (kind === 'profile-avatar' ? 512 : kind === 'nutrition-label' ? 2000 : 1600);
  const ratio = Math.min(1, max / Math.max(sourceWidth, sourceHeight));
  const drawWidth = Math.max(1, Math.round(sourceWidth * ratio));
  const drawHeight = Math.max(1, Math.round(sourceHeight * ratio));
  const rotated = rotation % 2 === 1;
  const width = rotated ? drawHeight : drawWidth;
  const height = rotated ? drawWidth : drawHeight;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: options.enhanceForOcr });
  if (!context) { bitmap.close(); throw new Error('O navegador não conseguiu preparar a imagem.'); }
  context.translate(width / 2, height / 2);
  context.rotate(rotation * Math.PI / 2);
  context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  bitmap.close();
  if (options.enhanceForOcr) applyConservativeOcrEnhancement(context, width, height);
  const transformedAt = performance.now();
  const quality = kind === 'profile-avatar' ? .82 : kind === 'nutrition-label' ? .9 : .78;
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Não foi possível comprimir a imagem.')), 'image/webp', quality));
  const encodedAt = performance.now();
  options.onTiming?.({ decodeMs: decodedAt - processingStarted, transformMs: transformedAt - decodedAt, encodeMs: encodedAt - transformedAt, totalMs: encodedAt - processingStarted });
  const timestamp = now.toISOString();
  return { id, kind, ownerType, ownerId, mimeType: blob.type, sizeBytes: blob.size, width, height, blob, createdAt: timestamp, updatedAt: timestamp };
}

function applyConservativeOcrEnhancement(context: CanvasRenderingContext2D, width: number, height: number) {
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0; const green = pixels[index + 1] ?? 0; const blue = pixels[index + 2] ?? 0;
    const luminance = red * .299 + green * .587 + blue * .114;
    const contrasted = Math.max(0, Math.min(255, (luminance - 128) * 1.18 + 128));
    pixels[index] = contrasted; pixels[index + 1] = contrasted; pixels[index + 2] = contrasted;
  }
  context.putImageData(image, 0, 0);
}
