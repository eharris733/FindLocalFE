// `cloudflare:test` is provided by @cloudflare/vitest-pool-workers at run time.
// web/tsconfig.json points `@cloudflare/workers-types` at a local minimal stub
// (the real package's DOM-colliding globals break `astro check` on the client
// <script> blocks), so the module is declared here rather than by pulling in the
// pool's own types. No top-level import: this file must stay a *global* script so
// the declaration is ambient, not an augmentation of a module that doesn't exist.
declare module 'cloudflare:test' {
  export const env: {
    DB: import('@cloudflare/workers-types').D1Database;
    AUTH_DB: import('@cloudflare/workers-types').D1Database;
    AUTH_KV: import('@cloudflare/workers-types').KVNamespace;
  };
}
