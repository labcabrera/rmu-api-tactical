# Attack regression fixtures

`cases.json` holds what the Python calculator in `rmu-api-attack` (the parity baseline in spec 003, decision D2) produces for 30 attacks. The TypeScript combat plugins and resolver in tactical are tested against it.

## Regenerate

The script imports the Python domain directly: `Attack.set_roll`, `Attack.append_all_modifiers`, `AttackCalculator.calculate_attack` and `UpdateCriticalRollUseCase` for the critical roll adjustment. It doesn't call HTTP or Mongo, and it doesn't change `rmu-api-attack`: it uses that project's existing `.venv`, and `--no-sync` stops uv from touching it.

```bash
cd rmu-api-tactical/tests/fixtures/attack-regression
uv run --project ../../../../rmu-api-attack --no-sync python generate.py
```

If the checkout is somewhere else, set `RMU_API_ATTACK_DIR=/path/to/rmu-api-attack`. The cases are defined in `CASES` in `generate.py`. The input fields a case leaves out take their values from `DEFAULT_INPUT`, and the fixture always writes the full input.

## Fake attack table

The real attack table is replaced by a fixed rule. The TS test mocks its table port with the same rule, or with the recorded `expected.tableEntry`.

```
tableRoll = min(175, max(rawTotal, 1))   # the Python REST adapter applies the same clamp
atUsed    = at ?? 1                      # Python can pass at = null (see location-chest-at-missing)
damage    = max(0, tableRoll - 60 - atUsed) // 4
score     = tableRoll - atUsed
severity  = null if score < 80, otherwise one band of 10 per letter from 80:
            80 A, 90 B, 100 C, 110 D, 120 E, 130 F, 140 G, 150 H, 160 I, >=170 J
type      = null without severity, otherwise "P" if atUsed is even, "S" if it is odd
text      = "fake-<tableRoll>-<atUsed>"
```

The Python calculator passes the **raw** total to the port (`expected.tableCall.roll`), and the adapter does the clamping, so `expected.tableRoll` is the clamped value. The fake critical table returns `{text: "fake-critical", damage: 0}`. Only the adjusted roll is recorded.

## Shape

`cases.json` is one array. Each element has these fields:

| Field | Content |
|---|---|
| `id`, `description` | Stable id and a short description. |
| `input` | Neutral input, close to tactical. Every field is always present (see below). |
| `pythonAttackType` | The type fed to Python. `thrown` becomes `ranged`, because Python has no thrown type. |
| `expected` | The Python output (see below). |
| `pythonKeys` | The modifier keys of `expected.rollModifiers`, in Python order. |
| `notes` | Python behaviour worth knowing for that case (quirks and probable bugs). |
| `deviations` | `[{decision, key, note}]`: the intended differences (spec D2/D3) the TS test must allow for that case. |

### `input`

`attackType` (`melee`/`ranged`/`thrown`), `attackTable`, `attackSize` (−1/0/1), `fumble` (fumble range), `bo`, `bd`, `shield`, `parry`, `actionPoints`, `rangePenalty`, `pacePenalty`, `injuryPenalty`, `fatiguePenalty`, `sourceStatuses[]`, `targetStatuses[]` (`prone`, `melee`, `ambidextrous` / `prone`, `stunned`, `surprised`), `cover` (`none`, `soft_partial|half|full`, `hard_partial|half|full`), `restrictedQuarters` (`none`, `close`, `cramped`, `tight`, `confined`), `positionalSource` (`none`, `to_flank`, `to_rear`), `positionalTarget` (`none`, `flank`, `rear`), `dodge` (ignored by Python), `calledShot` (`none`, `head`, `body`, `arms`, `legs`), `calledShotPenalty` (0 means the default −25), `offHand`, `twoHandedWeapon`, `higherGround`, `disabledDB`, `disabledShield`, `disabledParry`, `sizeDifference`, `skills[] {skillId, bonus}`, `attackNumber`, `attackTargets`, `lethality`, `customBonus`, `armor {at, headAt, bodyAt, armsAt, legsAt}`, `roll`, `location` (null or a hit location), and `criticalRoll` (the d100 used for `criticalRollExample`).

### `expected`

| Field | Meaning |
|---|---|
| `prepareRollModifiers`, `prepareRollTotal` | The prepare/parry phase, before the roll: the same list without `roll`. |
| `rollModifiers` | `[{key, value}]` after the roll, in Python order, with zeros dropped. `roll` comes first. |
| `rollTotal` | The sum. It is not clamped: it can be < 1 or > 175. |
| `status` | `pending_critical_roll`, `pending_fumble_roll` or `pending_apply`. |
| `fumble` | `roll <= fumble` (and `fumble > 0`). A fumble skips the table and the criticals. |
| `effectiveLocation` | `location`, otherwise `calledShot`. It is `"none"` when there is neither. |
| `effectiveAt` | `armor.at` if set, otherwise the AT for that location. It can be `null`. |
| `tableCall` | `{attackTable, size, roll, at}` as passed to the port (raw roll), or `null` on a fumble. |
| `tableRoll`, `tableEntry` | The clamped roll and the fake's raw output `{text, damage, criticalType, criticalSeverity}`. |
| `hitSizeMultiplier`, `criticalSizeModifier` | `1 + attackSize·0.5` and `attackSize`. |
| `damageBase`, `damage` | The table damage, then `ceil(base · multiplier)`. |
| `criticalType`, `criticalSeverityBase`, `criticalSeverity` | The severity shifted by `attackSize` along Z,A..J, clamped. |
| `criticalModifiers`, `criticalTotal`, `absoluteHit` | `absolute-hit = ceil((rollTotal − 175) / 5)` when `rollTotal > 175`. |
| `criticalSeverityModifiers`, `criticalSeverityTotal` | `size-difference` when it isn't 0. Python never uses it. |
| `criticals` | `[{key, type, severity, adjustment}]`. F..J are split: F→E,A; G→E,B; H→E,C; I→E,C,A; J→J,C,B. The key is `<type>_<severity>_<n>`, lowercase. `adjustment` is `criticalTotal`. |
| `criticalRollExample` | `{key, roll, adjustedRoll}` for the first critical: `clamp(roll + criticalTotal, 1, 100)`. |

## Intended deviations (D2/D3)

These are tagged in `deviations` for each case:

- `action-points`: Python gives +25 for each AP above the base (4 in melee, 3 otherwise). Tactical clamps the penalty at 0.
- `pace-penalty`: Python passes the value through, with the footwork offset in melee only. Tactical computes pace for every attack type.
- `size-bonus`: Python applies `diff·5` only when `diff < 0`. Tactical uses the real difference (`size-db`) and adjusts the critical roll instead.
- `attack-type`: thrown is not a Python type, so it is fed in as ranged.
