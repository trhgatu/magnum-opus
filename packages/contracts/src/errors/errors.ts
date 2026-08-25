export const Errors = {
  // Auth
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    translationKey: 'exceptions.invalid.credentials',
    statusCode: 401,
  },
  INVALID_PASSWORD_RESET_TOKEN: {
    code: 'INVALID_PASSWORD_RESET_TOKEN',
    translationKey: 'exceptions.password.reset.token.invalid',
    statusCode: 400,
  },
  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    translationKey: 'exceptions.email.not.verified',
    statusCode: 403,
  },
  INVALID_EMAIL_VERIFICATION_TOKEN: {
    code: 'INVALID_EMAIL_VERIFICATION_TOKEN',
    translationKey: 'exceptions.email.verification.token.invalid',
    statusCode: 400,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    translationKey: 'exceptions.unauthorized',
    statusCode: 401,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    translationKey: 'exceptions.forbidden',
    statusCode: 403,
  },

  // User
  USER_ALREADY_EXISTS: {
    code: 'USER_ALREADY_EXISTS',
    translationKey: 'exceptions.user.already.exists',
    statusCode: 409,
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    translationKey: 'exceptions.user.not.found',
    statusCode: 404,
  },
  USER_DEACTIVATED: {
    code: 'USER_DEACTIVATED',
    translationKey: 'exceptions.user.deactivated',
    statusCode: 403,
  },
  USER_SELF_MUTATION_FORBIDDEN: {
    code: 'USER_SELF_MUTATION_FORBIDDEN',
    translationKey: 'exceptions.user.self.mutation.forbidden',
    statusCode: 409,
  },
  LAST_ADMINISTRATOR_REQUIRED: {
    code: 'LAST_ADMINISTRATOR_REQUIRED',
    translationKey: 'exceptions.user.last.administrator.required',
    statusCode: 409,
  },
  INVALID_USER_ROLES: {
    code: 'INVALID_USER_ROLES',
    translationKey: 'exceptions.user.roles.invalid',
    statusCode: 400,
  },

  // Role
  ROLE_ALREADY_EXISTS: {
    code: 'ROLE_ALREADY_EXISTS',
    translationKey: 'exceptions.role.already.exists',
    statusCode: 409,
  },
  ROLE_NOT_FOUND: {
    code: 'ROLE_NOT_FOUND',
    translationKey: 'exceptions.role.not.found',
    statusCode: 404,
  },
  SYSTEM_ROLE_DELETE_FORBIDDEN: {
    code: 'SYSTEM_ROLE_DELETE_FORBIDDEN',
    translationKey: 'exceptions.role.system.delete.forbidden',
    statusCode: 409,
  },
  INVALID_ROLE_PERMISSIONS: {
    code: 'INVALID_ROLE_PERMISSIONS',
    translationKey: 'exceptions.role.permissions.invalid',
    statusCode: 400,
  },
  ROLE_IN_USE: {
    code: 'ROLE_IN_USE',
    translationKey: 'exceptions.role.in.use',
    statusCode: 409,
  },

  // Notification
  NOTIFICATION_NOT_FOUND: {
    code: 'NOTIFICATION_NOT_FOUND',
    translationKey: 'exceptions.notification.not.found',
    statusCode: 404,
  },
  // Validation
  INVALID_EMAIL: {
    code: 'INVALID_EMAIL',
    translationKey: 'exceptions.invalid.email',
    statusCode: 400,
  },
  INVALID_USERNAME: {
    code: 'INVALID_USERNAME',
    translationKey: 'exceptions.invalid.username',
    statusCode: 400,
  },
  INVALID_PASSWORD: {
    code: 'INVALID_PASSWORD',
    translationKey: 'exceptions.invalid.password',
    statusCode: 400,
  },
  INVALID_USER_ID: {
    code: 'INVALID_USER_ID',
    translationKey: 'exceptions.invalid.user.id',
    statusCode: 400,
  },

  // Common
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    translationKey: 'errors.system_failure',
    statusCode: 500,
  },

  // Journal
  INVALID_JOURNAL_ENTRY_ID: {
    code: 'INVALID_JOURNAL_ENTRY_ID',
    translationKey: 'exceptions.journal.entry.id.invalid',
    statusCode: 400,
  },
  INVALID_JOURNAL_ENTRY_TITLE: {
    code: 'INVALID_JOURNAL_ENTRY_TITLE',
    translationKey: 'exceptions.journal.entry.title.invalid',
    statusCode: 400,
  },
  INVALID_JOURNAL_ENTRY_TRANSITION: {
    code: 'INVALID_JOURNAL_ENTRY_TRANSITION',
    translationKey: 'exceptions.journal.entry.transition.invalid',
    statusCode: 409,
  },
  JOURNAL_ENTRY_NOT_FOUND: {
    code: 'JOURNAL_ENTRY_NOT_FOUND',
    translationKey: 'exceptions.journal.entry.not.found',
    statusCode: 404,
  },
  JOURNAL_ENTRY_REVISION_CONFLICT: {
    code: 'JOURNAL_ENTRY_REVISION_CONFLICT',
    translationKey: 'exceptions.journal.entry.revision.conflict',
    statusCode: 409,
  },
  JOURNAL_ENTRY_PERMANENT_DELETE_FORBIDDEN: {
    code: 'JOURNAL_ENTRY_PERMANENT_DELETE_FORBIDDEN',
    translationKey: 'exceptions.journal.entry.permanent.delete.forbidden',
    statusCode: 409,
  },
  // Mood
  INVALID_MOOD_ID: {
    code: 'INVALID_MOOD_ID',
    translationKey: 'exceptions.mood.id.invalid',
    statusCode: 400,
  },
  INVALID_MOOD_INTENSITY: {
    code: 'INVALID_MOOD_INTENSITY',
    translationKey: 'exceptions.mood.intensity.invalid',
    statusCode: 400,
  },
  INVALID_MOOD_NOTE: {
    code: 'INVALID_MOOD_NOTE',
    translationKey: 'exceptions.mood.note.invalid',
    statusCode: 400,
  },
  MOOD_REVISION_CONFLICT: {
    code: 'MOOD_REVISION_CONFLICT',
    translationKey: 'exceptions.mood.revision.conflict',
    statusCode: 409,
  },
  MOOD_JOURNAL_ENTRY_NOT_EDITABLE: {
    code: 'MOOD_JOURNAL_ENTRY_NOT_EDITABLE',
    translationKey: 'exceptions.mood.journal.entry.not.editable',
    statusCode: 409,
  },
  MOOD_NOT_FOUND: {
    code: 'MOOD_NOT_FOUND',
    translationKey: 'exceptions.mood.not.found',
    statusCode: 404,
  },

  // Memory
  INVALID_MEMORY_ID: {
    code: 'INVALID_MEMORY_ID',
    translationKey: 'exceptions.memory.id.invalid',
    statusCode: 400,
  },

  INVALID_MEMORY_OCCURRED_ON: {
    code: 'INVALID_MEMORY_OCCURRED_ON',
    translationKey: 'exceptions.memory.occurred.on.invalid',
    statusCode: 400,
  },

  MEMORY_NOT_FOUND: {
    code: 'MEMORY_NOT_FOUND',
    translationKey: 'exceptions.memory.not.found',
    statusCode: 404,
  },

  INVALID_MEMORY_TITLE: {
    code: 'INVALID_MEMORY_TITLE',
    translationKey: 'exceptions.memory.title.invalid',
    statusCode: 400,
  },

  INVALID_MEMORY_CONTENT: {
    code: 'INVALID_MEMORY_CONTENT',
    translationKey: 'exceptions.memory.content.invalid',
    statusCode: 400,
  },

  INVALID_MEMORY_TRANSITION: {
    code: 'INVALID_MEMORY_TRANSITION',
    translationKey: 'exceptions.memory.transition.invalid',
    statusCode: 409,
  },

  INVALID_MEMORY_SOURCE_JOURNAL: {
    code: 'INVALID_MEMORY_SOURCE_JOURNAL',
    translationKey: 'exceptions.memory.source.journal.invalid',
    statusCode: 409,
  },
  MEMORY_SOURCE_JOURNAL_NOT_FOUND: {
    code: 'MEMORY_SOURCE_JOURNAL_NOT_FOUND',
    translationKey: 'exceptions.memory.source.journal.not.found',
    statusCode: 404,
  },
  MEMORY_REVISION_CONFLICT: {
    code: 'MEMORY_REVISION_CONFLICT',
    translationKey: 'exceptions.memory.revision.conflict',
    statusCode: 409,
  },
  MEMORY_PERMANENT_DELETE_FORBIDDEN: {
    code: 'MEMORY_PERMANENT_DELETE_FORBIDDEN',
    translationKey: 'exceptions.memory.permanent.delete.forbidden',
    statusCode: 409,
  },
  INVALID_HABIT_TITLE: {
    code: 'INVALID_HABIT_TITLE',
    translationKey: 'exceptions.habit.title.invalid',
    statusCode: 400,
  },
  INVALID_HABIT_ID: {
    code: 'INVALID_HABIT_ID',
    translationKey: 'exceptions.habit.id.invalid',
    statusCode: 400,
  },
  INVALID_HABIT_FREQUENCY: {
    code: 'INVALID_HABIT_FREQUENCY',
    translationKey: 'exceptions.habit.frequency.invalid',
    statusCode: 400,
  },
  HABIT_NOT_FOUND: {
    code: 'HABIT_NOT_FOUND',
    translationKey: 'exceptions.habit.not.found',
    statusCode: 404,
  },
  HABIT_REVISION_CONFLICT: {
    code: 'HABIT_REVISION_CONFLICT',
    translationKey: 'exceptions.habit.revision.conflict',
    statusCode: 409,
  },
  INVALID_HABIT_TRANSITION: {
    code: 'INVALID_HABIT_TRANSITION',
    translationKey: 'exceptions.habit.transition.invalid',
    statusCode: 409,
  },
  INVALID_HABIT_CHECK_IN_ID: {
    code: 'INVALID_HABIT_CHECK_IN_ID',
    translationKey: 'exceptions.habit.check.in.id.invalid',
    statusCode: 400,
  },
  INVALID_HABIT_CHECK_IN_DATE: {
    code: 'INVALID_HABIT_CHECK_IN_DATE',
    translationKey: 'exceptions.habit.check.in.date.invalid',
    statusCode: 400,
  },
  INVALID_HABIT_CHECK_IN_RANGE: {
    code: 'INVALID_HABIT_CHECK_IN_RANGE',
    translationKey: 'exceptions.habit.check.in.range.invalid',
    statusCode: 400,
  },
  HABIT_CHECK_IN_FORBIDDEN: {
    code: 'HABIT_CHECK_IN_FORBIDDEN',
    translationKey: 'exceptions.habit.check.in.forbidden',
    statusCode: 409,
  },
} as const;

export type ErrorDefinition = (typeof Errors)[keyof typeof Errors];
export type ErrorCode = ErrorDefinition['code'];
export type TranslationKey = ErrorDefinition['translationKey'];
