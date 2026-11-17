export class NonRetryableOutboxError extends Error {
  constructor(reason: unknown) {
    super(reason instanceof Error ? reason.message : String(reason), {
      cause: reason,
    });
    this.name = 'NonRetryableOutboxError';
  }
}
