import {
  PULL_ORDER,
  PUSH_ORDER,
  retryDelayMs,
  type MutableSyncEntityType,
  type OutboxEvent,
  type PullCursor,
  type PushResult,
  type RemoteSyncGateway,
  type RemoteSyncRecord,
  type SyncConflict,
  type SyncEntityType,
  type SyncMetadata,
  type SyncStatusSnapshot,
} from './sync-contract';

export interface LocalSyncGateway {
  listPending(accountId: string, now: string): Promise<OutboxEvent[]>;
  getMetadata(accountId: string, entityType: SyncEntityType, entityId: string): Promise<SyncMetadata | undefined>;
  markPushSucceeded(event: OutboxEvent, record: RemoteSyncRecord, syncedAt: string): Promise<void>;
  markPushFailed(event: OutboxEvent, error: string, nextAttemptAt: string): Promise<void>;
  preserveConflict(conflict: SyncConflict): Promise<void>;
  getCursor(accountId: string, entityType: SyncEntityType): Promise<PullCursor | undefined>;
  applyPulled(accountId: string, entityType: SyncEntityType, record: RemoteSyncRecord): Promise<'applied' | 'ignored' | 'conflict'>;
  saveCursor(cursor: PullCursor): Promise<void>;
  status(accountId: string): Promise<Pick<SyncStatusSnapshot, 'pendingCount' | 'conflictCount' | 'lastSyncedAt'>>;
}

export interface SyncRunResult {
  pushed: number;
  pulled: number;
  conflicts: number;
}

export class SyncEngine {
  constructor(
    private readonly local: LocalSyncGateway,
    private readonly remote: RemoteSyncGateway,
    private readonly now: () => Date = () => new Date(),
    private readonly pageSize = 100,
  ) {}

  async run(accountId: string): Promise<SyncRunResult> {
    const result: SyncRunResult = { pushed: 0, pulled: 0, conflicts: 0 };
    const now = this.now().toISOString();
    const pending = await this.local.listPending(accountId, now);
    const order = new Map(PUSH_ORDER.map((entityType, index) => [entityType, index]));
    pending.sort((left, right) => {
      const leftOrder = order.get(left.entityType) ?? 99;
      const rightOrder = order.get(right.entityType) ?? 99;
      const dependencyOrder = left.operation === 'DELETE' && right.operation === 'DELETE' ? rightOrder - leftOrder : leftOrder - rightOrder;
      return dependencyOrder || left.createdAt.localeCompare(right.createdAt);
    });

    for (const event of pending) {
      const metadata = await this.local.getMetadata(accountId, event.entityType, event.entityId);
      try {
        const pushed = await this.remote.push(event, metadata?.remoteRevision);
        if (pushed.status === 'conflict') {
          await this.local.preserveConflict(this.conflictFrom(event, pushed, now));
          result.conflicts += 1;
          continue;
        }
        await this.local.markPushSucceeded(event, pushed.record, now);
        result.pushed += 1;
      } catch (caught) {
        const attempts = event.attempts + 1;
        const nextAttemptAt = new Date(this.now().getTime() + retryDelayMs(attempts)).toISOString();
        await this.local.markPushFailed(event, safeSyncError(caught), nextAttemptAt);
        throw caught;
      }
    }

    for (const entityType of PULL_ORDER) {
      let cursor = await this.local.getCursor(accountId, entityType);
      while (true) {
        const page = await this.remote.pull(entityType, cursor, this.pageSize);
        if (page.length === 0) break;
        for (const record of page) {
          const applied = await this.local.applyPulled(accountId, entityType, record);
          if (applied === 'applied') result.pulled += 1;
          if (applied === 'conflict') result.conflicts += 1;
          cursor = {
            id: `${accountId}:${entityType}`,
            accountId,
            entityType,
            updatedAt: record.updated_at,
            entityId: record.id,
          };
          await this.local.saveCursor(cursor);
        }
        if (page.length < this.pageSize) break;
      }
    }
    return result;
  }

  private conflictFrom(event: OutboxEvent, pushed: Extract<PushResult, { status: 'conflict' }>, detectedAt: string): SyncConflict {
    return {
      id: event.id,
      accountId: event.accountId,
      entityType: event.entityType,
      entityId: event.entityId,
      profileId: event.profileId,
      operation: event.operation,
      localPayload: event.payload,
      remotePayload: pushed.record.payload ?? {},
      remoteRevision: pushed.record.revision ?? 1,
      remoteDeletedAt: pushed.record.deleted_at ?? undefined,
      detectedAt,
    };
  }
}

export function safeSyncError(caught: unknown): string {
  if (!(caught instanceof Error)) return 'Falha temporária de sincronização.';
  const normalized = caught.message.toLowerCase();
  if (normalized.includes('fetch') || normalized.includes('network') || normalized.includes('offline')) return 'Sem conexão com a nuvem.';
  if (normalized.includes('jwt') || normalized.includes('token') || normalized.includes('session')) return 'A sessão precisa ser renovada.';
  return 'Não foi possível sincronizar agora.';
}

export function remoteEntityType(value: string): value is MutableSyncEntityType {
  return PUSH_ORDER.includes(value as MutableSyncEntityType);
}
