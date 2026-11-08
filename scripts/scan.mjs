// Weekly scanner: finds new MENA robotics companies, deployments and events on the web,
// turns them into database entries, and adds them to data/*.json for review in a pull request.
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/scan.mjs [--days 7] [--summary path.md]
//   node scripts/scan.mjs --from-file findings.json   # skip the web search; test the merge step offline
//
// Step 1 (research): Claude searches the web and reads articles, then writes findings with source links.
// Step 2 (extract):  Claude turns the findings into entries that must match the database schema exactly.
// Step 3 (merge):    this script checks each entry, drops duplicates and anything it can't verify, and writes the files.
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ROOT, SECTORS, ROBOT_TYPES, COMPANY_CATEGORIES, STAGES, EVENT_TYPES, MENA, EXCLUDED_COUNTRIES, ISO_DATE, readData, writeData, norm, slug, normUrl } from './lib/taxonomy.mjs';

const MODEL = 'claude-opus-5-5';
// If the model declines a request for policy reasons, the API retries it on a server-chosen fallback model.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: /** @type {'default'} */ ('default') };

const args = process.argv.slice(2);
const arg = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const DAYS = Number(arg('--days', process.env.SCAN_DAYS || 7));
const SUMMARY_PATH = arg('--summary', null);
const FROM_FILE = arg('--from-file', null);
const today = new Date().toISOString().slice(0, 10);
const since = new Date(Date.now() - DAYS * 864e5).toISOString().slice(0, 10);

const data = Object.fromEntries(['companies', 'deployments', 'events', 'countries'].map(n => [n, readData(n)]));
const keys = o => Object.keys(o);
const glossary = o => Object.entries(o).map(([k, v]) => `${k} (${v[0]})`).join(', ');

// ---------- Schema for extracted entries ----------
const IsoDate = z.string().describe('YYYY-MM-DD');
const Country = z.enum(keys(MENA)).describe('ISO 3166 alpha-2 code');
const Source = {
  source: z.string().describe('Publisher or organisation, e.g. "Dubai Media Office"'),
  source_url: z.string().describe('Exact URL of the article or announcement this entry is based on')
};
const Findings = z.object({
  companies: z.array(z.object({
    name: z.string(), name_ar: z.string().describe('Arabic name or transliteration'),
    country: Country.describe('Main MENA country where the company operates (for international companies: their main MENA market)'), category: z.enum(keys(COMPANY_CATEGORIES)), stage: z.enum(keys(STAGES)),
    hq: z.string().describe('Headquarters country as a 2-letter ISO code, e.g. AE, US, CN'),
    mena_countries: z.array(z.string()).describe('2-letter codes of every MENA country where it is active'),
    mena_link: z.string().describe('For companies headquartered outside MENA: 1-2 sentences of dated facts on why it belongs in a MENA directory (deployment, contract, pilot, local office). Empty string for regional companies'),
    mena_link_ar: z.string().describe('Arabic translation of mena_link, or empty string'),
    summary: z.string().describe('One sentence, under 20 words, on what the company does in robotics, naming its home city and country if international'),
    summary_ar: z.string().describe('Arabic translation of summary'),
    website: z.string().describe('Official website URL, or empty string if unknown'),
    ...Source
  })),
  deployments: z.array(z.object({
    title: z.string().describe('Short description of the robots and the job, e.g. "Goods-to-person AMR fleet"'),
    title_ar: z.string(), operator: z.string().describe('Organisation running the robots, or the company entering the market'), operator_ar: z.string(),
    kind: z.enum(['rollout', 'deployment', 'entrant']).describe('rollout = an operator deploying robots across its assets; deployment = a specific new deployment going live; entrant = a robotics company entering the market'),
    summary: z.string().describe('One factual sentence, under 30 words, with the key numbers'), summary_ar: z.string(),
    type: z.enum(keys(ROBOT_TYPES)), sector: z.enum(keys(SECTORS)), country: Country,
    site: z.string().describe('Facility and city, e.g. "Fulfilment centre, JAFZA, Dubai"'), site_ar: z.string(),
    lat: z.number().describe('Approximate latitude of the site or city'), lon: z.number().describe('Approximate longitude'),
    date: IsoDate.describe('Date the deployment was announced or went live (YYYY-MM-DD)'),
    ...Source
  })),
  events: z.array(z.object({
    name: z.string(), name_ar: z.string(), type: z.enum(keys(EVENT_TYPES)), country: Country,
    city: z.string(), city_ar: z.string(), venue: z.string(), venue_ar: z.string(),
    start: IsoDate, end: IsoDate, dates_confirmed: z.boolean(),
    url: z.string().describe('Official event page URL'), source: z.string(),
    relevance: z.string().describe('One sentence on why it matters for robotics, only if not obvious from the name; else empty'), relevance_ar: z.string()
  }))
});

// ---------- Step 1 + 2: ask Claude ----------
const existingSummary = () => [
  'Companies already listed: ' + data.companies.map(c => c.name).join('; '),
  'Deployments already listed: ' + data.deployments.map(d => `${d.title} (${d.operator}, ${d.country})`).join('; '),
  'Events already listed: ' + data.events.map(e => `${e.name} ${e.start.slice(0, 4)}`).join('; ')
].join('\n');

const RESEARCH_SYSTEM = `You research the Robotics MENA record: a curated, sourced database of robotics, physical AI and automation across the Middle East and North Africa (GCC, Levant, Egypt, Maghreb).

The record has three kinds of entry:
- Deployments: robots actually working (or contracted to work) at a named site in MENA. A deployment needs an operator, a site or city, the kind of robot, and a dated announcement.
- Companies: companies building, integrating or selling robots, autonomy or automation that are based in or have a real operating presence in MENA.
- Events: upcoming robotics, automation or physical-AI expos, conferences, meetups or competitions held in MENA.

Standards the editors hold to (apply them strictly - a short list of solid entries beats a long list of weak ones):
- Every entry must come from a page you actually opened, ideally a primary source (company or government announcement) or a reputable news outlet. Record that page's URL.
- Only include items published or announced between ${since} and ${today}, except events, which can be any upcoming date.
- Skip pure AI/software news with no physical robots or automation, generic "smart city" plans without deployments, opinion pieces, and anything outside MENA.
- Skip anything already in the record (listed below).`;

async function research() {
  const client = new Anthropic();
  /** @type {Anthropic.Beta.BetaToolUnion[]} */
  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 20 },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 25 }
  ];
  /** @type {Anthropic.Beta.BetaMessageParam[]} */
  const messages = [{
    role: 'user',
    content: `${existingSummary()}

Search the web for new robotics deployments, robotics companies and upcoming robotics events in the Middle East and North Africa from ${since} to ${today}. Cover the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Egypt, Morocco, Jordan and the rest of the region, and search in both English and Arabic. Open the most promising articles to confirm details.

Then write your findings as a plain list. For each item give: kind (deployment/company/event), name or title, operator/company, country, city and site, robot type, sector, the date, a one-line description, the publisher, and the exact URL you read. Say "none found" for a kind if there is nothing solid.`
  }];
  let response;
  for (let turn = 0; turn < 6; turn++) {
    response = await client.beta.messages.stream({
      model: MODEL, max_tokens: 64000, system: RESEARCH_SYSTEM,
      output_config: { effort: 'high' }, tools, messages, ...FALLBACK
    }).finalMessage();
    if (response.stop_reason !== 'pause_turn') break;
    // A long search turn paused; send it back unchanged so the server continues where it left off.
    messages.push({ role: 'assistant', content: response.content });
  }
  if (response.stop_reason === 'refusal') throw new Error(`Research step was declined (${response.stop_details?.category ?? 'no category'}).`);
  const notes = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  const usage = response.usage;
  console.log(`Research done (stop: ${response.stop_reason}; ${usage.input_tokens} in / ${usage.output_tokens} out tokens on the last turn).`);
  return notes;
}

async function extract(notes) {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL, max_tokens: 16000, output_config: { effort: 'medium', format: betaZodOutputFormat(Findings) }, ...FALLBACK,
    messages: [{
      role: 'user',
      content: `Convert these research findings into database entries. Use only facts stated in the findings; do not add items, and leave out any item that has no source URL.

Allowed values:
- Robot type: ${glossary(ROBOT_TYPES)}
- Sector: ${glossary(SECTORS)}
- Company category: ${glossary(COMPANY_CATEGORIES)}
- Company stage: ${glossary(STAGES)}
- Event type: ${glossary(EVENT_TYPES)}
- Country: ${Object.entries(MENA).map(([k, v]) => `${k} (${v[0]})`).join(', ')}

Write Arabic fields in Modern Standard Arabic. If an event's end date is unknown, use the start date and set dates_confirmed to false.

<findings>
${notes}
</findings>`
    }]
  });
  if (response.stop_reason === 'refusal') throw new Error('Extraction step was declined.');
  if (!response.parsed_output) throw new Error(`Extraction returned no structured output (stop: ${response.stop_reason}).`);
  return response.parsed_output;
}

// ---------- Step 3: merge ----------
const report = { added: { companies: [], deployments: [], events: [], countries: [] }, skipped: [] };
const skip = (kind, name, why) => report.skipped.push(`${kind} "${name}": ${why}`);
const isUrl = u => /^https?:\/\/[^\s]+$/.test(u || '');
const seenUrls = new Set([...data.deployments.map(d => d.source_url), ...data.companies.map(c => c.source_url)].filter(Boolean).map(normUrl));

function ensureCountry(cc) {
  if (data.countries.some(c => c.code === cc)) return true;
  if (!MENA[cc]) return false;
  data.countries.push({ code: cc, name: MENA[cc][0], name_ar: MENA[cc][1], target_year: null, headline_target: '', in_compare_table: false });
  report.added.countries.push(MENA[cc][0]);
  return true;
}
const nextId = (rows, prefix) => prefix + String(Math.max(0, ...rows.map(r => parseInt(String(r.id).replace(/\D/g, ''), 10) || 0)) + 1).padStart(2, '0');

function merge(found) {
  for (const c of found.companies) {
    const n = norm(c.name);
    if (!n) continue;
    if (data.companies.some(x => norm(x.name) === n)) { skip('Company', c.name, 'already listed'); continue; }
    if (!isUrl(c.source_url)) { skip('Company', c.name, 'no source link'); continue; }
    if (!ensureCountry(c.country)) { skip('Company', c.name, `country ${c.country} not covered`); continue; }
    let id = slug(c.name) || 'company'; while (data.companies.some(x => x.id === id)) id += '-2';
    const hq = /^[A-Z]{2}$/.test(c.hq || '') ? c.hq : c.country;
    if (EXCLUDED_COUNTRIES.has(hq)) { skip('Company', c.name, 'headquartered in an excluded country'); continue; }
    const intl = !(hq in MENA);
    if (intl && !c.mena_link) { skip('Company', c.name, 'international but no link to MENA'); continue; }
    const mc = [...new Set([c.country, ...(c.mena_countries || []).filter(x => x in MENA)])];
    const rec = { id, name: c.name, name_ar: c.name_ar, country: c.country, hq, mena_countries: mc, category: c.category, stage: c.stage, summary: c.summary, summary_ar: c.summary_ar, website: isUrl(c.website) ? c.website : '', logo: '', source: c.source, source_url: c.source_url, added: today };
    if (intl) {
      Object.assign(rec, { mena_link: { en: c.mena_link, ar: c.mena_link_ar || c.mena_link }, mena_source: c.source, mena_source_url: c.source_url, mena_date: ISO_DATE.test(c.date || '') ? c.date : today });
      if (!fs.existsSync(path.join(ROOT, 'media', 'flags', hq.toLowerCase() + '.svg'))) { skip('Company', c.name, `no flag file for ${hq} (add media/flags/${hq.toLowerCase()}.svg, then re-run)`); continue; }
    }
    data.companies.push(rec);
    seenUrls.add(normUrl(c.source_url));
    report.added.companies.push(c);
  }
  let first = true;
  for (const d of found.deployments) {
    const dup = data.deployments.find(x => (d.source_url && normUrl(x.source_url) === normUrl(d.source_url)) || (norm(x.operator) === norm(d.operator) && norm(x.title) === norm(d.title)));
    if (dup) { skip('Deployment', d.title, `already listed as ${dup.id}`); continue; }
    if (!isUrl(d.source_url)) { skip('Deployment', d.title, 'no source link'); continue; }
    if (!ISO_DATE.test(d.date) || d.date > today) { skip('Deployment', d.title, `bad date ${d.date}`); continue; }
    if (!(d.lat > 5 && d.lat < 45 && d.lon > -20 && d.lon < 65)) { skip('Deployment', d.title, 'location outside the map area'); continue; }
    if (!ensureCountry(d.country)) { skip('Deployment', d.title, `country ${d.country} not covered`); continue; }
    // New entries get the "Added this week" marker; last week's lose it.
    if (first) { data.deployments.forEach(x => { x.is_new = false; }); first = false; }
    const id = nextId(data.deployments, 'd');
    data.deployments.push({ id, title: d.title, title_ar: d.title_ar, operator: d.operator, operator_ar: d.operator_ar, logo: '', kind: d.kind, summary: d.summary, summary_ar: d.summary_ar, type: d.type, sector: d.sector, country: d.country, site: d.site, site_ar: d.site_ar, lat: Math.round(d.lat * 100) / 100, lon: Math.round(d.lon * 100) / 100, date: d.date, is_new: true, source: d.source, source_url: d.source_url, added: today });
    seenUrls.add(normUrl(d.source_url));
    report.added.deployments.push({ id, ...d });
  }
  for (const e of found.events) {
    const dup = data.events.find(x => norm(x.name) === norm(e.name) && x.start.slice(0, 4) === e.start.slice(0, 4));
    if (dup) { skip('Event', e.name, `already listed as ${dup.id}`); continue; }
    if (!ISO_DATE.test(e.start) || e.start < today) { skip('Event', e.name, `not upcoming (${e.start})`); continue; }
    if (!isUrl(e.url)) { skip('Event', e.name, 'no event link'); continue; }
    if (!ensureCountry(e.country)) { skip('Event', e.name, `country ${e.country} not covered`); continue; }
    const id = nextId(data.events.filter(x => /^e\d+$/.test(x.id)), 'e');
    const end = ISO_DATE.test(e.end) && e.end >= e.start ? e.end : e.start;
    data.events.push({ id, name: e.name, name_ar: e.name_ar, type: e.type, country: e.country, city: e.city, city_ar: e.city_ar, venue: e.venue, venue_ar: e.venue_ar, start: e.start, end, dates_confirmed: e.dates_confirmed, url: e.url, logo: '', relevance: e.relevance, relevance_ar: e.relevance_ar, source: e.source, added: today });
    report.added.events.push({ id, ...e });
  }
}

function summary() {
  const A = report.added, total = A.companies.length + A.deployments.length + A.events.length;
  const link = (label, url) => url ? `[${label}](${url})` : label;
  const lines = [`## Weekly scan: ${total} new entr${total === 1 ? 'y' : 'ies'} (${since} to ${today})`, '',
    'Review each entry and its source below. **Merge** to publish them to the site, or edit/delete lines in the `data/` files on this branch first. Close the pull request to discard them all.', ''];
  if (A.deployments.length) lines.push('### Deployments', ...A.deployments.map(d => `- **${d.title}**: ${d.operator}, ${d.site} (${d.country}), ${d.date}. ${link(d.source, d.source_url)}`), '');
  if (A.companies.length) lines.push('### Companies', ...A.companies.map(c => `- **${c.name}** (${c.country}, ${c.category}): ${c.summary} ${link(c.source, c.source_url)}`), '');
  if (A.events.length) lines.push('### Events', ...A.events.map(e => `- **${e.name}**: ${e.city} (${e.country}), ${e.start}${e.end !== e.start ? ' to ' + e.end : ''}${e.dates_confirmed ? '' : ' (dates to be confirmed)'}. ${link('Event page', e.url)}`), '');
  if (A.countries.length) lines.push('### New countries added', ...A.countries.map(c => `- ${c}`), '');
  if (report.skipped.length) lines.push('<details><summary>Skipped (' + report.skipped.length + ')</summary>', '', ...report.skipped.map(s => `- ${s}`), '', '</details>', '');
  return { text: lines.join('\n'), total };
}

// ---------- Run ----------
const found = FROM_FILE ? JSON.parse(fs.readFileSync(FROM_FILE, 'utf8')) : await extract(await research());
merge(Findings.parse(found));
const { text, total } = summary();
if (total) for (const n of ['companies', 'deployments', 'events', 'countries']) writeData(n, data[n]);
if (SUMMARY_PATH) fs.writeFileSync(SUMMARY_PATH, text);
console.log(text);
console.log(total ? `\nWrote ${total} new entries to data/.` : '\nNo new entries this week.');
