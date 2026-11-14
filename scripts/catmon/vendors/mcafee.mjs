// McAfee / Trellix TrustedSource site lookup (https://sitelookup.mcafee.com/).
// The result is a table with columns URL / Status / Categorization / Reputation (Trust), e.g.
// "roboticsmena.com | Uncategorized URL | - Uncategorized | Unverified".
import { htmlToText, tableRows, detectChallenge } from '../html.mjs';

export const id = 'mcafee';

export function parse(html, { domain }) {
  const rows = tableRows(html);
  const header = rows.find(r => r.some(c => /^status$/i.test(c)) && r.some(c => /^categori[sz]ation$/i.test(c)));
  if (header) {
    const iStatus = header.findIndex(c => /^status$/i.test(c)), iCat = header.findIndex(c => /^categori[sz]ation$/i.test(c));
    const iTrust = header.findIndex(c => /reputation|trust|risk/i.test(c));
    const row = rows.find(r => r !== header && r.some(c => c.toLowerCase().includes(domain.toLowerCase())));
    if (row) {
      const status = row[iStatus] || '', catCell = row[iCat] || '', trust = iTrust >= 0 ? row[iTrust] || '' : '';
      const cats = catCell.split(/\n|(?:^|\s)-\s+/).map(s => s.replace(/^-\s*/, '').trim()).filter(Boolean);
      const raw = [status, catCell.replace(/\n/g, ' '), trust].filter(Boolean).join(' · ');
      if (/uncategori[sz]ed/i.test(status) || cats.every(c => /uncategori[sz]ed/i.test(c)))
        return { raw_status: raw, normalized_status: 'UNCATEGORIZED', current_category: null, note: trust ? `reputation: ${trust}` : null };
      return { raw_status: raw, normalized_status: 'CATEGORIZED', current_category: cats.join(', '), note: trust ? `reputation: ${trust}` : null };
    }
  }
  const text = htmlToText(html);
  const ch = detectChallenge(text);
  if (ch) return { raw_status: ch, normalized_status: 'BLOCKED', current_category: null, note: `${ch}; needs manual check` };
  return { raw_status: text.slice(0, 120), normalized_status: 'ERROR', current_category: null, note: 'no results table for this domain (the lookup form may require a manual check)' };
}
