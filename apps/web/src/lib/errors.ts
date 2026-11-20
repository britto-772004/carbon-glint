/** Normalises SDK errors (spec `Error` bodies or network failures) into a display message. */
export function toErrorMessage(error: unknown): string | undefined {
  if (error == null) return undefined;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Unexpected error';
}

/** Machine-readable code from a spec `Error` body (e.g. EMAIL_NOT_VERIFIED). */
export function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') return error.code;
  return undefined;
}

/** Reads a submitted <form> into a plain object of strings (stateless forms). */
export const formValues = (form: HTMLFormElement): Record<string, string> =>
  Object.fromEntries(Array.from(new FormData(form).entries()).map(([k, v]) => [k, String(v)]));
