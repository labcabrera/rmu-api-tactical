import {
  ANY_POISON,
  type AntidoteData,
  type InjuryPoison,
  type PoisonCondition,
  type PoisonData,
  type PoisonRr,
  type PoisonSeverity,
  type PoisonSeverityRow,
  type PoisonStage,
  type PoisonTimeRange,
  type PoisonValueRange,
  POISON_SEVERITIES,
  ROUNDS_PER_HOUR,
  ROUNDS_PER_UNIT,
} from '../value-objects/poison.vo.js';
import type { InjurySeverity } from '../value-objects/injury.vo.js';

export type Random = () => number;

/** What a step of a poisoning does to the victim. */
export interface PoisonStep {
  started: PoisonStage[];
  ended: PoisonStage[];
  /** Conditions that start now, with their rounds (undefined: no end). */
  conditions: Array<{ condition: PoisonCondition; rounds: number | undefined }>;
  hits: number;
}

const rollRange = (range: PoisonValueRange, random: Random): number => {
  const min = Math.min(range.min, range.max);
  const max = Math.max(range.min, range.max);
  return min + Math.floor(random() * (max - min + 1));
};

const rollRounds = (range: PoisonTimeRange, random: Random): number => rollRange(range, random) * ROUNDS_PER_UNIT[range.unit];

const severityIndex = (severity: PoisonSeverity): number => POISON_SEVERITIES.indexOf(severity);

/**
 * Stages of a poisoning (workspace spec 042, decisions 5-7): one per severity of Table 15-6a, from the mildest to the
 * one the RR reached (capped by the poison's maximum). Each start is rolled in its own range from the exposure and is
 * never earlier than the previous one; the poison's onset replaces the one of the mild stage. Penalties, hits and
 * durations are rolled here and kept.
 */
export class PoisonStages {
  /** Severity a failed RR reaches, capped by the poison's maximum. */
  static severityOf(rrSeverity: PoisonSeverity, poison: PoisonData): PoisonSeverity {
    const max = poison.maxSeverity;
    return max && severityIndex(max) < severityIndex(rrSeverity) ? max : rrSeverity;
  }

  static build(poison: PoisonData, severity: PoisonSeverity, rows: PoisonSeverityRow[], random: Random = Math.random): PoisonStage[] {
    const stages: PoisonStage[] = [];
    let previousStart = 0;
    POISON_SEVERITIES.slice(0, severityIndex(severity) + 1).forEach(each => {
      const row = rows.find(candidate => candidate.category === poison.category && candidate.severity === each);
      if (!row) return;
      const onset = each === 'mild' && poison.onsetRounds ? rollRange(poison.onsetRounds, random) : rollRounds(row.start, random);
      const startsAt = Math.max(onset, previousStart);
      previousStart = startsAt;
      const conditionAt = row.condition ? startsAt + (row.conditionDelay ? rollRounds(row.conditionDelay, random) : 0) : null;
      stages.push({
        severity: each,
        startsAt,
        endsAt: row.duration ? startsAt + rollRounds(row.duration, random) : null,
        penalty: row.penalty ? -Math.abs(rollRange(row.penalty, random)) : 0,
        hitsPerRound: row.hitsPerRound ? Math.abs(rollRange(row.hitsPerRound, random)) : 0,
        hitsUntil: row.hitsRounds ? startsAt + rollRange(row.hitsRounds, random) : null,
        condition: row.condition,
        conditionAt,
        conditionUntil: conditionAt !== null && row.conditionDuration ? conditionAt + rollRounds(row.conditionDuration, random) : null,
        permanent: row.permanent,
        started: false,
        ended: false,
      });
    });
    return stages;
  }

  /** A new poisoning: its stages are not started until the first step (round 0 starts the immediate ones). */
  static poisoning(
    poison: PoisonData,
    rr: PoisonRr,
    severity: PoisonSeverity,
    rows: PoisonSeverityRow[],
    exposedAt: string,
    random: Random = Math.random,
  ): InjuryPoison {
    const result: InjuryPoison = {
      name: poison.name,
      category: poison.category,
      level: poison.level,
      rr,
      severity,
      stages: PoisonStages.build(poison, severity, rows, random),
      elapsedRounds: 0,
      exposedAt,
    };
    if (poison.itemTypeId) result.itemTypeId = poison.itemTypeId;
    if (poison.form) result.form = poison.form;
    return result;
  }

  /**
   * Moves the poisoning to `elapsed` rounds from the exposure: stages start and end, conditions start, and the hits of
   * the round `elapsed` (only one round: strategic, which advances by hours, leaves the hits out). `hitsStop` drops the
   * hits that last until the victim falls unconscious.
   */
  static step(poison: InjuryPoison, elapsed: number, hitsStop = false): PoisonStep {
    const step: PoisonStep = { started: [], ended: [], conditions: [], hits: 0 };
    if (poison.finished) return step;
    poison.elapsedRounds = Math.max(poison.elapsedRounds, elapsed);
    poison.stages.forEach(stage => {
      if (!stage.started && elapsed >= stage.startsAt) {
        stage.started = true;
        step.started.push(stage);
      }
      if (!stage.started || stage.ended) return;
      if (stage.condition && !stage.conditionApplied && stage.conditionAt !== null && elapsed >= stage.conditionAt) {
        stage.conditionApplied = true;
        const rounds = stage.conditionUntil !== null ? Math.max(1, stage.conditionUntil - elapsed) : undefined;
        const ongoing = stage.conditionUntil === null || stage.conditionUntil > elapsed;
        if (ongoing) step.conditions.push({ condition: stage.condition, rounds });
      }
      if (stage.hitsPerRound > 0 && (stage.hitsUntil === null ? !hitsStop : elapsed <= stage.hitsUntil)) {
        step.hits += stage.hitsPerRound;
      }
      if (stage.endsAt !== null && elapsed >= stage.endsAt) {
        stage.ended = true;
        step.ended.push(stage);
      }
    });
    if (poison.stages.every(stage => stage.ended)) {
      poison.finished = true;
    }
    return step;
  }

  /** Penalty of the poisoning: the stages started and not ended, and the permanent ones. */
  static penalty(poison: InjuryPoison): number {
    return poison.stages
      .filter(stage => stage.started && (!stage.ended || stage.permanent))
      .reduce((sum, stage) => sum + Math.min(0, stage.penalty), 0);
  }

  /** Penalty that stays when the poisoning is over. */
  static permanentPenalty(poison: InjuryPoison): number {
    return poison.stages.filter(stage => stage.started && stage.permanent).reduce((sum, stage) => sum + Math.min(0, stage.penalty), 0);
  }

  /** Hits of a range, such as the immediate ones of a poison. */
  static rollHits(range: PoisonValueRange, random: Random = Math.random): number {
    return Math.max(0, rollRange(range, random));
  }

  /** Injury severity of a poison severity. */
  static injurySeverity(severity: PoisonSeverity): InjurySeverity {
    if (severity === 'mild') return 'light';
    return severity === 'moderate' ? 'medium' : 'severe';
  }

  /**
   * Decision 10: the antidote neutralizes when its category matches (or is `any`, or it is magic without one), its
   * level is not lower than the poison's, and it is given in time.
   */
  static neutralizes(antidote: AntidoteData, poison: InjuryPoison): boolean {
    if (poison.finished) return false;
    const categories = antidote.categories ?? [];
    const category =
      categories.length === 0 ? antidote.source === 'magic' : categories.some(c => c === ANY_POISON || c === poison.category);
    const level = antidote.level === undefined || antidote.level === null || antidote.level >= poison.level;
    const inTime =
      antidote.withinHours === undefined || antidote.withinHours === null || poison.elapsedRounds <= antidote.withinHours * ROUNDS_PER_HOUR;
    return category && level && inTime;
  }

  /** Stages not started are cancelled and the started ones end (the permanent ones keep their penalty). */
  static neutralize(poison: InjuryPoison): void {
    poison.stages = poison.stages.filter(stage => stage.started);
    poison.stages.forEach(stage => (stage.ended = true));
    poison.neutralized = true;
    poison.finished = true;
  }
}
