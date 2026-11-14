import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed, parseRobots, robotsVerdict } from '../../scripts/catmon/robots.mjs';

const UA = 'RoboticsMENA-CategoryMonitor/1.0 (+https://roboticsmena.com)';
// Fortinet's live robots.txt as of 14 Nov 2026.
const FORTI = 'User-agent: *\nCrawl-delay: 2\n# prevent crawling the dynamic pages (e.g. search, browse params etc)\nDisallow: /*?*\nDisallow: /threat-research/data\n';

test("Fortinet's robots.txt disallows the query lookup and sets a crawl delay", () => {
  const v = isAllowed(parseRobots(FORTI), UA, '/webfilter?q=roboticsmena.com&version=9');
  assert.equal(v.allowed, false); assert.equal(v.rule, 'Disallow: /*?*'); assert.equal(v.crawlDelay, 2);
  assert.equal(isAllowed(parseRobots(FORTI), UA, '/webfilter').allowed, true);
});
test('longest match wins and Allow wins ties; agent-specific groups beat *', () => {
  const g = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: roboticsmena-categorymonitor\nDisallow: /private\nAllow: /private/ok\n');
  assert.equal(isAllowed(g, UA, '/x').allowed, true);
  assert.equal(isAllowed(g, UA, '/private/a').allowed, false);
  assert.equal(isAllowed(g, UA, '/private/ok/1').allowed, true);
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow: /a$\n'), UA, '/a').allowed, false);
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow: /a$\n'), UA, '/ab').allowed, true);
});
test('unreachable robots.txt: 404 allows, 403 and 5xx/network do not', () => {
  assert.equal(robotsVerdict(404, '', UA, '/x').allowed, true);
  assert.equal(robotsVerdict(403, '', UA, '/x').allowed, false);
  assert.equal(robotsVerdict(503, '', UA, '/x').allowed, false);
  assert.equal(robotsVerdict(0, '', UA, '/x').allowed, false);
});
