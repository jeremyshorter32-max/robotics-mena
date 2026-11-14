// Pure decision logic: is a vendor due for a check, has its status changed, and should we notify?
import { normCategory } from './html.mjs';

const INFORMATIVE = new Set(['UNCATEGORIZED', 'PENDING', 'CATEGORIZED']);
export const isInformative = s => INFORMATIVE.has(s);
export const signature = r => `${r.normalized_status}|${r.current_category || ''}`;
const H = 3600e3, SLACK = 30 * 60e3; // a run up to 30 min early still counts as due (cron start times drift)

export function targetReached(normalized_status, current_category, target) {
  if (normalized_status !== 'CATEGORIZED' || !current_category) return false;
  const t = normCategory(target);
  return current_category.split(/,\s*/).some(c => normCategory(c) === t);
}

// prev = stored state entry (or undefined). Returns { due, reason }.
export function isDue(vendor, prev, now) {
  if (!prev || !prev.checked_at) return { due: true, reason: 'never checked' };
  const hours = prev.target_reached ? vendor.afterTargetCadenceHours : vendor.cadenceHours;
  if (hours == null) return { due: false, reason: 'target confirmed; checks stopped' };
  const next = Date.parse(prev.checked_at) + hours * H - SLACK;
  return now.getTime() >= next ? { due: true, reason: `every ${hours}h` } : { due: false, reason: `next check after ${new Date(next + SLACK).toISOString()}` };
}

// Returns { next, notification } where next is the new state entry and notification is null or
// { kind: 'target-reached' | 'status-changed' | 'needs-manual-check', subject, text }.
// Only informative results (UNCATEGORIZED/PENDING/CATEGORIZED) move the notified signature, so a vendor that flips
// between "blocked" and "not rated" does not cause repeated alerts. Persistent blocking alerts once.
export function decide(prev = {}, result, { vendorName, blockedAlertAfter = 3, manualCheckUrl }) {
  const next = { ...prev, checked_at: result.checked_at, raw_status: result.raw_status, normalized_status: result.normalized_status,
    current_category: result.current_category, target_category: result.target_category, note: result.note };
  let notification = null;
  if (isInformative(result.normalized_status)) {
    const sig = signature(result);
    next.target_reached = result.target_reached;
    next.consecutive_blocked = 0; next.manual_check_alerted = false;
    next.last_informative = { status: result.normalized_status, category: result.current_category, at: result.checked_at };
    if (sig !== prev.notified_signature) {
      const from = prev.last_informative ? `${prev.last_informative.status}${prev.last_informative.category ? ` (${prev.last_informative.category})` : ''}` : 'no previous result';
      const to = `${result.normalized_status}${result.current_category ? ` (${result.current_category})` : ''}`;
      const kind = result.target_reached ? 'target-reached' : 'status-changed';
      notification = {
        kind,
        subject: kind === 'target-reached'
          ? `${vendorName}: ${result.domain} is now categorised as ${result.current_category}`
          : `${vendorName}: ${result.domain} status changed to ${to}`,
        text: [
          `${vendorName} lookup for ${result.domain}`,
          `Changed from: ${from}`, `Now: ${to}`, `Target category: ${result.target_category}${result.target_reached ? ' (reached)' : ''}`,
          `Raw status: ${result.raw_status}`, result.note ? `Note: ${result.note}` : null,
          `Checked: ${result.checked_at}`, manualCheckUrl ? `Check it yourself: ${manualCheckUrl}` : null,
        ].filter(Boolean).join('\n'),
      };
      next.notified_signature = sig; // committed by the agent only if a notification channel succeeds
    }
  } else {
    next.target_reached = prev.target_reached || false;
    next.consecutive_blocked = (prev.consecutive_blocked || 0) + 1;
    if (next.consecutive_blocked >= blockedAlertAfter && !prev.manual_check_alerted) {
      notification = {
        kind: 'needs-manual-check',
        subject: `${vendorName}: automatic check blocked for ${result.domain}, please check manually`,
        text: [
          `The ${vendorName} lookup for ${result.domain} could not be read ${next.consecutive_blocked} times in a row.`,
          `Last result: ${result.normalized_status}${result.note ? ` (${result.note})` : ''}`,
          `The monitor never solves captchas or human checks. Check it yourself: ${manualCheckUrl}`,
          `Last known status: ${prev.last_informative ? prev.last_informative.status + (prev.last_informative.category ? ` (${prev.last_informative.category})` : '') : 'unknown'}`,
          `You will not be alerted again about this until a check succeeds.`,
        ].join('\n'),
      };
      next.manual_check_alerted = true;
    }
  }
  return { next, notification };
}
