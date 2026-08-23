import { describe, expect, it } from 'vitest';
import { classifyOfflineAsset, isSafePrecacheAsset } from './offline-policy';

describe('política offline', () => {
  it('mantém shell, módulos e miniaturas como ativos regeneráveis', () => {
    expect(classifyOfflineAsset('/index.html')).toBe('shell');
    expect(classifyOfflineAsset('/assets/index-abc.js')).toBe('module');
    expect(classifyOfflineAsset('/ocr/por.traineddata.gz')).toBe('unsupported');
    expect(classifyOfflineAsset('/assets/defyn-exercise-01-abc.png')).toBe('exercise-thumbnail');
  });

  it('nunca trata mídia pessoal do IndexedDB como precache', () => {
    expect(isSafePrecacheAsset('blob:http://localhost/avatar')).toBe(false);
    expect(isSafePrecacheAsset('indexeddb://progress-photo/123')).toBe(false);
  });
});
