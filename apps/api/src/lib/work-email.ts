/**
 * Work-email rules: personal/free/disposable providers can't sign up.
 * The list covers the major consumer and disposable providers; extend as needed.
 */
const PERSONAL_DOMAINS = new Set([
  // global consumer mail
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'ymail.com',
  'rocketmail.com',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'live.in',
  'msn.com',
  'windowslive.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'aim.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'zoho.com',
  'zohomail.com',
  'zohomail.in',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
  'inbox.ru',
  'list.ru',
  'bk.ru',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'web.de',
  'mail.com',
  'email.com',
  'usa.com',
  'hushmail.com',
  'tutanota.com',
  'tuta.io',
  'fastmail.com',
  'fastmail.fm',
  'rediffmail.com',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
  'libero.it',
  'orange.fr',
  'free.fr',
  'laposte.net',
  'btinternet.com',
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'bigpond.com',
  'optusnet.com.au',
  'shaw.ca',
  'rogers.com',
  'sympatico.ca',
  'seznam.cz',
  'wp.pl',
  'o2.pl',
  'interia.pl',
  't-online.de',
  'freenet.de',
  // disposable / throwaway
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'sharklasers.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'throwawaymail.com',
  'fakeinbox.com',
  'mintemail.com',
  'mohmal.com',
  'emailondeck.com',
  'tempail.com',
  'burnermail.io',
  'mailnesia.com',
  'spamgourmet.com',
  'moakt.com',
  'tempr.email',
  'discard.email',
]);

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const emailDomain = (email: string): string => normalizeEmail(email).split('@')[1] ?? '';

export const isWorkEmail = (email: string): boolean => {
  const domain = emailDomain(email);
  return domain.includes('.') && !PERSONAL_DOMAINS.has(domain);
};

/** "acme-corp.co.in" → "Acme Corp" (a starting point; editable in onboarding). */
export function companyNameFromDomain(domain: string): string {
  const label = domain.split('.')[0] ?? domain;
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}
