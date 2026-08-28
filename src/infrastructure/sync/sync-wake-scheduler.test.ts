import { afterEach, describe, expect, it, vi } from 'vitest';
import { SyncWakeScheduler } from './sync-wake-scheduler';

afterEach(() => vi.useRealTimers());

describe('SyncWakeScheduler', () => {
  it('agrupa sinais próximos em um único pull', async () => {
    vi.useFakeTimers();
    const sync = vi.fn(async () => undefined);
    const scheduler = new SyncWakeScheduler(sync, { delayMs: 900 });

    scheduler.request(); scheduler.request(); scheduler.request();
    await vi.advanceTimersByTimeAsync(900);
    expect(sync).toHaveBeenCalledOnce();
  });

  it('executa um pull de continuidade quando sinal chega durante pull ativo', async () => {
    vi.useFakeTimers();
    let finish: (() => void) | undefined;
    const sync = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const scheduler = new SyncWakeScheduler(sync, { delayMs: 900 });

    scheduler.request();
    await vi.advanceTimersByTimeAsync(900);
    scheduler.request();
    finish?.();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(900);
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('descarta sinais depois do dispose', async () => {
    vi.useFakeTimers();
    const sync = vi.fn(async () => undefined);
    const scheduler = new SyncWakeScheduler(sync, { delayMs: 900 });
    scheduler.request(); scheduler.dispose();
    await vi.advanceTimersByTimeAsync(900);
    expect(sync).not.toHaveBeenCalled();
  });
});
