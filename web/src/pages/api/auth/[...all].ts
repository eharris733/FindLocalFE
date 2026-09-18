// Better Auth's HTTP handler, mounted at /api/auth/* (its default basePath).
// All sign-in/up, OAuth callbacks, magic-link, session and account endpoints run
// through here. Never key-gated (apiScope → not 'keyed') and never edge-cached
// (cacheHeaders forces private, no-store for /api/auth/*).
import type { APIRoute } from 'astro';
import { getAuth } from '../../../lib/auth.js';
import { getEnv } from '../../../lib/db.js';

export const prerender = false;

export const ALL: APIRoute = ({ request }) => getAuth(getEnv()).handler(request);
