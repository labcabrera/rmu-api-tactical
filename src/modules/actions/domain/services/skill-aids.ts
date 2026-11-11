import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { KeyValueModifier } from '../value-objects/key-value-modifier.vo.js';

/**
 * Similar skills (Core Law ch. 3, Similar Skills, Table 3-0c; workspace spec 079, decision B1): the relation between
 * the skill rolled and the one the maneuver needs, read from their categories, and how similar the game master rules
 * them. A similar skill only gives its bonus: never its ranks.
 */
export type SkillRelation = 'same-skill' | 'same-category' | 'other-category';

export const SKILL_RELATION_PENALTIES: Record<SkillRelation, number> = {
  'same-skill': -25,
  'same-category': -50,
  'other-category': -75,
};

export const SKILL_RELATIONS = Object.keys(SKILL_RELATION_PENALTIES) as SkillRelation[];

/** Very similar (0), similar (-25), slightly similar (-50). */
export const SIMILARITY_VALUES = [0, -25, -50] as const;
export type SimilarityValue = (typeof SIMILARITY_VALUES)[number];

export const SIMILAR_SKILL_RULE = 'Table 3-0c';
export const COMPLEMENTARY_SKILL_RULE = 'Ch. 3, Complementary Skills';

/** The similar skill the actor rolls in place of `targetSkillId`. */
export interface SimilarityChoice {
  targetSkillId: string;
  targetSpecialization?: string | null;
  similarity: SimilarityValue;
  /** The game master's relation, when it is not the one of the categories. */
  relation?: SkillRelation;
}

/** One helper of a complementary skill: the actor (none: the one who rolls) and its skill. */
export interface ComplementaryChoice {
  actorId?: string;
  skillId: string;
  specialization?: string | null;
}

/** A helper with the ranks the API read. */
export interface ComplementaryHelper extends ComplementaryChoice {
  actorName?: string;
  ranks: number;
}

/** A skill and its category, as core's catalog gives them. */
export interface SkillOfCategory {
  skillId: string;
  specialization?: string | null;
  categoryId?: string | null;
}

/**
 * Relation of the skill rolled to the one needed (Table 3-0c): the same skill with another specialization, a skill of
 * the same category, or of another one. Rolling the very skill needed is no similar skill (`err-skill-aid-invalid`).
 */
export const skillRelation = (rolled: SkillOfCategory, target: SkillOfCategory): SkillRelation => {
  if (rolled.skillId === target.skillId) {
    if ((rolled.specialization ?? null) === (target.specialization ?? null)) {
      throw new ValidationError('The similar skill is the skill itself', 'err-skill-aid-invalid', { reason: 'same-skill' });
    }
    return 'same-skill';
  }
  return !!rolled.categoryId && rolled.categoryId === target.categoryId ? 'same-category' : 'other-category';
};

/** The two lines of a similar skill: its relation and its similarity (the second one only when not 0). */
export const similarityModifiers = (choice: SimilarityChoice, relation: SkillRelation, derived: SkillRelation): KeyValueModifier[] => {
  if (!(SIMILARITY_VALUES as readonly number[]).includes(choice.similarity)) {
    throw new ValidationError('The similarity is 0, -25 or -50', 'err-skill-aid-invalid', { reason: 'similarity' });
  }
  const params = {
    targetSkill: choice.targetSkillId,
    relation,
    ...(choice.targetSpecialization ? { targetSpecialization: choice.targetSpecialization } : {}),
    ...(relation !== derived ? { overridden: true } : {}),
  };
  const modifiers = [
    new KeyValueModifier(
      'similar-skill-relation',
      SKILL_RELATION_PENALTIES[relation],
      'skill',
      'similar-skill',
      SIMILAR_SKILL_RULE,
      params,
    ),
  ];
  if (choice.similarity !== 0) {
    modifiers.push(
      new KeyValueModifier('similar-skill-similarity', choice.similarity, 'skill', 'similar-skill', SIMILAR_SKILL_RULE, {
        targetSkill: choice.targetSkillId,
        similarity: choice.similarity,
      }),
    );
  }
  return modifiers;
};

/** Ranks the `index`-th helper adds (Complementary Skills): the first all of them, each next one half the one before. */
export const complementaryRanks = (ranks: number, index: number): number => Math.floor(Math.max(0, ranks) / 2 ** index);

/** One breakdown line per helper, with the ranks it adds. */
export const complementaryModifiers = (helpers: ComplementaryHelper[]): KeyValueModifier[] =>
  helpers.map(
    (helper, index) =>
      new KeyValueModifier(
        'complementary-skill',
        complementaryRanks(helper.ranks, index),
        'skill',
        'complementary-skill',
        COMPLEMENTARY_SKILL_RULE,
        {
          skill: helper.skillId,
          ranks: helper.ranks,
          position: index + 1,
          ...(helper.specialization ? { specialization: helper.specialization } : {}),
          ...(helper.actorName ? { actor: helper.actorName } : {}),
        },
      ),
  );
