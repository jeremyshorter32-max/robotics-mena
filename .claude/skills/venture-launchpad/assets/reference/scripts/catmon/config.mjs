// Loads and validates monitoring/categorization/config.json. Adding a vendor = a new entry here + a parser module in
// scripts/catmon/vendors/ registered in vendors/index.mjs. Disabled entries (login-gated vendors) may have module: null.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DIR = path.join(ROOT, 'monitoring', 'categorization');

const Notification = z.discriminatedUnion('type', [
  z.object({ type: z.literal('console') }),
  z.object({ type: z.literal('email'), to: z.string().email(), endpointEnv: z.string().optional() }),
  z.object({ type: z.literal('github-issue'), tokenEnv: z.string(), repoEnv: z.string(), label: z.string().optional() }),
  z.object({ type: z.literal('webhook'), urlEnv: z.string() }),
]);

const Vendor = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  enabled: z.boolean(),
  module: z.string().nullable(),
  strategy: z.enum(['http', 'browser']),
  lookupUrl: z.string().url(),
  manualCheckUrl: z.string().url(),
  targetCategory: z.string().min(1),
  cadenceHours: z.number().positive(),
  afterTargetCadenceHours: z.number().positive().nullable(),
  requiresLogin: z.boolean().default(false),
  notes: z.string().optional(),
}).refine(v => !v.enabled || v.module, { message: 'an enabled vendor needs a parser module' })
  .refine(v => !(v.enabled && v.requiresLogin), { message: 'login-gated vendors are not supported in v1 (keep them disabled)' });

export const ConfigSchema = z.object({
  domains: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)).min(1),
  userAgent: z.string().min(10),
  requestTimeoutMs: z.number().int().positive().default(30000),
  maxRetries: z.number().int().min(0).max(5).default(2),
  blockedAlertAfter: z.number().int().positive().default(3),
  notifications: z.array(Notification).default([{ type: 'console' }]),
  vendors: z.array(Vendor).min(1),
}).refine(c => new Set(c.vendors.map(v => v.id)).size === c.vendors.length, { message: 'vendor ids must be unique' });

export function loadConfig(file = path.join(DIR, 'config.json')) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = ConfigSchema.safeParse(raw);
  if (!r.success) throw new Error('Invalid categorization config: ' + r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data;
}

export const fillUrl = (tpl, domain) => tpl.replaceAll('{domain}', encodeURIComponent(domain));
