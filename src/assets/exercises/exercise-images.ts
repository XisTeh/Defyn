/** Build-time local image map. Every published DEFYN exercise owns one PNG. */
const thumbnailModules = import.meta.glob('./generated/thumbnails/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

export function getOriginalExerciseImage(exerciseId: string): string | undefined {
  return thumbnailModules[`./generated/thumbnails/${exerciseId}.png`];
}
