import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WaterEntry } from '../../domain/hydration/hydration';
import type { WaterRepository } from '../../domain/hydration/repository';
import { WaterService } from './water-service';

afterEach(() => vi.unstubAllGlobals());

class MemoryWaterRepository implements WaterRepository {
  entries = new Map<string, WaterEntry>();
  listByProfileAndDate(profileId: string, localDate: string) { return Promise.resolve([...this.entries.values()].filter((entry) => entry.profileId === profileId && entry.localDate === localDate)); }
  save(entry: WaterEntry) { this.entries.set(entry.id, entry); return Promise.resolve(); }
  remove(id: string) { this.entries.delete(id); return Promise.resolve(); }
  async removeByProfile(profileId: string) { for (const entry of this.entries.values()) if (entry.profileId === profileId) this.entries.delete(entry.id); }
}

describe('registro de água', () => {
  it('cria registro com perfil, horário e dia local', async () => {
    const repository = new MemoryWaterRepository();
    const service = new WaterService(repository, () => new Date(2026, 7, 21, 23, 50), () => 'water-1');
    const entry = await service.log('profile-a', 300);
    expect(entry).toMatchObject({ id: 'water-1', profileId: 'profile-a', amountMl: 300, localDate: '2026-08-21' });
  });

  it('continua criando água sem crypto.randomUUID', async () => {
    const getRandomValues = (bytes: Uint8Array) => {
      bytes.set([16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]);
      return bytes;
    };
    vi.stubGlobal('crypto', { getRandomValues });
    const service = new WaterService(new MemoryWaterRepository(), () => new Date(2026, 7, 21, 10));

    const entry = await service.log('profile-a', 300);
    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('edita um registro preservando identidade e horário', async () => {
    const repository = new MemoryWaterRepository();
    const service = new WaterService(repository, () => new Date(2026, 7, 21, 10), () => 'water-1');
    const original = await service.log('profile-a', 300);
    const updated = await service.update(original, 450);
    expect(updated.amountMl).toBe(450);
    expect(updated.id).toBe(original.id);
    expect(updated.occurredAt).toBe(original.occurredAt);
  });

  it('exclui um registro', async () => {
    const repository = new MemoryWaterRepository();
    const service = new WaterService(repository, () => new Date(2026, 7, 21, 10), () => 'water-1');
    await service.log('profile-a', 300);
    await service.remove('water-1');
    expect(repository.entries.size).toBe(0);
  });

  it('isola água por perfil e por dia', async () => {
    const repository = new MemoryWaterRepository();
    repository.entries.set('a', fixedEntry('a', 'profile-a', '2026-08-21', 300));
    repository.entries.set('b', fixedEntry('b', 'profile-b', '2026-08-21', 900));
    repository.entries.set('c', fixedEntry('c', 'profile-a', '2026-08-20', 500));
    expect((await repository.listByProfileAndDate('profile-a', '2026-08-21')).map((entry) => entry.id)).toEqual(['a']);
    expect((await repository.listByProfileAndDate('profile-b', '2026-08-21')).map((entry) => entry.id)).toEqual(['b']);
  });
});

function fixedEntry(id: string, profileId: string, localDate: string, amountMl: number): WaterEntry {
  return { id, profileId, localDate, amountMl, occurredAt: `${localDate}T12:00:00.000Z`, createdAt: `${localDate}T12:00:00.000Z`, updatedAt: `${localDate}T12:00:00.000Z` };
}
