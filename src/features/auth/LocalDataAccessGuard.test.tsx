import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalDataAccessGuard } from './LocalDataAccessGuard';

const ACCOUNT_A = '10000000-0000-4000-8000-000000000001';
const ACCOUNT_B = '20000000-0000-4000-8000-000000000002';

describe('barreira de renderização dos dados locais', () => {
  it('não entrega nenhum snapshot de A para uma decisão bloqueada de B', () => {
    const html = renderToStaticMarkup(<LocalDataAccessGuard decision={{ status: 'blocked', accountId: ACCOUNT_B }}><article>Perfil secreto A · peso · treino</article></LocalDataAccessGuard>);
    expect(html).toBe('');
  });

  it('renderiza somente quando o owner coincide', () => {
    const html = renderToStaticMarkup(<LocalDataAccessGuard decision={{ status: 'allowed', accountId: ACCOUNT_A, reason: 'owner-match' }}><article>Perfil A</article></LocalDataAccessGuard>);
    expect(html).toContain('Perfil A');
  });
});
