import { describe, expect, it } from 'vitest';
import { NUTRITION_CAMERA_CAPTURE, NUTRITION_GALLERY_CAPTURE, nutritionImageFlow, nutritionOcrPrimaryAction } from './ocr-image-source';

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

  it('mantém um CTA alcançável em cada etapa acionável', () => {
    expect(nutritionOcrPrimaryAction(false, false, false)).toBeUndefined();
    expect(nutritionOcrPrimaryAction(true, false, false)).toEqual({ kind: 'read', label: 'Ler tabela nutricional' });
    expect(nutritionOcrPrimaryAction(true, true, false)).toEqual({ kind: 'save', label: 'Confirmar e salvar' });
    expect(nutritionOcrPrimaryAction(false, false, true)).toEqual({ kind: 'save', label: 'Salvar alimento' });
  });
});
