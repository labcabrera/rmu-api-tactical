import { ValidationError } from '../../../../shared/domain/errors/errors';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo';
import { ManeuverModifierDefinition, ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo';

export const ERR_UNKNOWN_MODIFIER = 'err-maneuver-unknown-modifier';
export const ERR_INVALID_MODIFIER = 'err-maneuver-invalid-modifier';

/**
 * Values of the client's choices for the skill's catalog modifiers. The values always come from the catalog: the
 * client only sends the option, the flag or the number of units. Unset flags and zero values are left out.
 */
export const resolveSelections = (
  catalog: ManeuverModifierDefinition[],
  selections: Record<string, ManeuverModifierSelection> | undefined,
): KeyValueModifier[] => {
  if (!selections) {
    return [];
  }
  return Object.entries(selections)
    .map(([key, selection]) => {
      const definition = catalog.find(modifier => modifier.key === key);
      if (!definition) {
        throw new ValidationError(`Unknown maneuver modifier '${key}' for the skill`, ERR_UNKNOWN_MODIFIER);
      }
      return new KeyValueModifier(key, selectionValue(definition, selection));
    })
    .filter(modifier => modifier.value !== 0);
};

const selectionValue = (definition: ManeuverModifierDefinition, selection: ManeuverModifierSelection): number => {
  switch (definition.type) {
    case 'flag':
      if (typeof selection !== 'boolean') {
        throw invalid(definition, selection);
      }
      return selection ? (definition.value ?? 0) : 0;
    case 'choice': {
      const option = typeof selection === 'string' ? definition.options?.find(o => o.key === selection) : undefined;
      if (!option) {
        throw invalid(definition, selection);
      }
      return option.value;
    }
    case 'number': {
      if (typeof selection !== 'number' || !Number.isFinite(selection)) {
        throw invalid(definition, selection);
      }
      if (
        (definition.min !== undefined && definition.min !== null && selection < definition.min) ||
        (definition.max !== undefined && definition.max !== null && selection > definition.max)
      ) {
        throw invalid(definition, selection);
      }
      return selection * (definition.perUnit ?? 1);
    }
    default:
      throw invalid(definition, selection);
  }
};

const invalid = (definition: ManeuverModifierDefinition, selection: ManeuverModifierSelection): ValidationError =>
  new ValidationError(`Invalid value ${JSON.stringify(selection)} for the maneuver modifier '${definition.key}'`, ERR_INVALID_MODIFIER);
