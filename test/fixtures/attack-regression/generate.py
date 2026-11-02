"""
Generate regression fixtures for the TypeScript attack calculator in rmu-api-tactical
from the Python calculator in rmu-api-attack (the parity baseline, spec 003 D2).

It imports the Python domain directly (no HTTP, no Mongo):

- app/domain/entities/attack.py            Attack.set_roll / Attack.append_all_modifiers
- app/domain/services/attack_calculator.py AttackCalculator.calculate_attack
- app/application/use_cases/update_critical_roll_use_case.py (critical roll adjustment)

The attack-table port is replaced by FakeAttackTable (rule below). Its inputs and
outputs are recorded in every case, so the TS test can feed the same values to
its mocked table port.

Run (from anywhere; nothing in rmu-api-attack is modified, the venv is used as is):

    uv run --project ../../../../rmu-api-attack --no-sync python generate.py

or with the absolute path of rmu-api-attack. Writes cases.json next to this file.

FAKE ATTACK TABLE RULE (deterministic, shared with the TS test)
---------------------------------------------------------------
Input: the raw roll total the calculator passes to the port, and the AT.

    tableRoll = min(175, max(rawTotal, 1))   # same clamp as the Python REST adapter
    atUsed    = at if at is not None else 1  # Python can pass at=None (see notes)
    damage    = max(0, tableRoll - 60 - atUsed) // 4
    score     = tableRoll - atUsed
    severity  = None if score < 80, else the band of 10 starting at 80:
                80 A, 90 B, 100 C, 110 D, 120 E, 130 F, 140 G, 150 H, 160 I, >=170 J
    type      = None when severity is None, else "P" if atUsed is even else "S"
    text      = "fake-<tableRoll>-<atUsed>"

The critical table fake returns {text: "fake-critical", damage: 0}; only the
adjusted roll the use case computes is recorded.
"""

import asyncio
import copy
import json
import os
import sys
from pathlib import Path

# Do not leave __pycache__ folders inside rmu-api-attack.
sys.dont_write_bytecode = True

HERE = Path(__file__).resolve().parent
ATTACK_PROJECT = Path(
    os.environ.get("RMU_API_ATTACK_DIR", HERE.parents[3] / "rmu-api-attack")
).resolve()
sys.path.insert(0, str(ATTACK_PROJECT))

from app.application.commands import UpdateCriticalRollCommand  # noqa: E402
from app.application.ports import AttackTableClient  # noqa: E402
from app.application.use_cases.update_critical_roll_use_case import (  # noqa: E402
    UpdateCriticalRollUseCase,
)
from app.domain.entities import (  # noqa: E402
    Attack,
    AttackArmor,
    AttackModifiers,
    AttackRollModifiers,
    AttackSituationalModifiers,
    AttackSkill,
    AttackTableEntry,
    CriticalTableEntry,
    FumbleTableEntry,
)
from app.domain.entities.enums import (  # noqa: E402
    AttackStatus,
    AttackType,
    Cover,
    DodgeType,
    PositionalSource,
    PositionalTarget,
    RestrictedQuarters,
)
from app.domain.services.attack_calculator import AttackCalculator  # noqa: E402
from app.domain.services.attack_size_service import AttackSizeService  # noqa: E402

SEVERITY_BANDS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]


def fake_table_entry(raw_total: int, at):
    table_roll = min(175, max(raw_total, 1))
    at_used = at if at is not None else 1
    damage = max(0, table_roll - 60 - at_used) // 4
    score = table_roll - at_used
    severity = None
    if score >= 80:
        severity = SEVERITY_BANDS[min((score - 80) // 10, len(SEVERITY_BANDS) - 1)]
    crit_type = None if severity is None else ("P" if at_used % 2 == 0 else "S")
    return table_roll, {
        "text": f"fake-{table_roll}-{at_used}",
        "damage": damage,
        "criticalType": crit_type,
        "criticalSeverity": severity,
    }


class FakeAttackTable(AttackTableClient):
    def __init__(self):
        self.calls = []
        self.critical_calls = []

    async def get_attack_table_entry(self, attack_table, size, roll, at):
        table_roll, entry = fake_table_entry(roll, at)
        self.calls.append(
            {
                "call": {"attackTable": attack_table, "size": size, "roll": roll, "at": at},
                "tableRoll": table_roll,
                "entry": entry,
            }
        )
        return AttackTableEntry(
            text=entry["text"],
            damage=entry["damage"],
            critical_type=entry["criticalType"],
            critical_severity=entry["criticalSeverity"],
        )

    async def get_critical_table_entry(self, critical_type, critical_severity, roll):
        self.critical_calls.append(
            {"criticalType": critical_type, "criticalSeverity": critical_severity, "roll": roll}
        )
        return CriticalTableEntry(text="fake-critical", damage=0)

    async def get_fumble_table_entry(self, *args, **kwargs):
        return FumbleTableEntry(text="fake-fumble")


class InMemoryRepo:
    def __init__(self, attack):
        self.attack = attack

    async def find_by_id(self, _id):
        return self.attack

    async def update(self, attack):
        return attack


# ---------------------------------------------------------------------------
# Neutral input (close to tactical) and its mapping to the Python domain
# ---------------------------------------------------------------------------

DEFAULT_INPUT = {
    "attackType": "melee",  # melee | ranged | thrown (Python has no thrown: mapped to ranged)
    "attackTable": "fake-table",
    "attackSize": 0,
    "fumble": 2,
    "bo": 80,
    "bd": 20,
    "shield": 0,
    "parry": 0,
    "actionPoints": 4,
    "rangePenalty": 0,
    "pacePenalty": 0,
    "injuryPenalty": 0,
    "fatiguePenalty": 0,
    "sourceStatuses": [],
    "targetStatuses": [],
    "cover": "none",
    "restrictedQuarters": "none",
    "positionalSource": "none",
    "positionalTarget": "none",
    "dodge": "none",
    "calledShot": "none",
    "calledShotPenalty": 0,
    "offHand": False,
    "twoHandedWeapon": False,
    "higherGround": False,
    "disabledDB": False,
    "disabledShield": False,
    "disabledParry": False,
    "sizeDifference": 0,
    "skills": [],
    "attackNumber": 1,
    "attackTargets": 1,
    "lethality": 0,
    "customBonus": 0,
    "armor": {"at": 5, "headAt": None, "bodyAt": None, "armsAt": None, "legsAt": None},
    "roll": 50,
    "location": None,
    "criticalRoll": 50,
}


def python_attack_type(attack_type: str) -> AttackType:
    return AttackType.MELEE if attack_type == "melee" else AttackType.RANGED


def to_python_attack(inp: dict) -> Attack:
    armor = inp["armor"]
    modifiers = AttackModifiers(
        attack_type=python_attack_type(inp["attackType"]),
        attack_table=inp["attackTable"],
        attack_size=inp["attackSize"],
        fumble_table="fake-fumble-table",
        armor=AttackArmor(
            at=armor["at"],
            head_at=armor["headAt"],
            body_at=armor["bodyAt"],
            arms_at=armor["armsAt"],
            legs_at=armor["legsAt"],
        ),
        action_points=inp["actionPoints"],
        fumble=inp["fumble"],
        called_shot=inp["calledShot"],
        roll_modifiers=AttackRollModifiers(
            bo=inp["bo"],
            injury_penalty=inp["injuryPenalty"],
            pace_penalty=inp["pacePenalty"],
            fatigue_penalty=inp["fatiguePenalty"],
            called_shot_penalty=inp["calledShotPenalty"],
            bd=inp["bd"],
            shield=inp["shield"],
            range_penalty=inp["rangePenalty"],
            parry=inp["parry"],
            attack_number=inp["attackNumber"],
            attack_targets=inp["attackTargets"],
            game_lethality=inp["lethality"],
            custom_bonus=inp["customBonus"],
        ),
        situational_modifiers=AttackSituationalModifiers(
            cover=Cover(inp["cover"]),
            restricted_quarters=RestrictedQuarters(inp["restrictedQuarters"]),
            positional_source=PositionalSource(inp["positionalSource"]),
            positional_target=PositionalTarget(inp["positionalTarget"]),
            dodge=DodgeType(inp["dodge"]),
            disabled_db=inp["disabledDB"],
            disabled_shield=inp["disabledShield"],
            disabled_parry=inp["disabledParry"],
            size_difference=inp["sizeDifference"],
            off_hand=inp["offHand"],
            two_handed_weapon=inp["twoHandedWeapon"],
            higher_ground=inp["higherGround"],
            source_status=list(inp["sourceStatuses"]),
            target_status=list(inp["targetStatuses"]),
        ),
        features=[],
        source_skills=[AttackSkill(skill_id=s["skillId"], bonus=s["bonus"]) for s in inp["skills"]],
    )
    return Attack(
        id="regression",
        game_id="game",
        action_id="action",
        source_id="source",
        target_id="target",
        status=AttackStatus.PENDING_ATTACK_ROLL,
        modifiers=modifiers,
    )


def entries(items):
    return [{"key": e.key, "value": e.value} for e in (items or [])]


async def run_case(case: dict) -> dict:
    inp = copy.deepcopy(DEFAULT_INPUT)
    for k, v in case["input"].items():
        if k == "armor":
            inp["armor"].update(v)
        else:
            inp[k] = v

    # Prepare phase (no roll): same calls as the create/parry use cases.
    table = FakeAttackTable()
    calculator = AttackCalculator(attack_table_client=table, attack_size_service=AttackSizeService())
    prepared = to_python_attack(inp)
    calculator.initialize_attack_calculations(prepared)
    calculator.calculate_attack_roll_modifiers(prepared)

    # Attack roll phase.
    attack = to_python_attack(inp)
    attack.set_roll(roll=inp["roll"], location=inp["location"])
    await calculator.calculate_attack(attack)

    calc = attack.calculated
    res = attack.results
    fumble = bool(attack.is_fumble())
    table_call = table.calls[0] if table.calls else None
    entry = res.attack_table_entry

    criticals = [
        {
            "key": c.key,
            "type": c.critical_type,
            "severity": c.critical_severity,
            "adjustment": calc.critical_total,
        }
        for c in (res.criticals or [])
    ]

    critical_roll_example = None
    if criticals:
        use_case = UpdateCriticalRollUseCase(InMemoryRepo(attack), calculator, table)
        key = criticals[0]["key"]
        await use_case.execute(UpdateCriticalRollCommand(attack_id="regression", critical_key=key, roll=inp["criticalRoll"]))
        critical_roll_example = {
            "key": key,
            "roll": inp["criticalRoll"],
            "adjustedRoll": attack.results.get_critical_by_key(key).adjusted_roll,
        }

    absolute_hit = next((e.value for e in calc.critical_modifiers if e.key == "absolute-hit"), 0)

    expected = {
        "prepareRollModifiers": entries(prepared.calculated.roll_modifiers),
        "prepareRollTotal": prepared.calculated.roll_total,
        "rollModifiers": entries(calc.roll_modifiers),
        "rollTotal": calc.roll_total,
        "status": attack.status.value,
        "fumble": fumble,
        "effectiveLocation": attack.roll.location,
        "effectiveAt": attack.roll.at,
        "tableCall": table_call["call"] if table_call else None,
        "tableRoll": table_call["tableRoll"] if table_call else None,
        "tableEntry": table_call["entry"] if table_call else None,
        "hitSizeMultiplier": calc.hit_size_multiplier,
        "criticalSizeModifier": calc.critical_size_modifier,
        "damageBase": entry.damage_base if entry else None,
        "damage": entry.damage if entry else None,
        "criticalType": entry.critical_type if entry else None,
        "criticalSeverityBase": entry.critical_severity_base if entry else None,
        "criticalSeverity": entry.critical_severity if entry else None,
        "criticalModifiers": entries(calc.critical_modifiers),
        "criticalTotal": calc.critical_total,
        "absoluteHit": absolute_hit,
        "criticalSeverityModifiers": entries(calc.critical_severity_modifiers),
        "criticalSeverityTotal": calc.critical_severity_total,
        "criticals": criticals,
        "criticalRollExample": critical_roll_example,
    }
    return {
        "id": case["id"],
        "description": case["description"],
        "input": inp,
        "pythonAttackType": python_attack_type(inp["attackType"]).value,
        "expected": expected,
        "pythonKeys": [e["key"] for e in expected["rollModifiers"]],
        "notes": case.get("notes", []),
        "deviations": case.get("deviations", []),
    }


# ---------------------------------------------------------------------------
# Cases
# ---------------------------------------------------------------------------

DEV_AP = {
    "decision": "D2",
    "key": "action-points",
    "note": "Python gives a positive bonus when AP exceed the base (4 melee / 3 ranged); tactical clamps the penalty at 0.",
}
DEV_SIZE = {
    "decision": "D2/D3",
    "key": "size-bonus",
    "note": "Python: size-bonus = diff*5 only when diff < 0, plus an unused critical-severity entry. Tactical uses the real size difference as size-db and adjusts the critical roll.",
}
DEV_PACE = {
    "decision": "D2",
    "key": "pace-penalty",
    "note": "Python passes the pace penalty through (footwork offset in melee only). Tactical computes pace -25/-50/-75 for every attack type, with footwork.",
}
DEV_THROWN = {
    "decision": "D2",
    "key": "attack-type",
    "note": "Python has no 'thrown' type (its DTO rejects it). The fixture feeds it as 'ranged'.",
}

CASES = [
    {
        "id": "melee-shield-parry",
        "description": "Melee against a target with shield and parry.",
        "input": {"bo": 90, "bd": 15, "shield": 20, "parry": 25, "roll": 70, "armor": {"at": 3}},
    },
    {
        "id": "melee-disabled-defenses",
        "description": "DB, shield and parry all disabled although they have values.",
        "input": {
            "bo": 60,
            "bd": 30,
            "shield": 20,
            "parry": 15,
            "disabledDB": True,
            "disabledShield": True,
            "disabledParry": True,
            "roll": 55,
            "armor": {"at": 4},
        },
    },
    {
        "id": "melee-two-ap-pace-footwork",
        "description": "Melee with 2 AP (-50) and a pace penalty partly offset by footwork.",
        "input": {
            "bo": 100,
            "bd": 10,
            "actionPoints": 2,
            "pacePenalty": -50,
            "skills": [{"skillId": "footwork", "bonus": 20}],
            "roll": 80,
        },
        "deviations": [DEV_PACE],
    },
    {
        "id": "ranged-two-ap-range-pace",
        "description": "Ranged attack with 2 AP (-25), range penalty and a pace penalty with footwork (no offset outside melee).",
        "input": {
            "attackType": "ranged",
            "bo": 70,
            "bd": 10,
            "actionPoints": 2,
            "rangePenalty": -15,
            "pacePenalty": -25,
            "skills": [{"skillId": "footwork", "bonus": 30}],
            "roll": 90,
        },
        "deviations": [DEV_PACE],
    },
    {
        "id": "ranged-four-ap-bonus",
        "description": "Ranged attack declared with 4 AP: Python yields +25 action points.",
        "input": {"attackType": "ranged", "bo": 60, "bd": 10, "actionPoints": 4, "roll": 60},
        "deviations": [DEV_AP],
    },
    {
        "id": "thrown-in-melee",
        "description": "Thrown attack while engaged in melee: range penalty and range-in-melee.",
        "input": {
            "attackType": "thrown",
            "bo": 75,
            "bd": 10,
            "actionPoints": 3,
            "rangePenalty": -10,
            "sourceStatuses": ["melee"],
            "roll": 85,
        },
        "deviations": [DEV_THROWN],
    },
    {
        "id": "rq-cramped-skill-capped",
        "description": "Cramped restricted quarters (-50); a skill of 80 is capped at 50.",
        "input": {
            "bo": 100,
            "restrictedQuarters": "cramped",
            "skills": [{"skillId": "restricted-quarters", "bonus": 80}],
            "roll": 60,
        },
    },
    {
        "id": "rq-confined-negative-skill",
        "description": "Confined restricted quarters (-100) with a negative skill bonus.",
        "input": {
            "bo": 150,
            "restrictedQuarters": "confined",
            "skills": [{"skillId": "restricted-quarters", "bonus": -15}],
            "roll": 90,
        },
        "notes": [
            "min(|penalty|, skill) with a negative skill returns the skill itself, so the offset adds a further -15."
        ],
    },
    {
        "id": "melee-positional-flank",
        "description": "Melee attacker moving to the flank (-30, reverse-strike 20) against a flanked target (+15).",
        "input": {
            "positionalSource": "to_flank",
            "positionalTarget": "flank",
            "skills": [{"skillId": "reverse-strike", "bonus": 20}],
            "roll": 70,
        },
    },
    {
        "id": "melee-positional-rear",
        "description": "Melee to the rear (-70, reverse-strike 100 capped at 70) against the target's rear (+35).",
        "input": {
            "bo": 90,
            "positionalSource": "to_rear",
            "positionalTarget": "rear",
            "skills": [{"skillId": "reverse-strike", "bonus": 100}],
            "roll": 88,
            "armor": {"at": 3},
        },
    },
    {
        "id": "ranged-positional-ignored-rq-tight",
        "description": "Positional source and target are melee only: ignored on a ranged attack. Tight restricted quarters (-75) without skill still applies.",
        "input": {
            "attackType": "ranged",
            "actionPoints": 3,
            "bo": 150,
            "restrictedQuarters": "tight",
            "positionalSource": "to_rear",
            "positionalTarget": "rear",
            "skills": [{"skillId": "reverse-strike", "bonus": 50}],
            "roll": 60,
        },
    },
    {
        "id": "melee-cover-soft-half-negative-lethality",
        "description": "Melee against soft half cover (-20); a negative lethality is dropped (only > 0 counts) and a custom bonus is added.",
        "input": {"cover": "soft_half", "lethality": -10, "customBonus": 15, "roll": 70},
    },
    {
        "id": "ranged-cover-hard-full-clamp-low",
        "description": "Ranged against hard full cover (-200): the total is negative and the table roll clamps to 1.",
        "input": {"attackType": "ranged", "actionPoints": 3, "cover": "hard_full", "bo": 50, "bd": 30, "roll": 40},
    },
    {
        "id": "melee-statuses",
        "description": "Melee: prone attacker, target stunned, surprised and prone.",
        "input": {
            "bo": 70,
            "sourceStatuses": ["prone"],
            "targetStatuses": ["stunned", "surprised", "prone"],
            "roll": 60,
            "armor": {"at": 6},
        },
        "notes": ["Python accepts stunned and surprised together; tactical drops stunned when surprised is set."],
    },
    {
        "id": "ranged-prone-target-hard-partial-cover",
        "description": "Ranged: prone attacker, prone target (-30 outside melee) and hard partial cover (-40).",
        "input": {
            "attackType": "ranged",
            "actionPoints": 3,
            "bo": 150,
            "cover": "hard_partial",
            "sourceStatuses": ["prone"],
            "targetStatuses": ["prone"],
            "roll": 80,
        },
    },
    {
        "id": "melee-off-hand-rq-close-engaged",
        "description": "Off-hand weapon without ambidexterity (-20), close restricted quarters (-25) with skill 10, and the 'melee' source status (no range-in-melee for melee).",
        "input": {
            "bo": 100,
            "offHand": True,
            "restrictedQuarters": "close",
            "skills": [{"skillId": "restricted-quarters", "bonus": 10}],
            "sourceStatuses": ["melee"],
            "roll": 70,
        },
    },
    {
        "id": "melee-off-hand-ambidextrous-two-handed",
        "description": "Off-hand with the ambidextrous status (+20) and the two-handed weapon flag (+10).",
        "input": {
            "offHand": True,
            "twoHandedWeapon": True,
            "sourceStatuses": ["ambidextrous"],
            "roll": 75,
        },
        "notes": [
            "Tactical always sends twoHandedWeapon=false and derives offHand from the attack name.",
            "Ambidexterity is read from the source statuses, not from a talent.",
        ],
    },
    {
        "id": "called-shot-head-default-penalty",
        "description": "Called shot to the head with no penalty given (defaults to -25) and called-shot skill 10; AT taken from headAt.",
        "input": {
            "bo": 100,
            "calledShot": "head",
            "calledShotPenalty": 0,
            "skills": [{"skillId": "called-shot", "bonus": 10}],
            "armor": {"at": None, "headAt": 2, "bodyAt": 8, "armsAt": 6, "legsAt": 6},
            "roll": 85,
        },
    },
    {
        "id": "called-shot-legs-global-at",
        "description": "Ranged called shot to the legs with -40 and skill 60 (capped at 40); a global AT wins over legsAt.",
        "input": {
            "attackType": "ranged",
            "actionPoints": 3,
            "bo": 90,
            "calledShot": "legs",
            "calledShotPenalty": -40,
            "skills": [{"skillId": "called-shot", "bonus": 60}],
            "armor": {"at": 7, "legsAt": 2},
            "roll": 90,
        },
    },
    {
        "id": "location-arms-at",
        "description": "No global AT: the hit location 'arms' selects armsAt.",
        "input": {
            "bo": 100,
            "armor": {"at": None, "headAt": 2, "bodyAt": 8, "armsAt": 4, "legsAt": 6},
            "location": "arms",
            "roll": 72,
        },
    },
    {
        "id": "location-chest-at-missing",
        "description": "No global AT and the tactical location 'chest': Python has no match and passes AT null.",
        "input": {
            "bo": 100,
            "armor": {"at": None, "headAt": 2, "bodyAt": 8, "armsAt": 4, "legsAt": 6},
            "location": "chest",
            "roll": 72,
        },
        "notes": [
            "Python matches body/head/arms/legs only; tactical locations are head/chest/abdomen/arms/legs. chest/abdomen give at=None (fake uses 1)."
        ],
    },
    {
        "id": "multiple-attacks-targets-skill",
        "description": "Two attacks on two targets with multiple-attacks 30: both penalties offset separately.",
        "input": {
            "bo": 150,
            "attackNumber": 2,
            "attackTargets": 2,
            "skills": [{"skillId": "multiple-attacks", "bonus": 30}],
            "roll": 75,
        },
        "notes": ["The same skill offsets attack-number and attack-targets, each capped on its own."],
    },
    {
        "id": "multiple-attacks-three-no-skill-size-positive",
        "description": "Three attacks on three targets, no skill (-100 and -40); size difference +1 adds no roll modifier, only the unused critical-severity entry; severity I splits into E, C and A.",
        "input": {
            "bo": 220,
            "bd": 10,
            "attackNumber": 3,
            "attackTargets": 3,
            "sizeDifference": 1,
            "roll": 95,
            "armor": {"at": 1},
        },
        "deviations": [DEV_SIZE],
    },
    {
        "id": "misc-bonuses-higher-ground",
        "description": "Higher ground (+10, with a higher-ground skill), lethality, custom bonus, injury and fatigue.",
        "input": {
            "higherGround": True,
            "skills": [{"skillId": "higher-ground", "bonus": 5}],
            "lethality": 10,
            "customBonus": -5,
            "injuryPenalty": -10,
            "fatiguePenalty": -5,
            "roll": 70,
        },
        "notes": [
            "The skill offset on a positive bonus adds min(10, skill) on top. 'higher-ground' is not in tactical's combat skill list, so tactical never sends it."
        ],
    },
    {
        "id": "size-difference-negative",
        "description": "Size difference -2: size-bonus -10 and a size-difference critical-severity entry.",
        "input": {"sizeDifference": -2, "bo": 100, "roll": 75},
        "deviations": [DEV_SIZE],
        "notes": ["criticalSeverityModifiers is computed but never used to change the severity."],
    },
    {
        "id": "absolute-hit-j-critical",
        "description": "Total above 175: absolute hit ceil((t-175)/5), table roll clamps to 175, J critical splits in three, critical roll clamps to 100.",
        "input": {"bo": 160, "bd": 5, "roll": 45, "armor": {"at": 1}, "criticalRoll": 98},
    },
    {
        "id": "attack-size-large-shift-to-f",
        "description": "Attack size +1: damage x1.5 (rounded up) and severity E shifts to F, split into E and A.",
        "input": {"attackSize": 1, "bo": 100, "bd": 10, "roll": 35, "armor": {"at": 3}},
    },
    {
        "id": "attack-size-small-shift-to-z",
        "description": "Attack size -1: damage x0.5 (rounded up) and severity A shifts down to Z.",
        "input": {"attackSize": -1, "bo": 68, "bd": 10, "roll": 33, "armor": {"at": 3}},
    },
    {
        "id": "fumble",
        "description": "Roll within the fumble range: fumble, no table lookup, despite a high OB.",
        "input": {"bo": 200, "fumble": 3, "roll": 3},
    },
    {
        "id": "no-fumble-just-above-range",
        "description": "Roll one above the fumble range: normal resolution with no critical.",
        "input": {"bo": 40, "bd": 30, "fumble": 3, "roll": 4},
    },
]


async def main():
    results = [await run_case(c) for c in CASES]
    out = HERE / "cases.json"
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(results)} cases to {out}")


if __name__ == "__main__":
    asyncio.run(main())
