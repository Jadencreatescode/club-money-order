const DEFAULT_CONFIG = Object.freeze({
  atmPars: Object.freeze([15000, 24000, 24000, 15000]),
  days: Object.freeze({
    monday: Object.freeze({ hundreds: 70000, twenties: 12000, tens: 6000, fives: 10000, ones: 50000 }),
    thursday: Object.freeze({ hundreds: 60000, twenties: 15000, tens: 6000, fives: 8000, ones: 60000 })
  })
});

export let ATM_PARS = [...DEFAULT_CONFIG.atmPars];
let DAY_PARS = structuredClone(DEFAULT_CONFIG.days);
const DENOMINATIONS = ["hundreds", "twenties", "tens", "fives", "ones"];

function validPar(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function configurePars(config) {
  if (!config || !Array.isArray(config.atmPars) || config.atmPars.length !== 4) throw new Error("Four ATM pars are required");
  if (!config.days?.monday || !config.days?.thursday) throw new Error("Monday and Thursday pars are required");
  const values = [
    ...config.atmPars,
    ...DENOMINATIONS.map(key => config.days.monday[key]),
    ...DENOMINATIONS.map(key => config.days.thursday[key])
  ];
  if (!values.every(validPar)) throw new Error("Every par must be a nonnegative number");
  ATM_PARS = config.atmPars.map(Number);
  DAY_PARS = {
    monday: Object.fromEntries(DENOMINATIONS.map(key => [key, Number(config.days.monday[key])])),
    thursday: Object.fromEntries(DENOMINATIONS.map(key => [key, Number(config.days.thursday[key])]))
  };
}

export function resetPars() {
  ATM_PARS = [...DEFAULT_CONFIG.atmPars];
  DAY_PARS = structuredClone(DEFAULT_CONFIG.days);
}

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
  const orders = Object.fromEntries(DENOMINATIONS.map(key => [key, Math.max(pars[key] - money(safe[key]), 0)]));
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
