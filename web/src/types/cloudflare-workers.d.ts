// `import { env } from 'cloudflare:workers'` (bindings at runtime; see lib/db.ts).
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
