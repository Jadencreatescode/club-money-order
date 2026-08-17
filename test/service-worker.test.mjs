import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

test("new service worker takes control immediately", () => {
  assert.match(source, /skipWaiting\(\)/);
  assert.match(source, /clients\.claim\(\)/);
});
