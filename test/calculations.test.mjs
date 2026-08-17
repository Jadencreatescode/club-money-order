import test from "node:test";
import assert from "node:assert/strict";
import { getPars, calculateAtmShortages, calculateMoneyOrder, configurePars, resetPars } from "../src/calculations.mjs";
import { safeEntryFieldLabel } from "../src/presentation.mjs";

test("Monday and Thursday denomination pars match the source sheet", () => {
  assert.deepEqual(getPars("monday"), {
    hundreds: 70000,
    twenties: 12000,
    tens: 6000,
    fives: 10000,
    ones: 50000
  });
  assert.deepEqual(getPars("thursday"), {
    hundreds: 60000,
    twenties: 15000,
    tens: 6000,
    fives: 8000,
    ones: 60000
  });
});

test("ATM shortages use each ATM par and never create a negative order", () => {
  assert.deepEqual(calculateAtmShortages([10000, 20000, 25000, 0]), {
    byAtm: [5000, 4000, 0, 15000],
    total: 24000
  });
});

test("each ATM refill rounds upward to a whole hundred dollars", () => {
  assert.deepEqual(calculateAtmShortages([14950, 23901, 24001, 14901]), {
    byAtm: [100, 100, 0, 100],
    total: 300
  });
});

test("safe denomination orders round upward and hundreds use complete two thousand dollar clips", () => {
  const result = calculateMoneyOrder({
    day: "monday",
    atms: [14950, 24000, 24000, 15000],
    safe: {
      hundreds: 70000, twenties: 11901, tens: 5901, fives: 9901, ones: 49901,
      banksSafe: 0, banksOut: 0, loose: 0, clipped: 0
    }
  });
  assert.deepEqual(result.atmShortages, [100, 0, 0, 0]);
  assert.deepEqual(result.orders, {
    hundreds: 2000, twenties: 100, tens: 100, fives: 100, ones: 100
  });
  assert.equal(result.orderTotal, 2400);
});

test("Monday hundreds order adds the safe shortage to all ATM shortages", () => {
  const result = calculateMoneyOrder({
    day: "monday",
    atms: [0, 14000, 14000, 0],
    safe: {
      hundreds: 20000, twenties: 20000, tens: 4000, fives: 9000, ones: 25700,
      banksSafe: 35500, banksOut: 9000, loose: 2799, clipped: 9800
    }
  });

  assert.equal(result.atmShortageTotal, 50000);
  assert.deepEqual(result.orders, {
    hundreds: 100000, twenties: 0, tens: 2000, fives: 1000, ones: 24300
  });
  assert.equal(result.orderTotal, 127300);
  assert.equal(result.safeTotal, 135799);
  assert.equal(result.safeTotalWithOrder, 263099);
});

test("Thursday uses Thursday pars and orders nothing for ATMs already at par", () => {
  const result = calculateMoneyOrder({
    day: "thursday",
    atms: [15000, 24000, 24000, 15000],
    safe: {
      hundreds: 60000, twenties: 10000, tens: 7000, fives: 0, ones: 50000,
      banksSafe: 0, banksOut: 0, loose: 0, clipped: 0
    }
  });
  assert.deepEqual(result.orders, {
    hundreds: 0, twenties: 5000, tens: 0, fives: 8000, ones: 10000
  });
  assert.equal(result.orderTotal, 23000);
});

test("authorized configuration changes replace all day and ATM pars", () => {
  configurePars({
    atmPars: [100, 200, 300, 400],
    days: {
      monday: { hundreds: 1000, twenties: 2000, tens: 3000, fives: 4000, ones: 5000 },
      thursday: { hundreds: 6000, twenties: 7000, tens: 8000, fives: 9000, ones: 10000 }
    }
  });
  assert.deepEqual(getPars("monday"), { hundreds: 1000, twenties: 2000, tens: 3000, fives: 4000, ones: 5000 });
  assert.deepEqual(calculateAtmShortages([0, 0, 0, 0]), { byAtm: [100, 200, 300, 400], total: 1000 });
  resetPars();
});

test("bank safe and bank out steps do not repeat currently in the safe", () => {
  assert.equal(safeEntryFieldLabel({ key: "banksSafe", label: "Banks in the safe" }), "Banks in the safe");
  assert.equal(safeEntryFieldLabel({ key: "banksOut", label: "Banks out" }), "Banks out");
  assert.equal(safeEntryFieldLabel({ key: "hundreds", label: "Hundreds" }), "Hundreds currently in the safe");
});
