-- Journal and Mood already enforce these invariants in their domain models.
-- Keep the database boundary equally strict for imports, scripts and future
-- write adapters that do not enter through the HTTP DTO layer.

ALTER TABLE "journal_entries"
ADD CONSTRAINT "journal_entries_revision_check"
CHECK ("revision" >= 1),

ADD CONSTRAINT "journal_entries_title_not_blank_check"
CHECK (
  "title" IS NULL
  OR CHAR_LENGTH(BTRIM("title")) > 0
);

ALTER TABLE "moods"
ADD CONSTRAINT "moods_revision_check"
CHECK ("revision" >= 1),

ADD CONSTRAINT "moods_note_not_blank_check"
CHECK (
  "note" IS NULL
  OR CHAR_LENGTH(BTRIM("note")) > 0
);
