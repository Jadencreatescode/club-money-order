import json
import os
from decimal import Decimal, InvalidOperation
from pathlib import Path

DENOMINATIONS = ("hundreds", "twenties", "tens", "fives", "ones")


def amount(name, fallback):
    raw = os.environ.get(name, "").replace("$", "").replace(",", "").strip()
    if not raw:
        return fallback
    try:
        value = Decimal(raw)
    except InvalidOperation as exc:
        raise SystemExit(f"{name} must be a number") from exc
    if value < 0:
        raise SystemExit(f"{name} cannot be negative")
    return int(value) if value == value.to_integral_value() else float(value)


path = Path("pars.json")
current = json.loads(path.read_text())
config = {
    "atmPars": [amount(f"ATM_{index}", current["atmPars"][index - 1]) for index in range(1, 5)],
    "days": {
        day: {
            denomination: amount(
                f"{day}_{denomination}".upper(),
                current["days"][day][denomination],
            )
            for denomination in DENOMINATIONS
        }
        for day in ("monday", "thursday")
    },
}
path.write_text(json.dumps(config, indent=2) + "\n")
print("Validated and saved the supplied pars. Blank fields kept their current values.")
