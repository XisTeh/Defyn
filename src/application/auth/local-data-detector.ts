export interface LocalDataDetection {
  present: boolean;
  recordCount: number;
}

export interface CountableLocalStore { count(): Promise<number> }

export class LocalDataDetector {
  constructor(private readonly stores: CountableLocalStore[]) {}

  async detect(): Promise<LocalDataDetection> {
    const counts = await Promise.all(this.stores.map((store) => store.count()));
    const recordCount = counts.reduce((sum, count) => sum + count, 0);
    return { present: recordCount > 0, recordCount };
  }
}
