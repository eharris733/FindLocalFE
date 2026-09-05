// Minimal D1 surface for the site's type-check. The real @cloudflare/workers-types
// declares DOM-colliding globals (Element, Request…) that break the client-side
// <script> blocks under astro check, so tsconfig `paths` points the package name
// here. Runtime is unaffected (type-only imports are erased); the MCP worker and
// shared/ still type-check against the real package.
export interface D1Meta {
  duration?: number;
  rows_read?: number;
  rows_written?: number;
  [k: string]: unknown;
}
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}
