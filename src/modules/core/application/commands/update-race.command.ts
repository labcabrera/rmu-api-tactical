import { RaceResistances, RaceStatBonus, SexBasedAttribute } from '../../domain/entities/race';
import { AuthenticatedCommand } from './authenticated-command';

export class UpdateRaceCommand extends AuthenticatedCommand {
  constructor(
    public readonly id: string,
    public readonly name: string | undefined,
    public readonly realm: string | undefined,
    public readonly size: string | undefined,
    public readonly defaultStatBonus: RaceStatBonus | undefined,
    public readonly resistances: RaceResistances | undefined,
    public readonly averageHeight: SexBasedAttribute | undefined,
    public readonly averageWeight: SexBasedAttribute | undefined,
    public readonly strideBonus: number | undefined,
    public readonly enduranceBonus: number | undefined,
    public readonly recoveryMultiplier: number | undefined,
    public readonly baseHits: number | undefined,
    public readonly bonusDevPoints: number | undefined,
    public readonly description: string | undefined,
    userId: string,
    roles: string[] | undefined,
  ) {
    super(userId, roles);
  }
}
