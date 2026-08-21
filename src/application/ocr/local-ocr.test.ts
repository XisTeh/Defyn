import { describe, expect, it } from 'vitest';
import { describeOcrProgress } from './local-ocr';

describe('etapas do OCR local', () => {
  it('traduz estados técnicos sem prometer precisão', () => {
    expect(describeOcrProgress({ status: 'recognizing text', progress: 0.42 })).toBe('Lendo a tabela 42%');
    expect(describeOcrProgress({ status: 'unknown', progress: 0 })).toBe('Processando no dispositivo');
  });
});
