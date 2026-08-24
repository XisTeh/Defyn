import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./routine-workspace.css', import.meta.url), 'utf8');

describe('planejamento habitual responsivo', () => {
  it('usa sete colunas flexíveis sem scroll no desktop', () => {
    expect(css).toContain('@media(min-width:901px){.routine-day-list{min-width:0;grid-template-columns:repeat(7,minmax(0,1fr));overflow:visible');
  });

  it('mantém scroll horizontal funcional e invisível apenas em telas estreitas', () => {
    expect(css).toContain('@media(max-width:900px){.routine-day-list{overflow-x:auto;overflow-y:visible;scroll-snap-type:x proximity;scrollbar-width:none;-ms-overflow-style:none}');
    expect(css).toContain('.routine-day-list::-webkit-scrollbar{display:none}');
  });
});
