// Small, dependency-free helpers for turning vendor HTML into text the parsers can read.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', hellip: '…', ndash: '–', mdash: '—' };

export function decode(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e.toLowerCase()] ?? m;
  });
}

// Visible text, one block element per line.
export function htmlToText(html) {
  return decode(String(html)
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|td|th|dd|dt|label|span)>/gi, m => (/td|th|span/i.test(m) ? ' \n' : '\n'))
    .replace(/<[^>]+>/g, ' '))
    .split('\n').map(l => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).join('\n');
}

// Rows of a table as arrays of cell text.
export function tableRows(html) {
  return [...String(html).matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(([tr]) =>
    [...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(([, c]) => htmlToText(c).replace(/\n+/g, '\n').trim()));
}

// Anti-bot / human-verification pages, shared by every vendor. Detection only: the agent never tries to solve them.
const CHALLENGES = [
  [/verify (that )?you(['’]| a)re (a )?human/i, 'human-verification interstitial'],
  [/security check failed/i, 'security check failed'],
  [/\bcaptcha\b/i, 'captcha'],
  [/are you a robot/i, 'robot check'],
  [/attention required|just a moment\.\.\./i, 'bot-protection challenge'],
  [/access denied|403 forbidden/i, 'access denied'],
];
export function detectChallenge(text) {
  for (const [re, why] of CHALLENGES) if (re.test(text)) return why;
  return null;
}

export const normCategory = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
