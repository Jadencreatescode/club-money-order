import { ATM_PARS, calculateMoneyOrder, getPars } from "./calculations.mjs";

const app = document.querySelector("#app");
const STORAGE_KEY = "clubMoneyOrderDraftV1";
const safeSteps = [
  { key: "hundreds", label: "Hundreds", par: true },
  { key: "twenties", label: "Twenties", par: true },
  { key: "tens", label: "Tens", par: true },
  { key: "fives", label: "Fives", par: true },
  { key: "ones", label: "Ones", par: true },
  { key: "banksSafe", label: "Banks in the safe" },
  { key: "banksOut", label: "Banks out" },
  { key: "loose", label: "Loose money" },
  { key: "clipped", label: "Clipped money" }
];

const emptyState = () => ({
  screen: "day",
  day: "",
  atms: ["", "", "", ""],
  safe: Object.fromEntries(safeSteps.map(step => [step.key, ""])),
  safeStep: 0
});

let state = loadState();
let message = "";

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && saved.atms && saved.safe ? { ...emptyState(), ...saved } : emptyState();
  } catch {
    return emptyState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const dollars = value => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2
}).format(Number(value) || 0);

const titleCase = text => text.charAt(0).toUpperCase() + text.slice(1);
const validAmount = value => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;

function header(subtitle) {
  return `<header class="topbar">
    <p class="eyebrow">Safe Count</p>
    <h1>Club Money Order</h1>
    <p class="subtitle">${subtitle}</p>
  </header>`;
}

function progress(active) {
  return `<div class="progress" aria-label="Step ${active} of 4">
    ${[1,2,3,4].map(step => `<span class="${step <= active ? "on" : ""}"></span>`).join("")}
  </div>`;
}

function amountField({ id, label, value, par, autofocus = false }) {
  return `<label class="field" for="${id}">
    <span class="field-label"><span>${label}</span>${par !== undefined ? `<span class="par">Par ${dollars(par)}</span>` : ""}</span>
    <span class="input-wrap"><input class="money-input" id="${id}" name="${id}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0" value="${value}" ${autofocus ? "autofocus" : ""}></span>
  </label>`;
}

function renderDay() {
  app.innerHTML = `${header("Choose the money order you are preparing.")}
  <section class="card">${progress(1)}
    <h2>Which money order is this?</h2>
    <p class="help">The selected day sets the correct safe pars.</p>
    <div class="day-grid">
      <button class="day-button" data-day="monday"><strong>Monday</strong><small>Hundreds par ${dollars(70000)}</small></button>
      <button class="day-button" data-day="thursday"><strong>Thursday</strong><small>Hundreds par ${dollars(60000)}</small></button>
    </div>
    ${state.day ? `<div class="actions"><button class="text-button" id="resume">Resume saved ${titleCase(state.day)} order</button></div>` : ""}
  </section>`;
  app.querySelectorAll("[data-day]").forEach(button => button.addEventListener("click", () => {
    const chosen = button.dataset.day;
    if (state.day && state.day !== chosen) state = { ...emptyState(), day: chosen, screen: "atms" };
    else state = { ...state, day: chosen, screen: "atms" };
    saveState(); render();
  }));
  app.querySelector("#resume")?.addEventListener("click", () => { state.screen = "atms"; render(); });
}

function renderAtms() {
  app.innerHTML = `${header(`${titleCase(state.day)} order. Enter the current cash in all four ATMs.`)}
  <section class="card">${progress(2)}
    <h2>ATM amounts</h2>
    <p class="help">Enter the amount currently inside each ATM. Enter 0 if an ATM is empty.</p>
    <div class="field-grid">
      ${ATM_PARS.map((par, index) => amountField({ id: `atm${index}`, label: `ATM ${index + 1}`, value: state.atms[index], par })).join("")}
    </div>
    <p class="error" id="error">${message}</p>
    <div class="actions"><button class="secondary" id="back">Back</button><button class="primary" id="continue">Continue to safe count</button></div>
  </section>`;
  ATM_PARS.forEach((_, index) => app.querySelector(`#atm${index}`).addEventListener("input", event => {
    state.atms[index] = event.target.value; saveState(); message = "";
  }));
  app.querySelector("#back").addEventListener("click", () => { state.screen = "day"; render(); });
  app.querySelector("#continue").addEventListener("click", () => {
    if (!state.atms.every(validAmount)) { message = "Enter an amount for all four ATMs, including zero amounts."; render(); return; }
    message = ""; state.screen = "safe"; state.safeStep = 0; saveState(); render();
  });
}

function renderSafe() {
  const step = safeSteps[state.safeStep];
  const pars = getPars(state.day);
  const par = step.par ? pars[step.key] : undefined;
  app.innerHTML = `${header(`${titleCase(state.day)} order. Count each safe category in order.`)}
  <section class="card">${progress(3)}
    <p class="step-count">Safe entry ${state.safeStep + 1} of ${safeSteps.length}</p>
    <h2>${step.label}</h2>
    <p class="help">Enter the total dollar value. Enter 0 if there is none.</p>
    <div class="entry-focus">${amountField({ id: "safeAmount", label: `${step.label} currently in the safe`, value: state.safe[step.key], par, autofocus: true })}</div>
    ${par !== undefined ? `<div class="par-callout"><span>${titleCase(state.day)} par</span><strong>${dollars(par)}</strong></div>` : ""}
    <p class="error" id="error">${message}</p>
    <div class="actions"><button class="secondary" id="back">Back</button><button class="primary" id="next">${state.safeStep === safeSteps.length - 1 ? "Calculate order" : "Save and continue"}</button></div>
  </section>`;
  const input = app.querySelector("#safeAmount");
  input.addEventListener("input", event => { state.safe[step.key] = event.target.value; saveState(); message = ""; });
  input.addEventListener("keydown", event => { if (event.key === "Enter") app.querySelector("#next").click(); });
  app.querySelector("#back").addEventListener("click", () => {
    message = "";
    if (state.safeStep === 0) state.screen = "atms"; else state.safeStep -= 1;
    saveState(); render();
  });
  app.querySelector("#next").addEventListener("click", () => {
    if (!validAmount(state.safe[step.key])) { message = `Enter the ${step.label.toLowerCase()} amount, including zero.`; render(); return; }
    message = "";
    if (state.safeStep === safeSteps.length - 1) {
      state.screen = "results";
      state.completedAt = new Date().toISOString();
    } else state.safeStep += 1;
    saveState(); render();
  });
}

function summaryText(result) {
  const labels = { hundreds: "Hundreds", twenties: "Twenties", tens: "Tens", fives: "Fives", ones: "Ones" };
  return `${titleCase(state.day)} Money Order\n${Object.entries(result.orders).map(([key, value]) => `${labels[key]}: ${dollars(value)}`).join("\n")}\nTotal order: ${dollars(result.orderTotal)}\nSafe total: ${dollars(result.safeTotal)}\nSafe total with order: ${dollars(result.safeTotalWithOrder)}`;
}

function renderResults() {
  const result = calculateMoneyOrder(state);
  const completed = new Date(state.completedAt || Date.now());
  const currentAtmTotal = state.atms.reduce((sum, value) => sum + Number(value || 0), 0);
  const rows = [
    ["100s", "hundreds", result.orders.hundreds],
    ["20s", "twenties", result.orders.twenties],
    ["10s", "tens", result.orders.tens],
    ["5s", "fives", result.orders.fives],
    ["1s", "ones", result.orders.ones],
    ["Clipped", "clipped", null],
    ["Loose", "loose", null],
    ["Banks out", "banksOut", null],
    ["Banks safe", "banksSafe", null]
  ];
  const dateLine = completed.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  app.innerHTML = `<div class="result-page">
    <section class="count-sheet" aria-label="Safe count sheet results">
      <div class="sheet-date">${dateLine}</div>
      <div class="sheet-title">SAFE COUNT SHEET</div>
      <div class="sheet-day">${titleCase(state.day)} money order</div>
      <div class="sheet-columns"><span>SAFE</span><span>CURRENT</span><span>ORDER</span></div>
      <div class="sheet-table">
        ${rows.map(([label, key, order]) => `<div class="sheet-row"><strong>${label}</strong><span>${dollars(state.safe[key])}</span><b class="${order === null ? "na" : ""}">${order === null ? "" : dollars(order)}</b></div>`).join("")}
        <div class="sheet-row sheet-order-total"><strong>ORDER TOTAL</strong><span></span><b>${dollars(result.orderTotal)}</b></div>
      </div>
      <div class="sheet-summary">
        <div><span>ATMs CURRENT</span><strong>${dollars(currentAtmTotal)}</strong></div>
        <div><span>ATMs NEEDED</span><strong>${dollars(result.atmShortageTotal)}</strong></div>
        <div><span>SAFE TOTAL</span><strong>${dollars(result.safeTotal)}</strong></div>
        <div class="with-order"><span>SAFE TOTAL WITH ORDER</span><strong>${dollars(result.safeTotalWithOrder)}</strong></div>
      </div>
      <div class="atm-mini">${result.atmShortages.map((shortage, index) => `<span>ATM ${index + 1}: <b>${dollars(shortage)}</b></span>`).join("")}</div>
    </section>
    <p class="shot-hint">This sheet is sized for one phone screenshot.</p>
    <div class="footer-actions result-actions"><button class="primary" id="copy">Copy order summary</button><button class="secondary" id="edit">Edit amounts</button><button class="secondary" id="print">Print</button><button class="text-button" id="new">Start a new order</button></div>
    <div class="saved" id="saved"></div>
  </div>`;
  app.querySelector("#copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(summaryText(result)); app.querySelector("#saved").textContent = "Order summary copied."; }
    catch { app.querySelector("#saved").textContent = "Copy was blocked. Use Print instead."; }
  });
  app.querySelector("#edit").addEventListener("click", () => { state.screen = "safe"; state.safeStep = 0; render(); });
  app.querySelector("#print").addEventListener("click", () => window.print());
  app.querySelector("#new").addEventListener("click", () => {
    if (!confirm("Clear this order and start over?")) return;
    state = emptyState(); localStorage.removeItem(STORAGE_KEY); render();
  });
}

function render() {
  if (!state.day) state.screen = "day";
  if (state.screen === "atms") renderAtms();
  else if (state.screen === "safe") renderSafe();
  else if (state.screen === "results") renderResults();
  else renderDay();
}

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./service-worker.js");
render();
