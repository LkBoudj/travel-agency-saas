import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("test-results/storefront-screenshots");
await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "375", width: 375, height: 812 },
];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Full page screenshot
  const fullPagePath = path.join(OUT_DIR, `home--${vp.name}--full.png`);
  await page.screenshot({ path: fullPagePath, fullPage: true });

  // Viewport above-the-fold screenshot
  const foldPath = path.join(OUT_DIR, `home--${vp.name}--fold.png`);
  await page.screenshot({ path: foldPath, fullPage: false });

  console.log(`Captured ${vp.name}px screenshots`);
  await context.close();
}

await browser.close();
console.log(`Screenshots saved to ${OUT_DIR}`);
