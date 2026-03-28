/** PostgREST error when a table exists in DB but API schema cache is stale. */
export function isPostgrestSchemaCacheError(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("schema cache") || (m.includes("could not find") && m.includes("in the schema"));
}
