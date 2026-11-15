import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../scripts/lib/taxonomy.mjs';
import { briefWeek, archiveRecord } from '../../scripts/archive-brief.mjs';

test('brief week matches the home page rule (ISO week, Monday to Sunday)', () => {
  assert.deepEqual(briefWeek('2026-11-06'), { week: '2026-w45', covers: ['2026-11-02', '2026-11-08'], label: 'Week 45 · 2 – 8 Nov 2026' });
  assert.deepEqual(briefWeek('2026-11-12'), { week: '2026-w46', covers: ['2026-11-09', '2026-11-15'], label: 'Week 46 · 9 – 15 Nov 2026' });
  assert.equal(briefWeek('2026-12-03').label, 'Week 49 · 30 Nov – 6 Dec 2026');
  assert.equal(briefWeek('2027-01-01').week, '2026-w53');
});

test('archive record files the brief under its newest item and keeps the first publish date', () => {
  const items = [{ id: 'a', date: '2026-11-08' }, { id: 'b', date: '2026-11-12' }];
  const r = archiveRecord(items, null, { published: '2026-11-15' });
  assert.equal(r.week, '2026-w46'); assert.equal(r.published, '2026-11-15'); assert.equal(r.items.length, 2);
  assert.throws(() => archiveRecord([], '2026-11-15'));
});

test('every archived brief is filed under the right week', () => {
  const dir = path.join(ROOT, 'data', 'briefs');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.equal(a.week, f.slice(0, -5), f);
    assert.equal(briefWeek(a.items.map(b => b.date).sort().pop()).week, a.week, f);
  }
});
