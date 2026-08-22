export const NUTRITION_CAMERA_CAPTURE = 'environment' as const;
export const NUTRITION_GALLERY_CAPTURE = undefined;

export function nutritionImageFlow(hasImage: boolean, hasOcr: boolean, manual: boolean): 'source' | 'prepare' | 'review' | 'manual' {
  if (manual) return 'manual';
  if (hasOcr) return 'review';
  return hasImage ? 'prepare' : 'source';
}

export type NutritionOcrPrimaryAction = { kind: 'read' | 'save'; label: string } | undefined;

export function nutritionOcrPrimaryAction(hasImage: boolean, hasOcr: boolean, manual: boolean): NutritionOcrPrimaryAction {
  if (hasOcr) return { kind: 'save', label: 'Confirmar e salvar' };
  if (manual) return { kind: 'save', label: 'Salvar alimento' };
  if (hasImage) return { kind: 'read', label: 'Ler tabela nutricional' };
  return undefined;
}
