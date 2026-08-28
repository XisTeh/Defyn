import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupabaseRealtimeWakeUp } from './supabase-realtime-wakeup';

const accountA = '11111111-1111-4111-8111-111111111111';
const accountB = '22222222-2222-4222-8222-222222222222';

class FakeChannel {
  bindings: { table?: string; filter?: string; callback: (...args: unknown[]) => void }[] = [];
  status?: (state: string) => void;
  on(_type: string, config: { table?: string; filter?: string }, callback: (...args: unknown[]) => void) { this.bindings.push({ ...config, callback }); return this; }
  subscribe(callback: (state: string) => void) { this.status = callback; return this; }
}

function fakeClient() {
  const channels: FakeChannel[] = [];
  return {
    channels,
    channel: vi.fn(() => { const channel = new FakeChannel(); channels.push(channel); return channel; }),
    removeChannel: vi.fn(async () => 'ok'),
  };
}

afterEach(() => vi.useRealTimers());

describe('SupabaseRealtimeWakeUp', () => {
  it('agenda pull por evento remoto sem aplicar payload do socket', async () => {
    vi.useFakeTimers();
    const client = fakeClient(); const sync = vi.fn(async () => undefined);
    const wakeUp = new SupabaseRealtimeWakeUp(client as never, accountA, sync, { delayMs: 900 });
    wakeUp.start();
    const hydration = client.channels[0]!.bindings.find((binding) => binding.table === 'hydration_entries')!;
    hydration.callback({ account_id: accountB } as never);
    await vi.advanceTimersByTimeAsync(900);

    expect(sync).toHaveBeenCalledOnce();
    expect(client.channels[0]!.bindings).toHaveLength(15);
    expect(hydration.filter).toBe(`account_id=eq.${accountA}`);
  });

  it('agrupa self-events e executa catch-up ao reconectar', async () => {
    vi.useFakeTimers();
    const client = fakeClient(); const sync = vi.fn(async () => undefined);
    const wakeUp = new SupabaseRealtimeWakeUp(client as never, accountA, sync, { delayMs: 900 });
    wakeUp.start();
    const channel = client.channels[0]!;
    channel.bindings[0]!.callback(); channel.bindings[1]!.callback();
    await vi.advanceTimersByTimeAsync(900);
    expect(sync).toHaveBeenCalledOnce();
    channel.status?.('SUBSCRIBED');
    await vi.advanceTimersByTimeAsync(900);
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('encerra a subscription e isola a próxima conta', async () => {
    const client = fakeClient(); const sync = vi.fn(async () => undefined);
    const accountWakeUp = new SupabaseRealtimeWakeUp(client as never, accountA, sync);
    accountWakeUp.start(); accountWakeUp.stop();
    await Promise.resolve();
    const nextWakeUp = new SupabaseRealtimeWakeUp(client as never, accountB, sync);
    nextWakeUp.start();

    expect(client.removeChannel).toHaveBeenCalledOnce();
    expect(client.channels[1]!.bindings[0]!.filter).toBe(`id=eq.${accountB}`);
  });
});
