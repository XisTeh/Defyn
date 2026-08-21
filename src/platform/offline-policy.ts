export const OFFLINE_GLOB_PATTERNS = ['**/*.{js,css,html,woff2,gz,png}'] as const;

export type OfflineAssetKind = 'shell' | 'module' | 'exercise-thumbnail' | 'ocr' | 'pwa-icon' | 'personal-media' | 'unsupported';

export function classifyOfflineAsset(urlOrPath: string): OfflineAssetKind {
  if (/^(blob:|data:)/i.test(urlOrPath) || /indexeddb|personal-media/i.test(urlOrPath)) return 'personal-media';
  const path = urlOrPath.split('?')[0] ?? urlOrPath;
  if (/\/ocr\/(worker\.min\.js|por\.traineddata\.gz|tesseract-core-lstm\.wasm\.js)$/.test(path)) return 'ocr';
  if (/defyn-exercise-\d+.*\.png$/.test(path)) return 'exercise-thumbnail';
  if (/pwa-(192|512|maskable-512)\.png$/.test(path)) return 'pwa-icon';
  if (/\.(js|css)$/.test(path)) return 'module';
  if (/(^|\/)index\.html$/.test(path) || path === '/') return 'shell';
  return 'unsupported';
}

export function isSafePrecacheAsset(urlOrPath: string): boolean {
  const kind = classifyOfflineAsset(urlOrPath);
  return kind !== 'personal-media' && kind !== 'unsupported';
}
