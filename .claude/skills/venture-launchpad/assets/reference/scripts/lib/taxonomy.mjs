// Shared rules for the database: allowed categories (read from the site's own code, so they always match
// what the pages can display), MENA country names, and helpers used by the scanner and the validator.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const logic = fs.readFileSync(path.join(ROOT, 'src/logic.js'), 'utf8');

function dict(name) {
  const m = new RegExp(`\\n  ${name} = (\\{[^\\n]*\\});`).exec(logic);
  if (!m) throw new Error(`Could not find ${name} in src/logic.js`);
  return Function(`"use strict"; return (${m[1]});`)();
}

// key -> [English label, Arabic label]
export const SECTORS = dict('SECTORS');
export const ROBOT_TYPES = dict('TYPES');
export const COMPANY_CATEGORIES = dict('CATS');
export const STAGES = dict('STAGES');
export const EVENT_TYPES = dict('ETYPES');

// Countries the record may cover (MENA). New ones are added to data/countries.json automatically when first used.
// Countries the site does not cover. Companies headquartered or listed there are rejected by the validator and the scanner.
export const EXCLUDED_COUNTRIES = new Set(['IL']);
export const MENA = {
  AE: ['UAE', 'الإمارات'], SA: ['Saudi Arabia', 'السعودية'], QA: ['Qatar', 'قطر'], KW: ['Kuwait', 'الكويت'],
  BH: ['Bahrain', 'البحرين'], OM: ['Oman', 'عُمان'], EG: ['Egypt', 'مصر'], MA: ['Morocco', 'المغرب'],
  TN: ['Tunisia', 'تونس'], DZ: ['Algeria', 'الجزائر'], LY: ['Libya', 'ليبيا'], JO: ['Jordan', 'الأردن'],
  LB: ['Lebanon', 'لبنان'], IQ: ['Iraq', 'العراق'], PS: ['Palestine', 'فلسطين'], SY: ['Syria', 'سوريا'],
  YE: ['Yemen', 'اليمن'], TR: ['Türkiye', 'تركيا'], IR: ['Iran', 'إيران']
};

export const DATA_FILES = ['companies', 'deployments', 'events', 'countries', 'brief'];
export const readData = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', `${name}.json`), 'utf8'));
export const writeData = (name, rows) => fs.writeFileSync(path.join(ROOT, 'data', `${name}.json`), JSON.stringify(rows, null, 2) + '\n');

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/\b(the|ltd|llc|inc|co|company|group|fze|pjsc|plc)\b/g, ' ').replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
export const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
export const normUrl = u => String(u || '').trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
