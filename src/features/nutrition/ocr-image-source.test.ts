import { describe, expect, it } from 'vitest';
import { NUTRITION_CAMERA_CAPTURE, NUTRITION_GALLERY_CAPTURE, nutritionImageFlow } from './ocr-image-source';

describe('origem da imagem do OCR', () => {
  it('abre câmera traseira sem aplicar capture à galeria', () => {
    expect(NUTRITION_CAMERA_CAPTURE).toBe('environment');
    expect(NUTRITION_GALLERY_CAPTURE).toBeUndefined();
  });

  it('só libera revisão depois do OCR e preserva preenchimento manual', () => {
    expect(nutritionImageFlow(false, false, false)).toBe('source');
    expect(nutritionImageFlow(true, false, false)).toBe('prepare');
    expect(nutritionImageFlow(true, true, false)).toBe('review');
    expect(nutritionImageFlow(false, false, true)).toBe('manual');
  });
});
