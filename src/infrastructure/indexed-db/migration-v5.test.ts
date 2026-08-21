import { describe, expect, it } from 'vitest';
import { DATABASE_VERSION } from './database';
import { migrateProgressPhotoToV5, migrateProgressRecordToV5 } from './migration-v5';

describe('migration v4 → v5', () => {
  it('declara schema v5 aditivo', () => { expect(DATABASE_VERSION).toBe(5); });
  it('preserva pesagem legada e cria data local/ocorrência', () => { expect(migrateProgressRecordToV5({id:'r',profileId:'p',date:'2026-08-01',weightKg:80,createdAt:'2026-08-01T15:00:00Z',updatedAt:'2026-08-01T15:00:00Z'})).toMatchObject({id:'r',localDate:'2026-08-01',weightKg:80,source:'migration'}); });
  it('normaliza ângulo legado sem inventar mídia', () => { const photo=migrateProgressPhotoToV5({id:'f',profileId:'p',date:'2026-08-01',angle:'front',createdAt:'2026-08-01T15:00:00Z',updatedAt:'2026-08-01T15:00:00Z'}); expect(photo.category).toBe('front'); expect(photo.mediaId).toBeUndefined(); });
});
