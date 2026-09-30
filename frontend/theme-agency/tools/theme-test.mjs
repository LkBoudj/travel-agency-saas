import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `npm run theme:test [id] [-- <playwright args>]`
 *
 * E2E wrapper (T13): owns the dev-server lifecycle because `astro dev` runs as
 * a daemon (the CLI exits immediately), and preview tokens are secret-bound, so
 * the server must be started fresh with a known secret. Stops the previous
 * daemon first, starts a fresh one on `THEME_TEST_PORT` (default 4321) with
 * `PREVIEW_TOKEN_SECRET` (fallback `theme-test-secret`), runs Playwright, then
 * stops the daemon again so nothing leaks.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.THEME_TEST_PORT ?? 4321);
const secret = process.env.PREVIEW_TOKEN_SECRET ?? "theme-test-secret";
const baseUrl = `http://localhost:${port}`;

const bin = (name) => join(root, "node_modules", ".bin", name);

const rawArgs = process.argv.slice(2);
const separator = rawArgs.indexOf("--");
const positional = separator === -1 ? rawArgs : rawArgs.slice(0, separator);
const passthrough = separator === -1 ? [] : rawArgs.slice(separator + 1);
const onlyId = positional.find((arg) => /^[a-z][a-z0-9-]*$/.test(arg)) ?? null;

function runSync(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  return result.status;
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

async function reachable() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitUntilReady() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await reachable()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`dev server on ${baseUrl} did not become ready in 60s`);
}

async function waitUntilGone() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (!(await reachable())) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  console.warn(`[theme:test] ${baseUrl} still responding; continuing anyway`);
}

try {
  process.stdout.write(`[theme:test] resetting the project dev server (port ${port})\n`);
  runSync(bin("astro"), ["dev", "stop"]);
  await waitUntilGone();

  process.stdout.write(
    `[theme:test] starting fresh server with PREVIEW_TOKEN_SECRET=${secret}\n`,
  );
  const daemon = spawnSync(bin("astro"), ["dev", "--port", String(port)], {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, PREVIEW_TOKEN_SECRET: secret },
  });
  if (daemon.status !== 0) {
    throw new Error(`failed to start the dev server (exit ${daemon.status})`);
  }
  await waitUntilReady();

  const playwrightArgs = [
    "test",
    "--config",
    join(root, "playwright.config.ts"),
    ...(onlyId ? ["--grep", onlyId] : []),
    ...passthrough,
  ];
  process.stdout.write(`[theme:test] running: playwright ${playwrightArgs.join(" ")}\n`);
  const code = await runAsync(bin("playwright"), playwrightArgs, {
    PREVIEW_TOKEN_SECRET: secret,
  });
  process.exitCode = code;
} finally {
  process.stdout.write("[theme:test] stopping the dev server\n");
  runSync(bin("astro"), ["dev", "stop"]);
}