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

  it('renders every nutrition column as an in-flow mobile card instead of a wide table', () => {
    const component = readFileSync(new URL('./NutritionLabelTable.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('./nutrition-workspace.css', import.meta.url), 'utf8');
    expect(component).toContain('className="nutrition-label-mobile-list"');
    expect(component).toContain('label.columns.map');
    expect(styles).toMatch(/@media \(max-width: 560px\)[\s\S]*\.nutrition-label-table-scroll\s*\{\s*display:\s*none/);
    expect(styles).toMatch(/\.nutrition-label-mobile-cells\s*\{[^}]*grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)/);
    expect(styles).not.toMatch(/\.nutrition-label-mobile-list[^}]*overflow-x/);
  });

  it('keeps four-corner perspective controls and the photo/data switch reachable', () => {
    const workspace = readFileSync(new URL('./NutritionWorkspace.tsx', import.meta.url), 'utf8');
    const perspective = readFileSync(new URL('./PerspectiveCropEditor.tsx', import.meta.url), 'utf8');
    expect(workspace).toContain('<PerspectiveCropEditor');
    expect(workspace).toContain('className="ocr-review-switch"');
    expect(workspace).toContain('Ver foto original em tela cheia');
    for (const corner of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']) expect(perspective).toContain(corner);
  });
});
