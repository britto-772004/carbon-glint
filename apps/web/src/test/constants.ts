/** Absolute base URL for the SDK in tests (Node's fetch can't resolve relative URLs). */
export const TEST_API_BASE_URL = 'http://localhost/api';

/** Build a full URL for an MSW handler, e.g. apiUrl('/health'). Paths match openapi.yaml. */
export const apiUrl = (path: `/${string}`) => `${TEST_API_BASE_URL}${path}`;
