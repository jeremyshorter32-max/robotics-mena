// The development backlog (BACKLOG.md on main): read it as sections and items, tick items off, add new ones.
// Only BACKLOG.md can be written from here; each change is one commit attributed to the person in the portal.

const FILE = 'BACKLOG.md';

// Small stable hash so an item keeps its id across reads (based on its first line).
export function itemId(line) {
  let h = 5381; for (const c of line.replace(/^- \[[ xX]\]\s*/, '').trim()) h = ((h << 5) + h + c.codePointAt(0)) >>> 0;
  return h.toString(36);
}

export function parseBacklog(md) {
  const lines = md.split('\n'), sections = []; let sec = null, item = null;
  lines.forEach((line, i) => {
    const h = /^## (.+?)\s*$/.exec(line);
    if (h) { sec = { title: h[1], items: [] }; sections.push(sec); item = null; return; }
    const m = /^- \[([ xX])\] (.*)$/.exec(line);
    if (m && sec) { item = { id: itemId(line), line: i, done: m[1] !== ' ', raw: [m[2]] }; sec.items.push(item); return; }
    if (item && /^\s{2,}\S/.test(line)) { item.raw.push(line.trim()); return; }
    item = null;
  });
  for (const s of sections) for (const it of s.items) {
    const text = it.raw.join(' ').replace(/<!--[\s\S]*?(-->|$)/g, '').replace(/\s+/g, ' ').trim();
    const bold = /\*\*(.+?)\*\*/.exec(text);
    it.title = (bold ? bold[1] : text.slice(0, 90)).replace(/[.:]$/, '');
    it.text = text.replace(/\*\*/g, '').replace(/`/g, '');
    delete it.raw;
  }
  return sections;
}

const b64decode = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
const b64encode = s => { let bin = ''; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };

async function readFile(gh) {
  const j = await gh.get(`/repos/{repo}/contents/${FILE}?ref=main`);
  return { sha: j.sha, md: b64decode(j.content) };
}
async function writeFile(gh, md, sha, message) {
  return gh.put(`/repos/{repo}/contents/${FILE}`, { message, content: b64encode(md), sha, branch: 'main' });
}

export async function getBacklog(gh) {
  const { md } = await readFile(gh);
  const sections = parseBacklog(md).filter(s => s.items.length);
  const open = sections.reduce((n, s) => n + s.items.filter(i => !i.done).length, 0);
  return { sections, open };
}

export async function setDone(gh, { id, done, email }) {
  const { md, sha } = await readFile(gh);
  const lines = md.split('\n'), item = parseBacklog(md).flatMap(s => s.items).find(i => i.id === id);
  if (!item) throw Object.assign(new Error('That item is no longer in the backlog. Reload.'), { status: 409 });
  if (item.done === !!done) return { ok: true, unchanged: true };
  lines[item.line] = lines[item.line].replace(/^- \[[ xX]\]/, done ? '- [x]' : '- [ ]');
  await writeFile(gh, lines.join('\n'), sha, `Backlog: ${done ? 'done' : 'reopened'}: ${item.title.slice(0, 60)} (by ${email} in the admin portal)`);
  return { ok: true };
}

export async function addItem(gh, { section, text, email }) {
  const t = String(text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (t.length < 3) throw Object.assign(new Error('Describe the item in a few words.'), { status: 400 });
  const { md, sha } = await readFile(gh);
  const lines = md.split('\n');
  const start = lines.findIndex(l => l.trim() === `## ${section}`);
  if (start < 0) throw Object.assign(new Error('Unknown backlog section.'), { status: 400 });
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l)); if (end < 0) end = lines.length;
  let at = end; while (at > start + 1 && lines[at - 1].trim() === '') at--; // after the section's last non-empty line
  const today = new Date().toISOString().slice(0, 10);
  lines.splice(at, 0, `- [ ] ${t} (added ${today} by ${email})`);
  await writeFile(gh, lines.join('\n'), sha, `Backlog: add "${t.slice(0, 60)}" (by ${email} in the admin portal)`);
  return { ok: true };
}
