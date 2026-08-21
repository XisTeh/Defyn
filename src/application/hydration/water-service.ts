import { validateWaterAmount, type WaterEntry } from '../../domain/hydration/hydration';
import type { WaterRepository } from '../../domain/hydration/repository';
import { toLocalDateKey } from '../../domain/shared/local-date';

export class WaterService {
  constructor(
    private readonly water: WaterRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async log(profileId: string, amountMl: number): Promise<WaterEntry> {
    validateWaterAmount(amountMl);
    const occurredAt = this.now();
    const timestamp = occurredAt.toISOString();
    const entry: WaterEntry = {
      id: this.id(),
      profileId,
      amountMl,
      occurredAt: timestamp,
      localDate: toLocalDateKey(occurredAt),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.water.save(entry);
    return entry;
  }

  async update(entry: WaterEntry, amountMl: number): Promise<WaterEntry> {
    validateWaterAmount(amountMl);
    const updated = { ...entry, amountMl, updatedAt: this.now().toISOString() };
    await this.water.save(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.water.remove(id);
  }
}
