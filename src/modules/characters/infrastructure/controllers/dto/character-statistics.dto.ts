import { CharacterStatistics, Stat } from '../../../domain/entities/character.entity';

export class StatDto {
  bonus: number | undefined;
  racial: number;
  custom: number;
  totalBonus: number;

  static fromEntity(stat: Stat): StatDto {
    console.log('StatDto.fromEntity', stat);
    const dto = new StatDto();
    dto.bonus = stat.bonus || 0;
    dto.racial = stat.racial;
    dto.custom = stat.custom;
    dto.totalBonus = stat.totalBonus;
    return dto;
  }
}

export class CharacterStatisticsDto {
  ag: StatDto;
  co: StatDto;
  em: StatDto;
  in: StatDto;
  me: StatDto;
  pr: StatDto;
  qu: StatDto;
  re: StatDto;
  sd: StatDto;
  st: StatDto;

  static fromEntity(statistics: CharacterStatistics): CharacterStatisticsDto {
    console.log('CharacterStatisticsDto.fromEntity', statistics);

    const dto = new CharacterStatisticsDto();
    dto.ag = StatDto.fromEntity(statistics.ag);
    dto.co = StatDto.fromEntity(statistics.co);
    dto.em = StatDto.fromEntity(statistics.em);
    dto.in = StatDto.fromEntity(statistics.in);
    dto.me = StatDto.fromEntity(statistics.me);
    dto.pr = StatDto.fromEntity(statistics.pr);
    dto.qu = StatDto.fromEntity(statistics.qu);
    dto.re = StatDto.fromEntity(statistics.re);
    dto.sd = StatDto.fromEntity(statistics.sd);
    dto.st = StatDto.fromEntity(statistics.st);
    return dto;
  }
}
