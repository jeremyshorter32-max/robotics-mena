// FortiGuard web filter lookup (https://www.fortiguard.com/webfilter?q=<domain>).
// The result page shows "Category: <name>" ("Not Rated" before review) above a rating-history block.
import { htmlToText, detectChallenge } from '../html.mjs';

export const id = 'fortinet';

export function parse(html) {
  const text = htmlToText(html);
  if (/security check failed/i.test(text)) return { raw_status: 'Security Check Failed', normalized_status: 'BLOCKED', current_category: null, note: 'reCAPTCHA gate (security check failed); needs manual check' };
  // Only the first "Category:" line is current; later ones belong to the rating history.
  const m = /^\s*Category\s*:\s*(.+?)\s*$/im.exec(text) || /Category\s*:\s*([^\n]+)/i.exec(text);
  if (!m) {
    const ch = detectChallenge(text);
    if (ch) return { raw_status: ch, normalized_status: 'BLOCKED', current_category: null, note: `${ch}; needs manual check` };
    return { raw_status: text.slice(0, 120), normalized_status: 'ERROR', current_category: null, note: 'no "Category:" field found (page layout may have changed)' };
  }
  const cat = m[1].trim();
  if (/^not\s*rated$/i.test(cat) || /^unrated$/i.test(cat)) return { raw_status: `Category: ${cat}`, normalized_status: 'UNCATEGORIZED', current_category: null, note: null };
  return { raw_status: `Category: ${cat}`, normalized_status: 'CATEGORIZED', current_category: cat, note: null };
}
