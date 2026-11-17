UPDATE "outbox_events"
SET "type" = 'reflection.journal-entry.sealed.v1'
WHERE "type" = 'relection.journal-entry.sealed.v1';
