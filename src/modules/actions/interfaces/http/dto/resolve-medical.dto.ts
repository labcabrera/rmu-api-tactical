import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

/** Rolls of a round of a `medical` action the declaration did not send (workspace spec 068). */
export class ResolveMedicalDto {
  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Medicine roll; the server rolls when no roll is known' })
  @IsOptional()
  @IsInt()
  roll?: number | null;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Unmodified roll (66 is an unusual event)' })
  @IsOptional()
  @IsInt()
  unmodifiedRoll?: number | null;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Cauterize: total of the heat hits dice' })
  @IsOptional()
  @IsInt()
  heatHitsRoll?: number | null;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Cauterize: roll of the heat critical (1-100)' })
  @IsOptional()
  @IsInt()
  heatCriticalRoll?: number | null;

  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Herbalism roll of the herb that helps' })
  @IsOptional()
  @IsInt()
  herbalismRoll?: number | null;
}

/** Workspace spec 068: the hits of the dose of a `use_item` action. */
export class ResolveUseItemDto {
  @ApiProperty({ type: Number, nullable: true, required: false, description: 'Hits healed; rolled in the range of the item when missing' })
  @IsOptional()
  @IsInt()
  roll?: number | null;
}
