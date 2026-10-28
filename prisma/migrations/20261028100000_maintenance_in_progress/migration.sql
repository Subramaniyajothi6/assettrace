-- Starting work on a maintenance job gets its own history event (was logged as UPDATED / "Details updated").
ALTER TYPE "HistoryEvent" ADD VALUE 'MAINTENANCE_IN_PROGRESS' AFTER 'MAINTENANCE_STARTED';
