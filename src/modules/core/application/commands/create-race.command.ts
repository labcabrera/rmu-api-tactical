import { RaceResistances, RaceStatBonus, SexBasedAttribute } from '../../domain/entities/race';
import { AuthenticatedCommand } from './authenticated-command';

export class CreateRaceCommand extends AuthenticatedCommand {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly realm: string,
    public readonly size: string,
    public readonly defaultStatBonus: RaceStatBonus,
    public readonly resistances: RaceResistances,
    public readonly averageHeight: SexBasedAttribute,
    public readonly averageWeight: SexBasedAttribute,
    public readonly strideBonus: number,
    public readonly enduranceBonus: number,
    public readonly recoveryMultiplier: number,
    public readonly baseHits: number,
    public readonly bonusDevPoints: number,
    public readonly description: string | undefined,
    userId: string,
    roles?: string[],
  ) {
    super(userId, roles);
  }
}
