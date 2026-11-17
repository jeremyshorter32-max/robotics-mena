import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../../scripts/validate-data.mjs';

const schema = { collections: { items: { required: ['id', 'name'], enums: { category: ['a', 'b'] }, dates: ['added'], urls: ['source_url'], refs: { country: 'countries.code' },
  files: ['logo'], translated: ['name'], source: ['source_url'], banned: [{ fields: ['country'], values: ['XX'], why: 'not covered' }] } }, banned_terms: ['Old Name'] };
const site = { languages: ['en', 'ar'] };
const good = { id: 'x', name: 'X', name_ar: 'س', category: 'a', added: '2026-01-31', source_url: 'https://example.com/a', country: 'AE', logo: '/media/logos/x.png' };
const run = (items, rawText = '') => validate({ schema, site, data: { items, countries: [{ code: 'AE' }, { code: 'XX' }] }, fileExists: p => p === 'media/logos/x.png', rawText });

test('a complete record passes', () => assert.deepEqual(run([good]), []));
test('each rule reports its own problem', () => {
  const e = run([{ ...good, name: '', category: 'z', added: '31/01/2026', source_url: 'ftp://x', country: 'QA', logo: '/media/logos/missing.png' }, { ...good, name_ar: '', country: 'XX' }, good]).join('\n');
  for (const part of ['missing "name"', 'category "z"', 'not a YYYY-MM-DD date', 'not a valid URL', '"QA" is not in countries.json', 'does not exist', 'missing "name_ar"', 'not allowed (not covered)', 'duplicate id "x"'])
    assert.ok(e.includes(part), `expected: ${part}\n${e}`);
});
test('records need a source, and banned terms are caught anywhere in the data', () => {
  assert.ok(run([{ ...good, source_url: '' }]).some(e => e.includes('needs a source')));
  assert.ok(run([good], '{"note":"the old name"}').some(e => e.includes('banned term')));
});
