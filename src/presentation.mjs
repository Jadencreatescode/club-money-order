const BANK_STEPS = new Set(["banksSafe", "banksOut"]);

export function safeEntryFieldLabel(step) {
  return BANK_STEPS.has(step.key) ? step.label : `${step.label} currently in the safe`;
}
