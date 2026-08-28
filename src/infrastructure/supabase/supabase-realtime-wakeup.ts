import type { DefynSupabaseClient } from './client';
import { SYNC_ENTITY_TYPES, type SyncEntityType } from '../../application/sync/sync-contract';
import { SyncWakeScheduler, type SyncWakeSchedulerOptions } from '../sync/sync-wake-scheduler';

type RealtimeChannel = ReturnType<DefynSupabaseClient['channel']>;

function realtimeFilter(entityType: SyncEntityType, accountId: string): string {
  return entityType === 'accounts' ? `id=eq.${accountId}` : `account_id=eq.${accountId}`;
}

/**
 * Usa Postgres Changes exclusivamente como invalidation. Nenhum payload do
 * socket é materializado: o Sync Engine continua buscando pelo cursor normal.
 */
export class SupabaseRealtimeWakeUp {
  private scheduler: SyncWakeScheduler | undefined;
  private channel: RealtimeChannel | undefined;
  private removing: Promise<unknown> | undefined;
  private wanted = false;

  constructor(
    private readonly client: DefynSupabaseClient,
    private readonly accountId: string,
    private readonly sync: () => Promise<void>,
    private readonly schedulerOptions?: SyncWakeSchedulerOptions,
  ) {}

  start(): void {
    this.wanted = true;
    this.scheduler ??= new SyncWakeScheduler(this.sync, this.schedulerOptions);
    if (this.channel) return;
    if (this.removing) return;

    let channel = this.client.channel(`defyn-sync:${this.accountId}`);
    for (const entityType of SYNC_ENTITY_TYPES) {
      channel = channel.on('postgres_changes', {
        event: '*', schema: 'public', table: entityType, filter: realtimeFilter(entityType, this.accountId),
      }, () => this.scheduler?.request());
    }
    this.channel = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') this.scheduler?.request();
    });
  }

  stop(): void {
    this.wanted = false;
    this.scheduler?.dispose();
    this.scheduler = undefined;
    const channel = this.channel;
    this.channel = undefined;
    if (!channel || this.removing) return;
    const removing = this.client.removeChannel(channel).catch(() => undefined).finally(() => {
      if (this.removing !== removing) return;
      this.removing = undefined;
      if (this.wanted) this.start();
    });
    this.removing = removing;
  }
}
