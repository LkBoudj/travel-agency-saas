import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

const APPS = [
  {
    name: "backend",
    dir: "backend",
    run: "start:dev",
    url: "http://localhost:3000",
    color: "\x1b[36m",
  },
  // {
  //   name: "dashboard",
  //   dir: "frontend/dashboard",
  //   run: "dev",
  //   url: "http://localhost:5173",
  //   color: "\x1b[32m",
  // },
  {
    name: "admin",
    dir: "frontend/admin",
    run: "dev",
    url: "http://localhost:5174",
    color: "\x1b[33m",
  },
  // {
  //   name: "storefront",
  //   dir: "frontend/storefront",
  //   run: "dev",
  //   // Port 3000 belongs to the API, so the storefront runs on 3001 under `all`.
  //   // Running it standalone (`npm run dev` in its own folder) still uses 3000.
  //   args: ["--", "-p", "3001"],
  //   url: "http://localhost:3001",
  //   color: "\x1b[35m",
  // },
  {
    name: "agency-ui",
    dir: "frontend/agency-dashboard-mantine",
    run: "dev",
    url: "http://localhost:5175",
    color: "\x1b[34m",
  },
  {
    name: "website-ui",
    dir: "frontend/theme-agency",
    run: "dev",
    url: "http://localhost:4321",
    color: "\x1b[34m",
  },
];

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const children = [];
let shuttingDown = false;

function log(line = "") {
  process.stdout.write(`${line}\n`);
}

function writePrefixed(name, color, chunk) {
  const text = chunk.toString();
  for (const lineRaw of text.split(/\r?\n/)) {
    const line = lineRaw.trimEnd();
    if (line.length > 0) {
      log(`${color}${name.padEnd(10)}${RESET} ${line}`);
    }
  }
}

function startApp(app) {
  const cwd = join(ROOT, app.dir);

  if (!existsSync(join(cwd, "node_modules"))) {
    log(
      `${app.color}${app.name.padEnd(10)}${RESET} ${DIM}SKIPPED — dependencies not installed.${RESET}`,
    );
    log(
      `${DIM}${"".padEnd(10)}Fix: cd ${app.dir} && npm install${RESET}`,
    );
    return;
  }

  const child = spawn(npmCommand, ["run", app.run, ...(app.args ?? [])], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    // On Windows, spawn of a .cmd file throws EINVAL; shell resolution is the
    // supported path and taskkill can still tear the process tree down.
    ...(process.platform === "win32" ? { shell: true } : {}),
  });

  children.push(child);

  child.stdout.on("data", (data) => writePrefixed(app.name, app.color, data));
  child.stderr.on("data", (data) => writePrefixed(app.name, app.color, data));

  child.on("error", (error) => {
    log(`${app.color}${app.name.padEnd(10)}${RESET} ${DIM}failed to start: ${error.message}${RESET}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const why = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    log(`${app.color}${app.name.padEnd(10)}${RESET} ${DIM}exited (${why}) — stopping the rest${RESET}`);
    shutdown(code ?? 1);
  });
}

function killTree(child) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      killTree(child);
    }
  }
  setTimeout(() => process.exit(exitCode), 200).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("SIGHUP", () => shutdown(0));

log(`${BOLD}Starting ${APPS.length} dev servers…${RESET}`);
for (const app of APPS) {
  const status = existsSync(join(ROOT, app.dir, "node_modules"))
    ? `${app.color}${app.url}${RESET}`
    : `${DIM}skipped (no node_modules)${RESET}`;
  log(`  ${app.color}${app.name.padEnd(11)}${RESET} ${status}`);
}
log(`${DIM}Press Ctrl+C to stop everything.${RESET}`);
log("");

for (const app of APPS) {
  startApp(app);
}

if (children.length === 0) {
  log("Nothing started — run `npm install` in each app first.");
  process.exit(1);
}