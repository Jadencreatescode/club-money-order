import { chromium } from "playwright";

const target = process.env.OWNER_TEST_URL;
const ownerKey = process.env.OWNER_TEST_KEY;
if (!target || !ownerKey) {
  console.log("SKIP: set OWNER_TEST_URL and OWNER_TEST_KEY to run the Owner Settings browser test");
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await page.goto(target, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: /owner settings/i }).click();
await page.getByLabel("Owner key").fill(ownerKey);
await page.getByLabel("Owner key").press("Enter");
await page.waitForTimeout(1200);
const opened = (await page.locator("body").innerText()).includes("Money order pars");
console.log(opened ? "PASS" : "FAIL: Enter did not unlock Owner Settings");
await browser.close();
if (!opened) process.exit(1);
