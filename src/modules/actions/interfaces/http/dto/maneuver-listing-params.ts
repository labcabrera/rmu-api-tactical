import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { ManeuverListingChoices } from '../../../application/cqrs/queries/get-maneuver-modifiers.query.js';
import {
  type ComplementaryChoice,
  SIMILARITY_VALUES,
  type SimilarityValue,
  SKILL_RELATIONS,
  type SkillRelation,
} from '../../../domain/services/skill-aids.js';
import { MANEUVER_PURPOSES, type ManeuverPurpose } from '../../../domain/value-objects/maneuver-purpose.vo.js';

type Raw = Record<string, string | string[] | undefined>;

const ERROR = 'err-invalid-modifier';
const MAX_HELPERS = 10;

const single = (raw: Raw, name: string): string | undefined => {
  const value = raw[name];
  const text = Array.isArray(value) ? value[0] : value;
  return text === undefined || text === '' ? undefined : text;
};

const number = (raw: Raw, name: string): number | undefined => {
  const text = single(raw, name);
  if (text === undefined) return undefined;
  const value = Number(text);
  if (!Number.isFinite(value)) throw new ValidationError(`${name} is not a number`, ERROR);
  return value;
};

/**
 * Query parameters of `GET /actions/:id/maneuver/modifiers` that workspace spec 079 adds: the purpose, a similar skill,
 * the helpers (`actorId:skillId:specialization`, repeated or comma separated) and the load of a feat of strength.
 */
export class ManeuverListingParams {
  static parse(raw: Raw): ManeuverListingChoices {
    const choices: ManeuverListingChoices = {};
    const purpose = single(raw, 'purpose');
    if (purpose) {
      if (!(MANEUVER_PURPOSES as string[]).includes(purpose)) throw new ValidationError(`Unknown purpose ${purpose}`, ERROR);
      choices.purpose = purpose as ManeuverPurpose;
    }
    const similarTo = single(raw, 'similarTo');
    if (similarTo) {
      const similarity = number(raw, 'similarity') ?? 0;
      if (!(SIMILARITY_VALUES as readonly number[]).includes(similarity))
        throw new ValidationError('The similarity is 0, -25 or -50', ERROR);
      const relation = single(raw, 'relation');
      if (relation && !(SKILL_RELATIONS as string[]).includes(relation)) throw new ValidationError(`Unknown relation ${relation}`, ERROR);
      const targetSpecialization = single(raw, 'similarSpecialization');
      choices.similarity = {
        targetSkillId: similarTo,
        similarity: similarity as SimilarityValue,
        ...(targetSpecialization ? { targetSpecialization } : {}),
        ...(relation ? { relation: relation as SkillRelation } : {}),
      };
    }
    const helpers = ([] as string[])
      .concat(raw.complementary ?? [])
      .flatMap(each => each.split(','))
      .filter(Boolean);
    if (helpers.length > MAX_HELPERS) throw new ValidationError(`At most ${MAX_HELPERS} helpers`, ERROR);
    if (helpers.length > 0) {
      choices.complementary = helpers.map((each): ComplementaryChoice => {
        const [actorId, skillId, specialization] = each.split(':');
        if (!skillId) throw new ValidationError(`A helper is actorId:skillId:specialization, not ${each}`, ERROR);
        return { ...(actorId ? { actorId } : {}), skillId, ...(specialization ? { specialization } : {}) };
      });
    }
    const loadWeight = number(raw, 'loadWeight');
    if (loadWeight !== undefined) {
      choices.featOfStrength = {
        loadWeight,
        mechanicalFactor: number(raw, 'mechanicalFactor'),
        bodyWeight: number(raw, 'bodyWeight'),
        strengthBonus: number(raw, 'strengthBonus'),
      };
    }
    return choices;
  }
}
