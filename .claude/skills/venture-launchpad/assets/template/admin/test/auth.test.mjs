import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVerify } from 'node:crypto';
import { verifyAccessJwt, roleFor, identify } from '../src/auth.mjs';
import { appJwt } from '../src/github.mjs';
import { makeIssuer, TEAM, AUD, ENV, pkcs1Pem, req } from './helpers.mjs';

const iss = await makeIssuer();
const opts = { teamDomain: TEAM, aud: AUD, fetchImpl: iss.fetchImpl };

test('a valid Access token is accepted and yields the email', async () => {
  assert.equal((await verifyAccessJwt(await iss.token(), opts)).email, 'owner@example.com');
});
test('tampered, wrong-audience, wrong-issuer, expired and unsigned tokens are refused', async () => {
  const t = await iss.token(); const [h, p, s] = t.split('.');
  const forged = JSON.parse(Buffer.from(p, 'base64url')); forged.email = 'attacker@example.com';
  await assert.rejects(verifyAccessJwt(`${h}.${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${s}`, opts), /bad signature/);
  await assert.rejects(verifyAccessJwt(await iss.token({ aud: ['other'] }), opts), /audience/);
  await assert.rejects(verifyAccessJwt(await iss.token({ iss: 'https://evil.cloudflareaccess.com' }), opts), /issuer/);
  await assert.rejects(verifyAccessJwt(await iss.token({ exp: Math.floor(Date.now() / 1000) - 3600 }), opts), /expired/);
  await assert.rejects(verifyAccessJwt(`${h}.${p}.`, opts));
  await assert.rejects(verifyAccessJwt(await iss.token({}, { alg: 'none' }), opts), /algorithm/);
  await assert.rejects(verifyAccessJwt(undefined, opts), /missing/);
});
test('roles come from the ROLES secret, case-insensitively; unknown emails have no role', () => {
  assert.equal(roleFor('Owner@Example.com', ENV.ROLES), 'owner');
  assert.equal(roleFor('nobody@example.com', ENV.ROLES), null);
  assert.equal(roleFor('owner@example.com', '{"owner@example.com":"superuser"}'), null);
  assert.equal(roleFor('owner@example.com', 'not json'), null);
});
test('the local development shortcut only works on localhost and never when Access is configured', async () => {
  const dev = { ROLES: ENV.ROLES, DEV_AUTH_EMAIL: 'owner@example.com' };
  assert.equal((await identify(req('/api/me', { host: 'http://localhost:8787' }), dev)).role, 'owner');
  await assert.rejects(identify(req('/api/me'), dev), /not configured/);
  await assert.rejects(identify(req('/api/me', { host: 'http://localhost:8787' }), { ...ENV, DEV_AUTH_EMAIL: 'owner@example.com' }, { fetchImpl: iss.fetchImpl }), /Not signed in/);
});
test('GitHub App keys in PKCS#1 form (as GitHub issues them) sign a verifiable app JWT', async () => {
  const { pem, publicKey } = pkcs1Pem();
  const jwt = await appJwt(12345, pem);
  const [h, p, s] = jwt.split('.');
  assert.ok(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s, 'base64url')));
  const claims = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(claims.iss, '12345'); assert.ok(claims.exp - claims.iat <= 600);
});
