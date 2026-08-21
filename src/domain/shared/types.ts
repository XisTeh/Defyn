export type EntityId = string;
export type IsoDate = string;
export type IsoDateTime = string;

export interface AuditedEntity {
  id: EntityId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DateRange {
  startsAt: IsoDateTime;
  endsAt?: IsoDateTime;
}
