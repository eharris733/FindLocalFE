// Transactional emails for the Better Auth developer portal, delivered via the
// Cloudflare Email Service `send_email` binding (see billingEmail.ts). All are
// best-effort: with no binding (local dev) they no-op silently so sign-up/sign-in
// still work against a local D1.
import type { EmailBinding } from './db.js';

const FROM = { email: 'developers@findlocal.community', name: 'FindLocal Developers' };

function box(inner: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px">${inner}</div>`;
}

/** Passwordless sign-in / sign-up link. */
export async function sendMagicLinkEmail(
  email: EmailBinding | undefined,
  opts: { to: string; url: string },
): Promise<void> {
  if (!email) return;
  const { to, url } = opts;
  const text = [
    `Sign in to your FindLocal developer account.`,
    ``,
    `Click the link below (valid for a few minutes, single use):`,
    url,
    ``,
    `Didn't request this? You can safely ignore this email.`,
  ].join('\n');
  const html = box(
    `<p>Sign in to your FindLocal developer account.</p>` +
      `<p><a href="${url}">Sign in to the developer portal</a></p>` +
      `<p style="color:#71717a;font-size:13px">This link is valid for a few minutes and can be used once. ` +
      `Didn't request it? You can safely ignore this email.</p>`,
  );
  await email.send({ to, from: FROM, subject: 'Your FindLocal sign-in link', html, text });
}

/** Confirm the email address on a new account. */
export async function sendVerificationEmail(
  email: EmailBinding | undefined,
  opts: { to: string; url: string },
): Promise<void> {
  if (!email) return;
  const { to, url } = opts;
  const text = [
    `Confirm your email to finish setting up your FindLocal developer account.`,
    ``,
    url,
  ].join('\n');
  const html = box(
    `<p>Confirm your email to finish setting up your FindLocal developer account.</p>` +
      `<p><a href="${url}">Verify email address</a></p>`,
  );
  await email.send({ to, from: FROM, subject: 'Verify your FindLocal email', html, text });
}

/** Password-reset link. */
export async function sendResetPasswordEmail(
  email: EmailBinding | undefined,
  opts: { to: string; url: string },
): Promise<void> {
  if (!email) return;
  const { to, url } = opts;
  const text = [
    `Reset your FindLocal developer account password.`,
    ``,
    `Click the link below (expires shortly):`,
    url,
    ``,
    `Didn't request this? You can safely ignore this email — your password won't change.`,
  ].join('\n');
  const html = box(
    `<p>Reset your FindLocal developer account password.</p>` +
      `<p><a href="${url}">Choose a new password</a></p>` +
      `<p style="color:#71717a;font-size:13px">Didn't request this? You can safely ignore this email — ` +
      `your password won't change.</p>`,
  );
  await email.send({ to, from: FROM, subject: 'Reset your FindLocal password', html, text });
}
