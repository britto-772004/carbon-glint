import type { EmailMessage } from './mailer.js';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Branded, email-client-safe layout (inline styles, table-free single column). */
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f8f7;font-family:Livvic,Segoe UI,Roboto,Arial,sans-serif;color:#10201c">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="font-size:20px;font-weight:700;color:#0f766e;margin-bottom:24px">🌿 Carbon Glint</div>
  <div style="background:#fff;border:1px solid #dfe7e4;border-radius:12px;padding:28px">
    <h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
    ${bodyHtml}
  </div>
  <p style="font-size:12px;color:#5b6b66;margin-top:20px">You received this because of activity on Carbon Glint. If this wasn't you, you can ignore this email.</p>
</div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${esc(label)}</a></p>
   <p style="font-size:12px;color:#5b6b66;word-break:break-all">Or paste this link into your browser: ${esc(href)}</p>`;

export function verificationEmail(to: string, name: string, link: string): EmailMessage {
  return {
    to,
    subject: 'Verify your email for Carbon Glint',
    html: layout(
      'Confirm your work email',
      `<p>Hi ${esc(name)},</p><p>Confirm your email to activate your Carbon Glint account. The link expires in 24 hours.</p>${button(link, 'Verify email')}`,
    ),
    text: `Hi ${name},\n\nConfirm your email to activate your Carbon Glint account (expires in 24 hours):\n${link}\n`,
  };
}

export function invitationEmail(to: string, tenantName: string, inviterName: string, link: string): EmailMessage {
  return {
    to,
    subject: `${inviterName} invited you to ${tenantName} on Carbon Glint`,
    html: layout(
      `Join ${tenantName} on Carbon Glint`,
      `<p>${esc(inviterName)} invited you to measure and report emissions for <b>${esc(tenantName)}</b>.</p><p>The invitation expires in 7 days.</p>${button(link, 'Accept invitation')}`,
    ),
    text: `${inviterName} invited you to ${tenantName} on Carbon Glint (expires in 7 days):\n${link}\n`,
  };
}

export function newPasswordEmail(to: string, name: string, password: string, loginLink: string): EmailMessage {
  return {
    to,
    subject: 'Your new Carbon Glint password',
    html: layout(
      'Your password was reset',
      `<p>Hi ${esc(name)},</p><p>Here is your new password. All other sessions were signed out.</p>
       <p style="font-family:ui-monospace,Menlo,monospace;font-size:18px;background:#f0f5f3;border-radius:8px;padding:12px 16px;letter-spacing:1px">${esc(password)}</p>
       <p>Please change it after signing in (user menu → Change password).</p>${button(loginLink, 'Sign in')}`,
    ),
    text: `Hi ${name},\n\nYour new Carbon Glint password: ${password}\n\nAll other sessions were signed out. Please change it after signing in: ${loginLink}\n`,
  };
}
