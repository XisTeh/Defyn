export interface SyncWakeSchedulerOptions {
  delayMs?: number;
  setTimeout?: (callback: () => void, milliseconds: number) => number;
  clearTimeout?: (timer: number) => void;
}

/** Agrupa sinais remotos e garante no máximo um pull concorrente por scheduler. */
export class SyncWakeScheduler {
  private readonly delayMs: number;
  private readonly schedule: (callback: () => void, milliseconds: number) => number;
  private readonly cancel: (timer: number) => void;
  private timer: number | undefined;
  private running = false;
  private requested = false;
  private disposed = false;

  constructor(private readonly sync: () => Promise<void>, options: SyncWakeSchedulerOptions = {}) {
    this.delayMs = options.delayMs ?? 900;
    this.schedule = options.setTimeout ?? ((callback, milliseconds) => globalThis.setTimeout(callback, milliseconds) as unknown as number);
    this.cancel = options.clearTimeout ?? ((timer) => globalThis.clearTimeout(timer));
  }

  request(): void {
    if (this.disposed) return;
    this.requested = true;
    if (this.running || this.timer !== undefined) return;
    this.timer = this.schedule(() => {
      this.timer = undefined;
      void this.flush();
    }, this.delayMs);
  }

  dispose(): void {
    this.disposed = true;
    this.requested = false;
    if (this.timer !== undefined) this.cancel(this.timer);
    this.timer = undefined;
  }

  private async flush(): Promise<void> {
    if (this.disposed || this.running || !this.requested) return;
    this.requested = false;
    this.running = true;
    try {
      await this.sync();
    } catch {
      // O Sync Engine já preserva outbox e expõe status seguro para erros temporários.
    } finally {
      this.running = false;
      if (this.requested && !this.disposed) this.request();
    }
  }
}
