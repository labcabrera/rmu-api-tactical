import { BodyLocation, INJURY_TYPES, InjuryType } from '../value-objects/injury.vo';

/**
 * Default injury type of a critical when its data has none (spec 013, §2.3), by the critical table code used by the
 * attack tables (ch. 11): S Slash, H Heat, O Cold, L Electricity, acid and steam cut or burn; K Krush, I Impact,
 * U Unbalance and T Strikes hit the bone; P Puncture an organ or a muscle; G Grapple and W Sweeps a muscle or tendon;
 * subdual the skin and tissue. The same defaults as the inference script of the critical data. Holy and the rest are
 * unknown.
 */
const TYPE_BY_CRITICAL: Record<string, InjuryType> = {
  s: 'cut-burn',
  k: 'bone',
  u: 'bone',
  h: 'cut-burn',
  o: 'cut-burn',
  l: 'cut-burn',
  acid: 'cut-burn',
  steam: 'cut-burn',
  i: 'bone',
  t: 'bone',
  g: 'muscle-tendon',
  w: 'muscle-tendon',
  subdual: 'skin-tissue',
};

/** Puncture: an organ in the torso, a muscle or tendon elsewhere. */
const PUNCTURE = 'p';
const TORSO: BodyLocation[] = ['chest', 'abdomen'];

export class InjuryTypeResolver {
  /** The type of the critical data when it is a known one, else the default of its table. */
  static resolve(criticalType: string | undefined, location: BodyLocation | undefined, dataType?: string | null): InjuryType {
    const fromData = INJURY_TYPES.find(type => type === dataType);
    if (fromData) {
      return fromData;
    }
    return InjuryTypeResolver.infer(criticalType, location);
  }

  static infer(criticalType: string | undefined, location: BodyLocation | undefined): InjuryType {
    const code = (criticalType || '').trim().toLowerCase();
    if (code === PUNCTURE) {
      return location && TORSO.includes(location) ? 'organ' : 'muscle-tendon';
    }
    return TYPE_BY_CRITICAL[code] ?? 'unknown';
  }

  /** Known injury types of a list (the `secondary` ones of the critical data). */
  static known(types: (string | null | undefined)[] | undefined): InjuryType[] {
    return (types || []).map(type => INJURY_TYPES.find(known => known === type)).filter((type): type is InjuryType => !!type);
  }
}
