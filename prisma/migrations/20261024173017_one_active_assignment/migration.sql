-- Business rule 2 (docs/ARCHITECTURE.md §4): at most one active assignment per asset.
-- Prisma can't express partial unique indexes, so this lives in raw SQL.
CREATE UNIQUE INDEX "one_active_assignment" ON "Assignment"("assetId") WHERE "isActive" = true;
