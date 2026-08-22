import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('OCR mobile modal layout', () => {
  it('keeps the form body scrollable and the primary action in a safe-area footer', () => {
    const component = readFileSync(new URL('./NutritionWorkspace.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('./nutrition-workspace.css', import.meta.url), 'utf8');

    expect(component).toContain('className="food-form-scroll"');
    expect(component).toContain('className="food-form-footer"');
    expect(styles).toMatch(/\.food-form-scroll\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto/);
    expect(styles).toMatch(/\.food-form-footer\s*\{[^}]*env\(safe-area-inset-bottom\)/);
    expect(styles).toMatch(/100dvh/);
  });
});
