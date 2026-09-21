import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const ENV_FILE = '/tmp/opencode/pw-qa/opencode-qa-live.env';
const env = Object.fromEntries(
  readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => [l.split('=')[0], l.split('=').slice(1).join('=')]),
);
const write = (s) => process.stdout.write(s + '\n');
const BASE = env.QA_BASE ?? process.env.QA_BASE ?? 'http://localhost:5173';
const logs = [];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXE, headless: true });
const page = await browser.newPage();
const pendingUrl = `${BASE}/agencies/${env.QA_AGENCY_CODE}/bookings/${env.QA_PENDING}` + '/travelers';

const snap = async (label) =>
  logs.push(`${label} URL=${page.url().slice(0, 90)} TITLE=${(await page.title().catch(() => ''))}`);

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await snap('LOGIN');

  await page.getByLabel(/e-?mail/i).first().fill(env.QA_LOGIN);
  await page.getByLabel(/pass/i).first().fill(env.QA_PASSWORD);
  await page.getByRole('button', { name: /sign-in|sign in|login|log in|se connecter/i }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await snap('AFTER_LOGIN');

  await page.goto(pendingUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1500);
  const bodyText = await page.locator('body').innerText().catch(() => '');
  logs.push('PENDING_CODE_VISIBLE=' + bodyText.includes(env.QA_PENDING));
  logs.push('TRAVELER_CODE_VISIBLE=' + bodyText.includes(env.QA_PENDING_TRAVELER));
  logs.push('TRAVELERS_SECTION=' + /travelers?|voyageurs?|passagers?/i.test(bodyText));
  logs.push('SEAT_PROGRESS=' + /1\s*(of|de|sur)\s*2|1\s*\/\s*2|travelers?\s+1\s+/i.test(bodyText));

  const confirmBtn = page.getByRole('button', { name: /confirm/i }).first();
  const n = await confirmBtn.count();
  logs.push('CONFIRM_BUTTONS=' + n);
  if (n > 0) {
    logs.push('CONFIRM_DISABLED=' + (await confirmBtn.isDisabled().catch(() => 'n/a')));
    logs.push('CONFIRM_TITLE=' + ((await confirmBtn.getAttribute('title').catch(() => '')) || '(none)'));
  }

  await page.screenshot({ path: '/tmp/opencode/pw-qa/pending-booking.png', fullPage: true });
  logs.push('SCREENSHOT_OK=1');
} catch (e) {
  logs.push('BROWSER_ERR=' + (e instanceof Error ? e.message : String(e)));
} finally {
  await page.screenshot({ path: '/tmp/opencode/pw-qa/final.png', fullPage: true }).catch(() => {});
  await browser.close();
}

for (const l of logs) write('PW ' + l);
