import { describe, expect, it } from 'vitest';
import { readSupabaseConfig, SupabaseConfigurationError } from './config';

describe('configuração do Supabase', () => {
  it('mantém modo local quando as duas variáveis estão ausentes', () => {
    expect(readSupabaseConfig({})).toEqual({ mode: 'local' });
  });

  it('rejeita configuração parcial com erro controlado', () => {
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co' })).toThrow(SupabaseConfigurationError);
    expect(() => readSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' })).toThrow('incompleta');
  });

  it('aceita URL HTTPS e publishable key', () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co/', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' })).toEqual({
      mode: 'supabase', url: 'https://example.supabase.co', publishableKey: 'sb_publishable_example',
    });
  });

  it('rejeita URL insegura remota e chave de tipo incorreto', () => {
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: 'http://example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' })).toThrow('HTTPS');
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'not-a-browser-key' })).toThrow('Publishable Key');
  });
});
