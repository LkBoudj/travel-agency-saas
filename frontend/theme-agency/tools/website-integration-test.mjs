/**
 * `node tools/website-integration-test.mjs [-- <playwright args>]`
 *
 * Full-stack website integration (T8): the backend must already be running
 * (it owns the database), this script owns the storefront dev server so the
 * tenant slug and the website API origin are always consistent, and it then
 * runs `playwright.integration.config.ts`.
 *
 * Required environment (no defaults for credentials — the suite skips with a
 * clear message instead of inventing an account):
 *   WEBSITE_TEST_EMAIL        agency owner email (AGENCY_ADMIN on the agency)
 *   WEBSITE_TEST_PASSWORD     that account's password
 *   WEBSITE_TEST_AGENCY_CODE  that owner's agency code; its public slug is the
 *                             lowercased code (the backend writes the slug once)
 *
 * Optional:
 *   WEBSITE_API_URL           backend origin (default http://localhost:3000)
 *   STOREFRONT_PORT           storefront port (default 4321)
 *   PREVIEW_TOKEN_SECRET      must match the backend's (both fall back to
 *                             `theme-test-secret`, so the default works)
 *   WEBSITE_TEST_OTHER_EMAIL / _PASSWORD / _AGENCY_CODE  a second agency, used
 *                             only to assert the cross-tenant 403
 *
 * The specs mutate the configured agency (they publish it), so point them at a
 * throwaway agency — see `docs/website-api-contract.md`.
 */
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = (name) => join(root, "node_modules", ".bin", name);

const apiUrl = (process.env.WEBSITE_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const port = Number(process.env.STOREFRONT_PORT ?? process.env.THEME_TEST_PORT ?? 4321);
const secret = process.env.PREVIEW_TOKEN_SECRET ?? "theme-test-secret";
const baseUrl = `http://localhost:${port}`;
const agencyCode = process.env.WEBSITE_TEST_AGENCY_CODE;

const rawArgs = process.argv.slice(2);
const separator = rawArgs.indexOf("--");
const passthrough = separator === -1 ? rawArgs : rawArgs.slice(separator + 1);

function runSync(command, args) {
  return spawnSync(command, args, { cwd: root, stdio: "ignore" }).status;
}

function runAsync(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`killed by ${signal}`));
      else resolve(code ?? 1);
    });
  });
}

async function reachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitUntilReady(url, label, attempts = 60, delayMs = 500) {
  for (let index = 0; index < attempts; index += 1) {
    if (await reachable(url)) return;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`${label} (${url}) did not become ready`);
}

if (!process.env.WEBSITE_TEST_EMAIL || !process.env.WEBSITE_TEST_PASSWORD || !agencyCode) {
  process.stdout.write(
    "[website:integration] WEBSITE_TEST_EMAIL / WEBSITE_TEST_PASSWORD / WEBSITE_TEST_AGENCY_CODE are required\n",
  );
  process.exit(2);
}

try {
  await waitUntilReady(`${apiUrl}/v1`, "backend");
} catch (error) {
  process.stderr.write(`[website:integration] ${error.message}\n`);
  process.stderr.write(`[website:integration] start it with: cd backend && npm run start:dev\n`);
  process.exit(2);
}

runSync(bin("astro"), ["dev", "stop"]);

try {
  const started = spawnSync(bin("astro"), ["dev", "--port", String(port)], {
    cwd: root,
    stdio: "ignore",
    env: {
      ...process.env,
      // The storefront reads the real backend, and dev host→tenant resolution
      // points at the configured agency's slug.
      WEBSITE_API_URL: apiUrl,
      LOCALHOST_TENANT_SLUG: agencyCode.toLowerCase(),
      PREVIEW_TOKEN_SECRET: secret,
    },
  });
  if (started.status !== 0) {
    throw new Error(`failed to start the storefront dev server (exit ${started.status})`);
  }
  await waitUntilReady(baseUrl, "storefront");

  process.stdout.write(
    `[website:integration] storefront ${baseUrl} → backend ${apiUrl}, tenant ${agencyCode.toLowerCase()}\n`,
  );

  process.exitCode = await runAsync(
    bin("playwright"),
    [
      "test",
      "--config",
      join(root, "playwright.integration.config.ts"),
      ...passthrough,
    ],
    { WEBSITE_API_URL: apiUrl, STOREFRONT_BASE_URL: baseUrl, PREVIEW_TOKEN_SECRET: secret },
  );
} catch (error) {
  process.stderr.write(`[website:integration] ${error.message}\n`);
  process.exitCode = 1;
} finally {
  runSync(bin("astro"), ["dev", "stop"]);
}
