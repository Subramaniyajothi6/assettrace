import type { AssetStatus, HistoryEvent, Prisma } from "@prisma/client";
import type { Tx } from "./db";

export type HistoryInput = {
  assetId: string;
  actorId: string;
  event: HistoryEvent;
  description: string;
  fromStatus?: AssetStatus | null;
  toStatus?: AssetStatus | null;
  metadata?: Prisma.InputJsonValue;
};

/** Append one row to the asset's timeline. AssetHistory is append-only: never update or delete. */
export function recordHistory(tx: Tx, input: HistoryInput) {
  return tx.assetHistory.create({
    data: {
      assetId: input.assetId,
      actorId: input.actorId,
      event: input.event,
      description: input.description,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      metadata: input.metadata,
    },
  });
}
