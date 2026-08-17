import { ATM_PARS, calculateMoneyOrder, configurePars, getPars } from "./calculations.mjs";

const app = document.querySelector("#app");
const STORAGE_KEY = "clubMoneyOrderDraftV1";
const OWNER_KEY_STORAGE = "clubMoneyOrderOwnerKeyV1";
const API_URL = "https://money-order-api.trust3d.tech";
let ownerMode = "login";
let ownerMessage = "";
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
const sheetDollars = value => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2
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
  const mondayPars = getPars("monday");
  const thursdayPars = getPars("thursday");
  app.innerHTML = `${header("Choose the money order you are preparing.")}
  <section class="card">${progress(1)}
    <h2>Which money order is this?</h2>
    <p class="help">The selected day sets the correct safe pars.</p>
    <div class="day-grid">
      <button class="day-button" data-day="monday"><strong>Monday</strong><small>Hundreds par ${dollars(mondayPars.hundreds)}</small></button>
      <button class="day-button" data-day="thursday"><strong>Thursday</strong><small>Hundreds par ${dollars(thursdayPars.hundreds)}</small></button>
    </div>
    ${state.day ? `<div class="actions"><button class="text-button" id="resume">Resume saved ${titleCase(state.day)} order</button></div>` : ""}
    <div class="owner-entry"><button class="text-button" id="ownerSettings">Owner settings</button></div>
  </section>`;
  app.querySelectorAll("[data-day]").forEach(button => button.addEventListener("click", () => {
    const chosen = button.dataset.day;
    if (state.day && state.day !== chosen) state = { ...emptyState(), day: chosen, screen: "atms" };
    else state = { ...state, day: chosen, screen: "atms" };
    saveState(); render();
  }));
  app.querySelector("#resume")?.addEventListener("click", () => { state.screen = "atms"; render(); });
  app.querySelector("#ownerSettings").addEventListener("click", openOwnerSettings);
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
        ${rows.map(([label, key, order]) => `<div class="sheet-row"><strong>${label}</strong><span>${sheetDollars(state.safe[key])}</span><b class="${order === null ? "na" : ""}">${order === null ? "" : sheetDollars(order)}</b></div>`).join("")}
        <div class="sheet-row sheet-order-total"><strong>ORDER TOTAL</strong><span></span><b>${sheetDollars(result.orderTotal)}</b></div>
      </div>
      <div class="sheet-summary">
        <div><span>ATMs CURRENT</span><strong>${sheetDollars(currentAtmTotal)}</strong></div>
        <div><span>ATMs NEEDED</span><strong>${sheetDollars(result.atmShortageTotal)}</strong></div>
        <div><span>SAFE TOTAL</span><strong>${sheetDollars(result.safeTotal)}</strong></div>
        <div class="with-order"><span>SAFE TOTAL WITH ORDER</span><strong>${sheetDollars(result.safeTotalWithOrder)}</strong></div>
      </div>
      <div class="atm-mini">${result.atmShortages.map((shortage, index) => `<span>ATM ${index + 1}: <b>${sheetDollars(shortage)}</b></span>`).join("")}</div>
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

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store", ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || "The settings service is unavailable");
    error.status = response.status;
    throw error;
  }
  return body;
}

async function openOwnerSettings() {
  state.screen = "owner";
  ownerMessage = "";
  const token = localStorage.getItem(OWNER_KEY_STORAGE);
  if (!token) {
    ownerMode = "login";
    render();
    return;
  }
  ownerMode = "loading";
  render();
  try {
    await apiRequest("/owner/verify", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    configurePars(await apiRequest("/pars"));
    ownerMode = "settings";
  } catch (error) {
    if (error.status === 401) localStorage.removeItem(OWNER_KEY_STORAGE);
    ownerMode = "login";
    ownerMessage = error.message;
  }
  render();
}

function ownerParField(id, label, value) {
  return amountField({ id, label, value });
}

function renderOwner() {
  if (ownerMode === "loading") {
    app.innerHTML = `${header("Opening your private settings.")}<section class="card owner-card"><h2>Checking owner access</h2><p class="help">One moment while the app verifies this device.</p></section>`;
    return;
  }
  if (ownerMode === "login") {
    app.innerHTML = `${header("Private owner access.")}
    <section class="card owner-card">
      <p class="eyebrow owner-eyebrow">OWNER ONLY</p>
      <h2>Unlock par settings</h2>
      <p class="help">Enter your owner key once. This device will remember it.</p>
      <label class="field" for="ownerKey"><span class="field-label"><span>Owner key</span></span><input class="owner-key-input" id="ownerKey" type="password" autocomplete="current-password" spellcheck="false" placeholder="Paste owner key"></label>
      <p class="error">${ownerMessage}</p>
      <div class="actions"><button class="secondary" id="ownerBack">Back</button><button class="primary" id="ownerUnlock">Unlock settings</button></div>
    </section>`;
    app.querySelector("#ownerBack").addEventListener("click", () => { state.screen = "day"; ownerMessage = ""; render(); });
    app.querySelector("#ownerUnlock").addEventListener("click", async () => {
      const token = app.querySelector("#ownerKey").value.trim();
      if (!token) { ownerMessage = "Enter your owner key."; renderOwner(); return; }
      ownerMode = "loading"; renderOwner();
      try {
        await apiRequest("/owner/verify", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        localStorage.setItem(OWNER_KEY_STORAGE, token);
        configurePars(await apiRequest("/pars"));
        ownerMode = "settings"; ownerMessage = "";
      } catch (error) {
        ownerMode = "login"; ownerMessage = error.message;
      }
      renderOwner();
    });
    return;
  }

  const monday = getPars("monday");
  const thursday = getPars("thursday");
  app.innerHTML = `${header("Adjust the pars used by every coworker.")}
  <section class="card owner-card">
    <div class="owner-heading"><div><p class="eyebrow owner-eyebrow">OWNER SETTINGS</p><h2>Money order pars</h2></div><button class="text-button" id="ownerLock">Lock</button></div>
    <p class="help">Changes take effect for everyone the next time the app opens or refreshes.</p>
    <h3>ATM pars</h3><div class="field-grid owner-grid">${ATM_PARS.map((value, index) => ownerParField(`owner-atm-${index}`, `ATM ${index + 1}`, value)).join("")}</div>
    <h3>Monday pars</h3><div class="field-grid owner-grid">${Object.entries(monday).map(([key, value]) => ownerParField(`owner-monday-${key}`, titleCase(key), value)).join("")}</div>
    <h3>Thursday pars</h3><div class="field-grid owner-grid">${Object.entries(thursday).map(([key, value]) => ownerParField(`owner-thursday-${key}`, titleCase(key), value)).join("")}</div>
    <p class="error owner-status ${ownerMessage.startsWith("Saved") ? "success" : ""}">${ownerMessage}</p>
    <div class="actions owner-save-actions"><button class="secondary" id="ownerCancel">Back</button><button class="primary" id="ownerSave">Save pars for everyone</button></div>
  </section>`;
  app.querySelector("#ownerCancel").addEventListener("click", () => { state.screen = "day"; ownerMessage = ""; render(); });
  app.querySelector("#ownerLock").addEventListener("click", () => { localStorage.removeItem(OWNER_KEY_STORAGE); ownerMode = "login"; ownerMessage = "Owner access removed from this device."; renderOwner(); });
  app.querySelector("#ownerSave").addEventListener("click", async () => {
    const value = id => app.querySelector(`#${id}`).value;
    const entries = [
      ...ATM_PARS.map((_, index) => value(`owner-atm-${index}`)),
      ...Object.keys(monday).map(key => value(`owner-monday-${key}`)),
      ...Object.keys(thursday).map(key => value(`owner-thursday-${key}`))
    ];
    if (!entries.every(validAmount)) { ownerMessage = "Enter every par, including zero amounts."; renderOwner(); return; }
    const config = {
      atmPars: ATM_PARS.map((_, index) => Number(value(`owner-atm-${index}`))),
      days: {
        monday: Object.fromEntries(Object.keys(monday).map(key => [key, Number(value(`owner-monday-${key}`))])),
        thursday: Object.fromEntries(Object.keys(thursday).map(key => [key, Number(value(`owner-thursday-${key}`))]))
      }
    };
    const token = localStorage.getItem(OWNER_KEY_STORAGE);
    try {
      const response = await apiRequest("/pars", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(config) });
      configurePars(response.pars);
      ownerMessage = "Saved. The new pars are live for everyone.";
      renderOwner();
    } catch (error) {
      if (error.status === 401) { localStorage.removeItem(OWNER_KEY_STORAGE); ownerMode = "login"; }
      ownerMessage = error.message;
      renderOwner();
    }
  });
}

function render() {
  if (!state.day && state.screen !== "owner") state.screen = "day";
  if (state.screen === "atms") renderAtms();
  else if (state.screen === "safe") renderSafe();
  else if (state.screen === "results") renderResults();
  else if (state.screen === "owner") renderOwner();
  else renderDay();
}

async function startApp() {
  try {
    configurePars(await apiRequest("/pars"));
  } catch (apiError) {
    try {
      const response = await fetch(`./pars.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Managed pars unavailable");
      configurePars(await response.json());
    } catch (fallbackError) {
      console.warn("Using built in pars", apiError, fallbackError);
    }
  }
  render();
}

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./service-worker.js");
startApp();
