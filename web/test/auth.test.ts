import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { getAuth } from '../src/lib/auth.js';
import type { WebEnv } from '../src/lib/db.js';

function webEnv(overrides: Partial<WebEnv> = {}): WebEnv {
  return {
    DB: env.DB,
    AUTH_DB: env.AUTH_DB,
    AUTH_KV: env.AUTH_KV,
    BETTER_AUTH_SECRET: 'test-secret-do-not-use-in-prod',
    BETTER_AUTH_URL: 'http://localhost:4321',
    ...overrides,
  } as unknown as WebEnv;
}

describe('better auth on AUTH_DB', () => {
  it('signs up with email + password, writing a user row with the default plan', async () => {
    const auth = getAuth(webEnv());
    const res = await auth.api.signUpEmail({
      body: { email: 'dev@example.com', password: 'password-12345', name: 'Dev One' },
      asResponse: true,
    });
    expect(res.status).toBeLessThan(400);

    const row = await env.AUTH_DB.prepare(
      'select email, name, plan, emailVerified from user where email = ?',
    )
      .bind('dev@example.com')
      .first<{ email: string; name: string; plan: string; emailVerified: number }>();
    expect(row?.email).toBe('dev@example.com');
    expect(row?.name).toBe('Dev One');
    expect(row?.plan).toBe('free');
  });

  it('issues a usable session cookie that getSession can read back', async () => {
    const auth = getAuth(webEnv());
    await auth.api.signUpEmail({
      body: { email: 'dev2@example.com', password: 'password-12345', name: 'Dev Two' },
      asResponse: true,
    });
    const signIn = await auth.api.signInEmail({
      body: { email: 'dev2@example.com', password: 'password-12345' },
      asResponse: true,
    });
    expect(signIn.status).toBeLessThan(400);
    const cookie = signIn.headers.get('set-cookie');
    expect(cookie).toBeTruthy();

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookie!.split(';')[0]! }),
    });
    expect(session?.user.email).toBe('dev2@example.com');
  });
});
