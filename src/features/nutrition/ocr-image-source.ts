export const NUTRITION_CAMERA_CAPTURE = 'environment' as const;
export const NUTRITION_GALLERY_CAPTURE = undefined;

export function nutritionImageFlow(hasImage: boolean, hasOcr: boolean, manual: boolean): 'source' | 'prepare' | 'review' | 'manual' {
  if (manual) return 'manual';
  if (hasOcr) return 'review';
  return hasImage ? 'prepare' : 'source';
}
