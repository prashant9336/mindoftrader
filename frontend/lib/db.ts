import { sql } from '@vercel/postgres'

export { sql }

export const IS_DB_CONFIGURED = !!process.env.POSTGRES_URL

// Convert a JS string array to a PostgreSQL TEXT[] literal, e.g. {"a","b"}
// Required because @vercel/postgres sql tag only accepts Primitive params.
export function toTextArray(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return '{}'
  return `{${arr.map((s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`
}
