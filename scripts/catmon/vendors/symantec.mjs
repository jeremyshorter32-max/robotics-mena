// Broadcom / Symantec WebPulse Site Review (https://sitereview.bluecoat.com/#/lookup-result/<domain>).
// A single-page app: parse the rendered DOM. States: a category (shown as a "clickable-category" link),
// "This URL has not yet been rated", the "pending related submission" banner, or a human-verification interstitial.
import { htmlToText, detectChallenge, decode } from '../html.mjs';

export const id = 'symantec';

export function parse(html) {
  const text = htmlToText(html);
  const ch = /verify (that )?you(['’]| a)re (a )?human/i.test(text) ? 'human-verification interstitial' : null;
  if (ch) return { raw_status: "We need to verify that you're a human...", normalized_status: 'BLOCKED', current_category: null, note: `${ch}; needs manual check` };

  const pending = /a pending (related )?submission (already )?exists/i.test(text);
  if (/has not yet been rated/i.test(text)) {
    return pending
      ? { raw_status: 'This URL has not yet been rated; a pending related submission already exists', normalized_status: 'PENDING', current_category: null, note: 'pending submission exists' }
      : { raw_status: 'This URL has not yet been rated', normalized_status: 'UNCATEGORIZED', current_category: null, note: null };
  }
  const cats = [...String(html).matchAll(/class="[^"]*\bclickable-category\b[^"]*"[^>]*>([\s\S]*?)<\//gi)].map(m => decode(m[1].replace(/<[^>]+>/g, '')).trim()).filter(Boolean);
  const textCat = /(?:is currently categorized as|categorized as|current categorization)\s*:?\s*([^\n]+)/i.exec(text);
  const all = cats.length ? cats : textCat ? textCat[1].split(/\s+and\s+|;/).map(s => s.trim()).filter(Boolean) : [];
  if (all.length) return { raw_status: `Categorized as ${all.join(', ')}`, normalized_status: 'CATEGORIZED', current_category: all.join(', '), note: pending ? 'pending submission exists' : null };
  if (pending) return { raw_status: 'pending related submission exists', normalized_status: 'PENDING', current_category: null, note: 'pending submission exists' };

  // The empty lookup form: the page only fetches a result through its own POST request (after its human check),
  // which the read-only guard never sends, so an automated check cannot see the result.
  if (/please enter a valid url for the review process/i.test(text) || /\bcheck category\b/i.test(text))
    return { raw_status: 'lookup form shown, no result', normalized_status: 'BLOCKED', current_category: null, note: 'result is only shown after the page runs its own lookup request (blocked by the read-only guard); needs manual check' };
  const other = detectChallenge(text);
  if (other) return { raw_status: other, normalized_status: 'BLOCKED', current_category: null, note: `${other}; needs manual check` };
  return { raw_status: text.slice(0, 120), normalized_status: 'ERROR', current_category: null, note: 'no result found in the rendered page (layout may have changed)' };
}
