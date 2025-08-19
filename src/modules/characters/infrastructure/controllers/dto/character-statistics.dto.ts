import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { CharacterStatistics, Stat } from '../../../domain/entities/character.entity';

export class StatDto {
  potential: number | undefined;
  temporary: number | undefined;
  bonus: number | undefined;
  racial: number;
  custom: number;
  totalBonus: number;

  static fromEntity(stat: Stat): StatDto {
    const dto = new StatDto();
    dto.potential = stat.potential;
    dto.temporary = stat.temporary;
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

export class StatCreationDto {
  @ApiProperty({ description: 'Potential stat value', example: 90 })
  @IsNumber()
  @IsOptional()
  potential: number | undefined;

  @ApiProperty({ description: 'Temporary stat value', example: 90 })
  @IsNumber()
  @IsOptional()
  temporary: number | undefined;

  @ApiProperty({ description: 'Custom stat bonus', example: 90 })
  @IsNumber()
  @IsOptional()
  custom: number | undefined;

  toEntity(): Stat {
    return {
      potential: this.potential,
      temporary: this.temporary,
      bonus: 0,
      racial: 0,
      custom: this.custom || 0,
      totalBonus: 0,
    };
  }
}

export class CharacterStatisticsCreationDto {
  @ApiProperty({ description: 'Agility', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  ag: StatCreationDto;

  @ApiProperty({ description: 'Constitution', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  co: StatCreationDto;

  @ApiProperty({ description: 'Empathy', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  em: StatCreationDto;

  @ApiProperty({ description: 'Intelligence', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  in: StatCreationDto;

  @ApiProperty({ description: 'Memory', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  me: StatCreationDto;

  @ApiProperty({ description: 'Presence', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  pr: StatCreationDto;

  @ApiProperty({ description: 'Quickness', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  qu: StatCreationDto;

  @ApiProperty({ description: 'Reasoning', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  re: StatCreationDto;

  @ApiProperty({ description: 'Self discipline', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  sd: StatCreationDto;

  @ApiProperty({ description: 'Strength', type: StatCreationDto })
  @ValidateNested()
  @Type(() => StatCreationDto)
  @IsObject()
  @IsOptional()
  st: StatCreationDto;

  toEntity(): CharacterStatistics {
    const defaultStat = { potential: undefined, temporary: undefined, bonus: 0, racial: 0, custom: 0, totalBonus: 0 };
    return {
      ag: this.ag ? this.ag.toEntity() : defaultStat,
      co: this.co ? this.co.toEntity() : defaultStat,
      em: this.em ? this.em.toEntity() : defaultStat,
      in: this.in ? this.in.toEntity() : defaultStat,
      me: this.me ? this.me.toEntity() : defaultStat,
      pr: this.pr ? this.pr.toEntity() : defaultStat,
      qu: this.qu ? this.qu.toEntity() : defaultStat,
      re: this.re ? this.re.toEntity() : defaultStat,
      sd: this.sd ? this.sd.toEntity() : defaultStat,
      st: this.st ? this.st.toEntity() : defaultStat,
    };
  }
}
