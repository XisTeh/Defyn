import type { LocalMedia, MediaKind } from '../../domain/media/media';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
export async function optimizeImage(file: File, kind: MediaKind, ownerType: LocalMedia['ownerType'], ownerId?: string, id = crypto.randomUUID(), now = new Date()): Promise<LocalMedia> {
  if (!ALLOWED.has(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  if (file.size <= 0 || file.size > 20 * 1024 * 1024) throw new Error('A imagem precisa ter até 20 MB.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const max = kind === 'profile-avatar' ? 512 : 1600;
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio)); const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('O navegador não conseguiu preparar a imagem.');
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Não foi possível comprimir a imagem.')), 'image/webp', kind === 'profile-avatar' ? 0.82 : 0.78));
  const timestamp = now.toISOString();
  return { id, kind, ownerType, ownerId, mimeType: blob.type, sizeBytes: blob.size, width, height, blob, createdAt: timestamp, updatedAt: timestamp };
}
