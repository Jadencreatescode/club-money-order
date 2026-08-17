import test from "node:test";
import assert from "node:assert/strict";
import { getPars, calculateAtmShortages, calculateMoneyOrder } from "../src/calculations.mjs";

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
