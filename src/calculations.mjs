export const ATM_PARS = Object.freeze([15000, 24000, 24000, 15000]);

const DAY_PARS = Object.freeze({
  monday: Object.freeze({
    hundreds: 70000,
    twenties: 12000,
    tens: 6000,
    fives: 10000,
    ones: 50000
  }),
  thursday: Object.freeze({
    hundreds: 60000,
    twenties: 15000,
    tens: 6000,
    fives: 8000,
    ones: 60000
  })
});

export function getPars(day) {
  const pars = DAY_PARS[day];
  if (!pars) throw new Error("Choose Monday or Thursday");
  return { ...pars };
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function calculateAtmShortages(atmAmounts = []) {
  const byAtm = ATM_PARS.map((par, index) => Math.max(par - money(atmAmounts[index]), 0));
  return { byAtm, total: byAtm.reduce((sum, value) => sum + value, 0) };
}

export function calculateMoneyOrder({ day, atms = [], safe = {} }) {
  const pars = getPars(day);
  const atmShortages = calculateAtmShortages(atms);
  const keys = ["hundreds", "twenties", "tens", "fives", "ones"];
  const orders = Object.fromEntries(keys.map((key) => [key, Math.max(pars[key] - money(safe[key]), 0)]));
  orders.hundreds += atmShortages.total;

  const orderTotal = Object.values(orders).reduce((sum, value) => sum + value, 0);
  const safeTotal = Object.values(safe).reduce((sum, value) => sum + money(value), 0);

  return {
    pars,
    atmShortages: atmShortages.byAtm,
    atmShortageTotal: atmShortages.total,
    orders,
    orderTotal,
    safeTotal,
    safeTotalWithOrder: safeTotal + orderTotal
  };
}
