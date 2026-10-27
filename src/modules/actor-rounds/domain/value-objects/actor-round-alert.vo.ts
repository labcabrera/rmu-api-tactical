import { randomUUID } from 'crypto';
import type { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo.js';
import { ActorRoundAlertModifier } from './actor-round-alert-modifier.vo.js';
import type { ActorRoundAlertStatus } from './actor-round-alert-status.vo.js';
import type { ActorRoundAlertType } from './actor-round-alert-type.vo.js';

/** The fields of a stored alert. */
export type ActorRoundAlertData = Pick<ActorRoundAlert, 'id' | 'type' | 'message' | 'modifiers' | 'status'>;

/** What asks for a breakage check (spec 019, decision 6). */
export type BreakageOrigin = 'attack-roll' | 'critical' | 'fumble';

export class ActorRoundAlert {
  constructor(
    public readonly id: string,
    public type: ActorRoundAlertType,
    public readonly message: string,
    public readonly modifiers: ActorRoundAlertModifier[] | null,
    public status: ActorRoundAlertStatus = 'pending',
  ) {}

  /** An alert read from storage or built by hand, as an instance. */
  static from(stored: ActorRoundAlert | ActorRoundAlertData): ActorRoundAlert {
    if (stored instanceof ActorRoundAlert) {
      return stored;
    }
    const alert = stored;
    const modifiers = alert.modifiers
      ? alert.modifiers.map(modifier => new ActorRoundAlertModifier(modifier.key, modifier.value ?? null, modifier.modifier ?? null))
      : null;
    return new ActorRoundAlert(alert.id, alert.type, alert.message, modifiers, alert.status ?? 'pending');
  }

  static buildEndurance(message?: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'endurance', message || `Endurance roll required`, null);
  }

  /**
   * A breakage check to make (spec 019, decision 6): its origin, the penalty of the critical or fumble, the location
   * hit, the item to check by default and the ones the game master can choose.
   */
  static buildBreakage(
    origin: BreakageOrigin,
    props: { attackName?: string; location?: AttackLocation; penalty?: number; itemId?: string; candidates: string[] },
  ): ActorRoundAlert {
    const modifiers = [new ActorRoundAlertModifier('origin', null, origin)];
    if (props.attackName) modifiers.push(new ActorRoundAlertModifier('attackName', null, props.attackName));
    if (props.location) modifiers.push(new ActorRoundAlertModifier('location', null, props.location));
    if (props.penalty) modifiers.push(new ActorRoundAlertModifier('penalty', props.penalty, null));
    if (props.itemId) modifiers.push(new ActorRoundAlertModifier('itemId', null, props.itemId));
    props.candidates.forEach(candidate => modifiers.push(new ActorRoundAlertModifier('candidate', null, candidate)));
    return new ActorRoundAlert(randomUUID(), 'breakage', `Breakage roll from ${origin}`, modifiers);
  }

  /** Workspace spec 040: the physical RR an actor dying in frenzy makes in the upkeep. */
  static buildFrenzyDying(): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'frenzy-dying', 'Physical resistance roll of a frenzy-dying actor', [
      new ActorRoundAlertModifier('resistance', null, 'physical'),
      new ActorRoundAlertModifier('attackLevel', 0, null),
    ]);
  }

  getModifierValue(key: string): number | undefined {
    return this.modifiers?.find(modifier => modifier.key === key)?.value ?? undefined;
  }

  /** The check is made: the item checked, its result and its total stay in the alert. */
  resolveBreakage(itemId: string, result: string, total: number): void {
    this.modifiers?.push(
      new ActorRoundAlertModifier('checkedItemId', null, itemId),
      new ActorRoundAlertModifier('result', null, result),
      new ActorRoundAlertModifier('total', total, null),
    );
    this.status = 'resolved';
  }

  /** A fumble that gives the fumbler a critical (spec 034): the game master rolls it, of the type the text says. */
  static buildFumbleCritical(criticalSeverity: string, attackName?: string): ActorRoundAlert {
    const modifiers = [
      new ActorRoundAlertModifier('origin', null, 'fumble'),
      new ActorRoundAlertModifier('criticalSeverity', null, criticalSeverity),
    ];
    if (attackName) modifiers.push(new ActorRoundAlertModifier('attackName', null, attackName));
    return new ActorRoundAlert(randomUUID(), 'critical', `Critical ${criticalSeverity} from a fumble`, modifiers);
  }

  static buildCritical(criticalType: string, criticalSeverity: string, message?: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'critical', message || `Critical ${criticalSeverity} on ${criticalType}`, [
      new ActorRoundAlertModifier('criticalType', null, criticalType),
      new ActorRoundAlertModifier('criticalSeverity', null, criticalSeverity),
    ]);
  }
}
