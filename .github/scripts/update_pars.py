import json
import os
from decimal import Decimal, InvalidOperation
from pathlib import Path

DENOMINATIONS = ("hundreds", "twenties", "tens", "fives", "ones")


def amount(name):
    raw = os.environ[name].replace("$", "").replace(",", "").strip()
    try:
        value = Decimal(raw)
    except InvalidOperation as exc:
        raise SystemExit(f"{name} must be a number") from exc
    if value < 0:
        raise SystemExit(f"{name} cannot be negative")
    return int(value) if value == value.to_integral_value() else float(value)


def update_workflow_defaults(values):
    path = Path(".github/workflows/update-pars.yml")
    lines = path.read_text().splitlines()
    for input_name, value in values.items():
        marker = f"      {input_name}:"
        try:
            start = lines.index(marker)
        except ValueError as exc:
            raise SystemExit(f"Workflow input {input_name} is missing") from exc
        for index in range(start + 1, min(start + 8, len(lines))):
            if lines[index].startswith("        default:"):
                lines[index] = f'        default: "{value}"'
                break
        else:
            raise SystemExit(f"Workflow default for {input_name} is missing")
    path.write_text("\n".join(lines) + "\n")


values = {f"atm_{index}": amount(f"ATM_{index}") for index in range(1, 5)}
for day in ("monday", "thursday"):
    for denomination in DENOMINATIONS:
        key = f"{day}_{denomination}"
        values[key] = amount(key.upper())

config = {
    "atmPars": [values[f"atm_{index}"] for index in range(1, 5)],
    "days": {
        day: {denomination: values[f"{day}_{denomination}"] for denomination in DENOMINATIONS}
        for day in ("monday", "thursday")
    },
}
Path("pars.json").write_text(json.dumps(config, indent=2) + "\n")
update_workflow_defaults(values)
print("Validated and saved all money order pars and future form defaults.")
