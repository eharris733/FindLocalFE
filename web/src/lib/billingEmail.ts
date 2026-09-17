// Delivers a freshly-minted API key to a new subscriber via Cloudflare Email
// Service (the `send_email` Worker binding). The `from` domain must be onboarded:
//   npx wrangler email sending enable findlocal.community
import type { EmailBinding } from './db.js';

const FROM = { email: 'developers@findlocal.community', name: 'FindLocal Developers' };

export async function sendApiKeyEmail(
  email: EmailBinding | undefined,
  opts: { to: string; plan: string; key: string },
): Promise<void> {
  if (!email) return; // no binding in local dev — skip silently
  const { to, plan, key } = opts;
  const text = [
    `Welcome to the FindLocal ${plan} plan.`,
    ``,
    `Your API key:`,
    key,
    ``,
    `Use it as a Bearer token:`,
    `  curl -H "Authorization: Bearer ${key}" https://findlocal.community/api/events?city=boston`,
    ``,
    `Or paste it when connecting the MCP server (mcp.findlocal.community/mcp).`,
    `Docs: https://findlocal.community/developers/api`,
    `Manage your plan: https://findlocal.community/developers/pricing`,
  ].join('\n');
  const html =
    `<p>Welcome to the FindLocal <strong>${plan}</strong> plan.</p>` +
    `<p>Your API key (treat it like a password):</p>` +
    `<pre style="background:#f4f4f5;padding:12px;border-radius:8px;font-size:14px">${key}</pre>` +
    `<p>Use it as a Bearer token against <code>https://findlocal.community/api/*</code>, ` +
    `or paste it when connecting the MCP server.</p>` +
    `<p><a href="https://findlocal.community/developers/api">API docs</a> · ` +
    `<a href="https://findlocal.community/developers/pricing">Manage plan</a></p>`;
  await email.send({ to, from: FROM, subject: `Your FindLocal API key (${plan} plan)`, html, text });
}
