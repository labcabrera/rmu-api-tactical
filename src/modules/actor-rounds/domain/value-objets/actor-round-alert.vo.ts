import { randomUUID } from 'crypto';
import { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo';
import { ActorRoundAlertModifier } from './actor-round-alert-modifier.vo';
import type { ActorRoundAlertStatus } from './actor-round-alert-status.vo';
import { ActorRoundAlertType } from './actor-round-alert-type.vo';

export class ActorRoundAlert {
  constructor(
    public readonly id: string,
    public type: ActorRoundAlertType,
    public readonly message: string,
    public readonly modifiers: ActorRoundAlertModifier[] | null,
    public status: ActorRoundAlertStatus = 'pending',
  ) {}

  static buildEndurance(message?: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'endurance', message || `Endurance roll required`, null);
  }

  static buildBreakageFromAttack(attackName: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'breakage', `Breakage roll from attack`, [
      new ActorRoundAlertModifier('attackName', null, attackName),
    ]);
  }

  static buildBreakageFromCritical(location: AttackLocation): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'breakage', `Breakage roll from attack`, [
      new ActorRoundAlertModifier('attackName', null, location),
    ]);
  }

  static buildCritical(criticalType: string, criticalSeverity: string, message?: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'critical', message || `Critical ${criticalSeverity} on ${criticalType}`, [
      new ActorRoundAlertModifier('criticalType', null, criticalType),
      new ActorRoundAlertModifier('criticalSeverity', null, criticalSeverity),
    ]);
  }
}
