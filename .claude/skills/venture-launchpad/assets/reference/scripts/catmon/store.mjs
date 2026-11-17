// Persistence: history.jsonl (append-only CheckResult records) and state.json (latest state per vendor+domain).
import fs from 'node:fs';
import path from 'node:path';
import { DIR } from './config.mjs';

export const key = (vendor, domain) => `${vendor}|${domain}`;

export function fileStore(dir = DIR) {
  const stateFile = path.join(dir, 'state.json'), historyFile = path.join(dir, 'history.jsonl');
  return {
    readState() { try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return { version: 1, entries: {} }; } },
    writeState(state) { fs.mkdirSync(dir, { recursive: true }); const tmp = stateFile + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n'); fs.renameSync(tmp, stateFile); },
    appendHistory(records) { if (!records.length) return; fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(historyFile, records.map(r => JSON.stringify(r)).join('\n') + '\n'); },
    readHistory() { try { return fs.readFileSync(historyFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } },
  };
}

export function memoryStore(state = { version: 1, entries: {} }) {
  const history = [];
  return { history, state, readState: () => structuredClone(state), writeState: s => { state.entries = structuredClone(s.entries); }, appendHistory: r => history.push(...r), readHistory: () => history };
}
