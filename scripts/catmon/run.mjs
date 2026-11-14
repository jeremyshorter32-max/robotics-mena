#!/usr/bin/env node
// Web-filter categorization monitor (read-only). See README, "Categorization monitor".
//
//   node scripts/catmon/run.mjs                     Scheduled run: check the vendors that are due, save, notify on changes
//   node scripts/catmon/run.mjs --check-once        Check every enabled vendor now and print; no saving, no notifications
//   node scripts/catmon/run.mjs --dry-run           Same as --check-once
//   node scripts/catmon/run.mjs --status            Print the latest saved state and manual-check links (no network)
//   Options: --force (ignore cadence), --vendor fortinet[,mcafee], --domain example.com[,…], --summary <file> (Markdown)
import fs from 'node:fs';
import { loadConfig, fillUrl } from './config.mjs';
import { fileStore, key } from './store.mjs';
import { makeNotifier } from './notify.mjs';
import { runAgent } from './agent.mjs';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const list = v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined);

const cfg = loadConfig();
const store = fileStore();
const vendors = list(opt('--vendor')), domains = list(opt('--domain'));

function statusTable(entries) {
  const rows = [['Vendor', 'Domain', 'Status', 'Category', 'Target', 'Reached', 'Last checked', 'Note']];
  for (const v of cfg.vendors) for (const d of domains || cfg.domains) {
    const e = entries[key(v.id, d)] || {};
    rows.push([v.name + (v.enabled ? '' : ' (disabled)'), d, e.normalized_status || '–', e.current_category || '–', v.targetCategory,
      e.target_reached ? 'yes' : 'no', e.checked_at ? e.checked_at.slice(0, 16).replace('T', ' ') + 'Z' : '–', e.note || '']);
  }
  return rows;
}
const md = rows => rows.map((r, i) => '| ' + r.join(' | ') + ' |' + (i === 0 ? '\n|' + r.map(() => '---').join('|') + '|' : '')).join('\n');

if (flag('--status')) {
  const st = store.readState();
  console.log(md(statusTable(st.entries || {})));
  console.log('\nManual checks:');
  for (const v of cfg.vendors) for (const d of domains || cfg.domains) console.log(`  ${v.name}: ${fillUrl(v.manualCheckUrl, d)}`);
  process.exit(0);
}

const dryRun = flag('--check-once') || flag('--dry-run');
const notifier = makeNotifier(cfg.notifications);
const out = await runAgent(cfg, { store, notifier, dryRun, force: flag('--force'), vendors, domains, log: s => console.log(s) });

for (const s of out.skipped) console.log(`${s.vendor.padEnd(10)} ${s.domain}  skipped · ${s.reason}`);
for (const n of out.notifications) console.log(`notified (${n.kind}) ${n.vendor}/${n.domain}: ${n.sent.map(s => `${s.channel} ${s.ok ? 'ok' : 'failed'} (${s.detail})`).join('; ')}`);
if (dryRun) console.log('\nDry run: nothing saved, no notifications sent.');

const summary = opt('--summary');
if (summary) {
  const st = store.readState();
  fs.appendFileSync(summary, `## Categorization monitor\n\n${md(statusTable(st.entries || {}))}\n\n` +
    `Checked this run: ${out.results.length} · skipped (not due): ${out.skipped.length} · notifications: ${out.notifications.length}\n`);
}
