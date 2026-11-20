/** Normalises SDK errors (spec `Error` bodies or network failures) into a display message. */
export function toErrorMessage(error: unknown): string | undefined {
  if (error == null) return undefined;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Unexpected error';
}
